// Low-level Google Mobile Ads wrapper — mirrors the pattern used in
// `lib/purchases.ts` so the app still boots in Expo Go (no native
// module) and on web. Every public helper degrades to a benign no-op
// when the native side isn't available; EAS dev + production builds
// pick up the real SDK automatically.
//
// All gameplay consumers should go through the helpers here
// (`initAds`, `showRewardedAd`, `showLaunchAd`, `<AdBanner/>`) rather
// than touching `react-native-google-mobile-ads` directly.

import Constants from "expo-constants";
import { Platform } from "react-native";

import { AD_UNIT_IDS } from "@/lib/adConfig";
import { logEvent } from "@/lib/analytics";

// Type-only imports — stripped at compile time, so they don't blow up
// on Expo Go at runtime. The matching dynamic require below feeds the
// real values in when native is available.
import type {
  InterstitialAd as InterstitialAdType,
  RewardedAd as RewardedAdType,
  AppOpenAd as AppOpenAdType,
  AdEventType as AdEventTypeEnum,
  RewardedAdEventType as RewardedAdEventTypeEnum,
} from "react-native-google-mobile-ads";

// Kill switch for the cold-start app-open ad. Turned OFF for launch
// so new users aren't hit with an ad before they've even seen the
// main menu — hurts D1 retention hard. Flip to `true` once we have a
// stable user base whose retention curve we can measure against.
// Rewarded ads and the bottom banner are unaffected by this flag.
const LAUNCH_AD_ENABLED = false;

type GMAModule = {
  default: () => {
    initialize: () => Promise<unknown>;
    setRequestConfiguration: (cfg: unknown) => Promise<unknown>;
  };
  AdEventType: typeof AdEventTypeEnum;
  RewardedAdEventType: typeof RewardedAdEventTypeEnum;
  InterstitialAd: {
    createForAdRequest: (
      unitId: string,
      opts?: unknown,
    ) => InterstitialAdType;
  };
  RewardedAd: {
    createForAdRequest: (unitId: string, opts?: unknown) => RewardedAdType;
  };
  AppOpenAd: {
    createForAdRequest: (unitId: string, opts?: unknown) => AppOpenAdType;
  };
  AdsConsent: {
    requestInfoUpdate: (opts?: unknown) => Promise<unknown>;
    loadAndShowConsentFormIfRequired: () => Promise<unknown>;
  };
};

let GMA: GMAModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  GMA = require("react-native-google-mobile-ads") as GMAModule;
} catch {
  // Expo Go / web — native module not available. Leave null.
}

// Tracking-transparency is also a native-only package. Wrap it in a
// try/catch so Expo Go still loads.
type TTModule = typeof import("expo-tracking-transparency");
let TT: TTModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TT = require("expo-tracking-transparency");
} catch {
  TT = null;
}

const inExpoGo = Constants.appOwnership === "expo";

/** True when the native Google Mobile Ads module is linked. In Expo
 *  Go / web this returns false and every helper below becomes a
 *  no-op. The web check is explicit because Metro aliases GMA to an
 *  empty stub for the web target (see `metro.config.js`), so the
 *  null-check alone wouldn't catch web. */
export function isAdsAvailable(): boolean {
  return Platform.OS !== "web" && !inExpoGo && GMA !== null;
}

let initialised = false;
let initPromise: Promise<void> | null = null;

// Pre-cached single-use ad instances. GMA's instances are single-use
// (each `.show()` consumes them), so we rebuild after every show.
let cachedInterstitial: InterstitialAdType | null = null;
let cachedRewarded: RewardedAdType | null = null;
let cachedAppOpen: AppOpenAdType | null = null;
let interstitialReady = false;
let rewardedReady = false;
let appOpenReady = false;

/**
 * Initialise the ad SDK. Safe to call from app startup — no-ops on
 * Expo Go and is idempotent (subsequent calls return the same
 * promise).
 *
 * Strict ordering — DO NOT REORDER:
 *   1. UMP `requestInfoUpdate` (consent state)
 *   2. UMP `loadAndShowConsentFormIfRequired` (GDPR/CCPA UI)
 *   3. ATT `requestTrackingPermissionsAsync` (iOS only — must
 *      resolve before init because GMA reads IDFA status during
 *      init)
 *   4. `mobileAds().initialize()`
 *   5. Pre-cache interstitial + rewarded + app-open
 *
 * Each consent/permission step is wrapped in its own try/catch so a
 * failure in 1–3 cannot block init (4). The UMP form is a no-op
 * outside GDPR/CCPA jurisdictions; the ATT prompt is a no-op on
 * Android and iOS <14.5.
 */
export async function initAds(): Promise<void> {
  if (initialised) return;
  if (initPromise) return initPromise;
  if (!isAdsAvailable() || !GMA) return;

  initPromise = (async () => {
    try {
      // ── 1+2. UMP consent (GDPR / CCPA) ─────────────────────────
      try {
        await GMA!.AdsConsent.requestInfoUpdate();
        await GMA!.AdsConsent.loadAndShowConsentFormIfRequired();
      } catch {
        // Consent UI is best-effort — failure here shouldn't block
        // ads from loading (we'll just serve non-personalised).
      }

      // ── 3. ATT (iOS only) ──────────────────────────────────────
      if (Platform.OS === "ios" && TT) {
        try {
          const current = await TT.getTrackingPermissionsAsync();
          if (current.status === "undetermined") {
            await TT.requestTrackingPermissionsAsync();
          }
        } catch {
          // ATT prompt can throw on simulator / pre-iOS-14 devices.
          // Ignore — GMA still works without IDFA.
        }
      }

      // ── 4. Initialize Mobile Ads SDK ───────────────────────────
      try {
        await GMA!.default().initialize();
      } catch {
        // Init failures are recoverable — downstream helpers will
        // keep returning "no ad" and the player still gets full
        // gameplay.
        return;
      }

      initialised = true;

      // ── 5. Pre-cache the formats we use most ───────────────────
      // GMA instances are single-use, so we keep one of each and
      // rebuild after every consumption.
      preloadInterstitial();
      preloadRewarded();
      if (LAUNCH_AD_ENABLED) preloadAppOpen();
    } catch {
      // Belt-and-braces. SDK init failures shouldn't crash the app.
    }
  })();

  return initPromise;
}

// ── Internal: ad pre-loaders ─────────────────────────────────────
//
// Each preloader's ERROR handler schedules a retry rather than just
// nulling the cache. Without the retry, a single transient failure
// (network blip, momentary no-fill, AdMob hiccup) on the load-after-
// init OR the rebuild-after-consumption left the cache permanently
// null for the rest of the session — every subsequent show call would
// wait the full timeout and return false. Backoff is fixed at 5 s,
// which is short enough to feel responsive but long enough to avoid
// hammering AdMob during a sustained outage.

// Backoff between preload retries when AdMob returns ERROR. Was 5 s,
// dropped to 2 s so a NO_FILL on a brand-new unit (common during the
// first 24-72h of an app's life) doesn't keep the rewarded cache
// empty long enough for the next user-facing show call to time out
// its readiness wait. AdMob doesn't rate-limit at this cadence —
// the request count goes up but the eCPM-floor + auction logic
// handles the surge.
const PRELOAD_RETRY_MS = 2000;
let interstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
let rewardedRetryTimer: ReturnType<typeof setTimeout> | null = null;
let appOpenRetryTimer: ReturnType<typeof setTimeout> | null = null;

function preloadInterstitial(): void {
  if (!GMA) return;
  if (interstitialRetryTimer) {
    clearTimeout(interstitialRetryTimer);
    interstitialRetryTimer = null;
  }
  try {
    const ad = GMA.InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    interstitialReady = false;
    cachedInterstitial = ad;
    const onLoaded = ad.addAdEventListener(GMA.AdEventType.LOADED, () => {
      interstitialReady = true;
    });
    const onError = ad.addAdEventListener(GMA.AdEventType.ERROR, (err) => {
      console.warn("[ads] interstitial preload errored, retrying", err);
      interstitialReady = false;
      cachedInterstitial = null;
      onLoaded();
      onError();
      onPaid();
      interstitialRetryTimer = setTimeout(preloadInterstitial, PRELOAD_RETRY_MS);
    });
    const onPaid = ad.addAdEventListener(GMA.AdEventType.PAID, (event) => {
      const e = event as { value?: number; currency?: string } | undefined;
      void logEvent("af_ad_revenue", {
        af_revenue: e?.value ?? 0,
        af_currency: e?.currency ?? "USD",
        af_adrevenue_ad_type: "interstitial",
      });
    });
    ad.load();
  } catch (err) {
    console.warn("[ads] interstitial preload threw, retrying", err);
    cachedInterstitial = null;
    interstitialReady = false;
    interstitialRetryTimer = setTimeout(preloadInterstitial, PRELOAD_RETRY_MS);
  }
}

function preloadRewarded(): void {
  if (!GMA) return;
  if (rewardedRetryTimer) {
    clearTimeout(rewardedRetryTimer);
    rewardedRetryTimer = null;
  }
  try {
    const ad = GMA.RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded, {
      requestNonPersonalizedAdsOnly: false,
    });
    rewardedReady = false;
    cachedRewarded = ad;
    const onLoaded = ad.addAdEventListener(
      GMA.RewardedAdEventType.LOADED,
      () => {
        rewardedReady = true;
      },
    );
    const onError = ad.addAdEventListener(GMA.AdEventType.ERROR, (err) => {
      console.warn("[ads] rewarded preload errored, retrying", err);
      rewardedReady = false;
      cachedRewarded = null;
      onLoaded();
      onError();
      onPaid();
      rewardedRetryTimer = setTimeout(preloadRewarded, PRELOAD_RETRY_MS);
    });
    const onPaid = ad.addAdEventListener(GMA.AdEventType.PAID, (event) => {
      const e = event as { value?: number; currency?: string } | undefined;
      void logEvent("af_ad_revenue", {
        af_revenue: e?.value ?? 0,
        af_currency: e?.currency ?? "USD",
        af_adrevenue_ad_type: "rewarded_video",
      });
    });
    ad.load();
  } catch (err) {
    console.warn("[ads] rewarded preload threw, retrying", err);
    cachedRewarded = null;
    rewardedReady = false;
    rewardedRetryTimer = setTimeout(preloadRewarded, PRELOAD_RETRY_MS);
  }
}

function preloadAppOpen(): void {
  if (!GMA) return;
  if (appOpenRetryTimer) {
    clearTimeout(appOpenRetryTimer);
    appOpenRetryTimer = null;
  }
  try {
    const ad = GMA.AppOpenAd.createForAdRequest(AD_UNIT_IDS.appOpen, {
      requestNonPersonalizedAdsOnly: false,
    });
    appOpenReady = false;
    cachedAppOpen = ad;
    const onLoaded = ad.addAdEventListener(GMA.AdEventType.LOADED, () => {
      appOpenReady = true;
    });
    const onError = ad.addAdEventListener(GMA.AdEventType.ERROR, (err) => {
      console.warn("[ads] app-open preload errored, retrying", err);
      appOpenReady = false;
      cachedAppOpen = null;
      onLoaded();
      onError();
      onPaid();
      appOpenRetryTimer = setTimeout(preloadAppOpen, PRELOAD_RETRY_MS);
    });
    const onPaid = ad.addAdEventListener(GMA.AdEventType.PAID, (event) => {
      const e = event as { value?: number; currency?: string } | undefined;
      void logEvent("af_ad_revenue", {
        af_revenue: e?.value ?? 0,
        af_currency: e?.currency ?? "USD",
        af_adrevenue_ad_type: "app_open",
      });
    });
    ad.load();
  } catch (err) {
    console.warn("[ads] app-open preload threw, retrying", err);
    cachedAppOpen = null;
    appOpenReady = false;
    appOpenRetryTimer = setTimeout(preloadAppOpen, PRELOAD_RETRY_MS);
  }
}

/**
 * Show the cold-start app-open ad over the splash screen. Awaits a
 * cached fill, shows the ad, and resolves when the user dismisses
 * it. Caller should keep the splash screen visible until this
 * resolves.
 *
 * Returns `true` if an ad was actually presented (user saw + closed
 * it), `false` if no ad was available, the ad failed, or the timeout
 * fired before we could show one. Either way the caller should
 * proceed to hide the splash screen on resolve.
 *
 * `timeoutMs` caps how long we're willing to wait for an app-open
 * ad to load. Beyond this, we give up and resolve so the app
 * proceeds normally. 7 seconds is a sensible default — keeps cold
 * start fast while still giving slow connections a chance to fill.
 */
export async function showLaunchAd(timeoutMs = 7000): Promise<boolean> {
  if (!LAUNCH_AD_ENABLED) return false;
  if (!isAdsAvailable() || !GMA) return false;

  // Wait for init to finish if it's still in flight.
  if (initPromise && !initialised) {
    try {
      await initPromise;
    } catch {
      return false;
    }
  }

  const deadline = Date.now() + timeoutMs;
  const remaining = () => Math.max(0, deadline - Date.now());

  // Wait until the cached app-open ad reports loaded, capped at the
  // remaining budget. Ads SDK fires LOADED via the listener attached
  // in preloadAppOpen.
  const ready = await new Promise<boolean>((resolve) => {
    if (appOpenReady && cachedAppOpen) {
      resolve(true);
      return;
    }
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      resolve(false);
    }, remaining());
    const intervalId = setInterval(() => {
      if (appOpenReady && cachedAppOpen) {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        resolve(true);
      }
    }, 100);
  });

  if (!ready || !cachedAppOpen) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const ad = cachedAppOpen!;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      // Rebuild the cache so the next invocation gets a fresh ad.
      cachedAppOpen = null;
      appOpenReady = false;
      preloadAppOpen();
      resolve(ok);
    };

    const offClosed = ad.addAdEventListener(GMA!.AdEventType.CLOSED, () =>
      finish(true),
    );
    const offError = ad.addAdEventListener(GMA!.AdEventType.ERROR, () =>
      finish(false),
    );

    // Hard safety net — if CLOSED never fires (SDK bug), resolve
    // after 30s so the user isn't locked out forever.
    const timeoutId = setTimeout(() => {
      offClosed();
      offError();
      finish(false);
    }, 30_000);

    try {
      ad.show();
    } catch {
      clearTimeout(timeoutId);
      offClosed();
      offError();
      finish(false);
    }
  });
}

/**
 * Show a rewarded video. Resolves `true` when the user watched long
 * enough to earn the reward, `false` otherwise (ad failed to load,
 * user closed early, SDK not available). All gameplay rewards should
 * be gated on the `true` return value.
 *
 * On Expo Go we return `false` immediately — the calling UI falls
 * back to its local simulation (kept as a courtesy so devs can test
 * the heart/coin flow without a dev build).
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!isAdsAvailable() || !GMA) return false;

  // Wait for init to finish if it's still in flight.
  if (initPromise && !initialised) {
    try {
      await initPromise;
    } catch {
      return false;
    }
  }

  // If the cache isn't ready, wait for it. The window is 15 s
  // (was 8 s) — wide enough to absorb a NO_FILL → 2 s retry → load
  // round-trip even on a slow network, while still being short
  // enough that a genuinely dead session resolves the user's tap
  // instead of leaving a spinner up indefinitely. The pre-load
  // retry cadence (PRELOAD_RETRY_MS) is now 2 s, so this window
  // covers ~6 retry cycles before giving up.
  const deadline = Date.now() + 15000;
  while ((!rewardedReady || !cachedRewarded) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!rewardedReady || !cachedRewarded) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let earned = false;
    let openedAt = 0;
    const ad = cachedRewarded!;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      console.warn("[ads] rewarded finish", {
        ok,
        earned,
        watchedMs: openedAt ? Date.now() - openedAt : null,
      });
      cachedRewarded = null;
      rewardedReady = false;
      preloadRewarded();
      resolve(ok);
    };

    // OPENED fires when the ad presents on screen. We log it + stamp
    // the start time so the finish-line warn can report total watch
    // duration — useful for diagnosing "EARNED_REWARD never fired"
    // scenarios (typical when an AdMob unit ID is misconfigured as
    // an interstitial type, or when the reward field is empty).
    const offOpened = ad.addAdEventListener(GMA!.AdEventType.OPENED, () => {
      openedAt = Date.now();
      console.warn("[ads] rewarded OPENED");
    });

    // EARNED_REWARD fires when the user watched long enough to
    // earn — flag it but resolve on CLOSED so the UI doesn't credit
    // the reward until the player is actually back in-app.
    const offEarned = ad.addAdEventListener(
      GMA!.RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        earned = true;
        console.warn("[ads] rewarded EARNED_REWARD", reward);
        // AppsFlyer's "gaming" vertical uses `af_ad_view` for a
        // completed rewarded video — key input to campaign-level
        // ROAS optimisation. Fire on EARNED_REWARD, not CLOSED, so
        // we only credit ads the user actually watched to earn.
        void logEvent("af_ad_view", {
          af_adrevenue_ad_type: "rewarded_video",
        });
      },
    );
    const offClosed = ad.addAdEventListener(GMA!.AdEventType.CLOSED, () => {
      console.warn("[ads] rewarded CLOSED", { earned });
      offOpened();
      offEarned();
      offClosed();
      offError();
      finish(earned);
    });
    const offError = ad.addAdEventListener(GMA!.AdEventType.ERROR, (err) => {
      console.warn("[ads] rewarded ERROR", err);
      offOpened();
      offEarned();
      offClosed();
      offError();
      finish(false);
    });

    // Safety net — 180 s max. Mediated networks can run long: Unity
    // Ads is typically 30 s video + end card (60–75 s total dismissal)
    // and Vungle / Liftoff long-form units push close to 90 s. The
    // previous 60 s budget fired BEFORE the user could dismiss
    // Unity's end card, resolving the promise as `false` and
    // dropping the reward grant even though EARNED_REWARD had
    // already flagged the player as eligible at the 30 s mark.
    //
    // We also short-circuit on `earned`: if the user has already
    // earned by the time the timeout fires, credit the reward
    // (they watched it; the SDK just hasn't dispatched CLOSED yet
    // — typical when the network's end card UI hangs). Anything
    // longer than 180 s is genuinely a wedged SDK or stuck ad and
    // we surrender the session.
    const timeoutId = setTimeout(() => {
      console.warn("[ads] rewarded TIMEOUT", { earned });
      offOpened();
      offEarned();
      offClosed();
      offError();
      finish(earned);
    }, 180_000);
    void timeoutId;

    try {
      ad.show();
    } catch {
      offEarned();
      offClosed();
      offError();
      finish(false);
    }
  });
}

/** Show a full-screen interstitial. Returns `true` if the ad was
 *  presented, `false` if none was available. Used by
 *  `lib/interstitial.ts` for game-over and active-play triggers. */
export async function showInterstitialAd(): Promise<boolean> {
  if (!isAdsAvailable() || !GMA) return false;

  if (initPromise && !initialised) {
    try {
      await initPromise;
    } catch {
      return false;
    }
  }

  if (!interstitialReady || !cachedInterstitial) return false;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const ad = cachedInterstitial!;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cachedInterstitial = null;
      interstitialReady = false;
      preloadInterstitial();
      resolve(ok);
    };

    const offClosed = ad.addAdEventListener(GMA!.AdEventType.CLOSED, () => {
      offClosed();
      offError();
      finish(true);
    });
    const offError = ad.addAdEventListener(GMA!.AdEventType.ERROR, () => {
      offClosed();
      offError();
      finish(false);
    });

    try {
      ad.show();
    } catch {
      offClosed();
      offError();
      finish(false);
    }
  });
}

/** Retained for API compatibility — banner is now declarative via
 *  the `<BannerAd>` component inside `components/AdBanner.tsx`, so
 *  there's no imperative show/hide. Existing call sites keep
 *  importing `showBanner`/`hideBanner` from this file but the
 *  functions intentionally do nothing. */
export function showBanner(): void {
  // intentional no-op — see comment above
}

export function hideBanner(): void {
  // intentional no-op — see comment above
}
