// Low-level AppsFlyer wrapper — install + event attribution.
// Mirrors the Expo-Go-safe pattern used in `lib/purchases.ts` and
// `lib/ads.ts`: dynamic require in try/catch so every helper no-ops
// when the native module isn't linked (Expo Go, web).
//
// AppsFlyer is our MMP (Mobile Measurement Partner) — the single
// source of truth for attribution. Google Mobile Ads revenue feeds
// in via explicit `af_ad_revenue` events fired from `lib/ads.ts`
// (subscribed to GMA's per-impression `AdEventType.PAID`);
// RevenueCat IAP revenue feeds in via explicit `logPurchase()`
// calls from the purchase flow. Keep both of those wires tight or
// ROAS lies.

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import type AppsFlyerDefault from "react-native-appsflyer";

// Dev Key — one per AppsFlyer account, shared iOS + Android.
// Public identifier, safe to ship with the client.
// Replace with the new Slam Goal AppsFlyer dev key before shipping.
const DEV_KEY = "REPLACE_WITH_APPSFLYER_DEV_KEY";

// iOS App Store numeric ID (from App Store Connect → App Information
// → Apple ID). Required for iOS install attribution.
const IOS_APP_ID = "REPLACE_WITH_ASC_APP_ID";

// AsyncStorage key for the stable anonymous user id we feed into
// `setCustomerUserId`. The id is generated once on first launch and
// persisted for the life of the install — lets AppsFlyer tie together
// events from the same device even before the user takes any
// identifying action (we have no sign-up flow).
const CUSTOMER_USER_ID_KEY = "fc_af_customer_user_id";

let appsFlyer: typeof AppsFlyerDefault | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-appsflyer");
  appsFlyer = mod.default ?? mod;
} catch {
  // Expo Go / web — native module not available. Leave null.
}

// Tracking-transparency is also native-only. `lib/ads.ts` also loads
// it; doing so here makes `initAppsFlyer` self-sufficient when called
// for Pro users (who skip the ads init entirely).
type TTModule = typeof import("expo-tracking-transparency");
let TT: TTModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  TT = require("expo-tracking-transparency");
} catch {
  TT = null;
}

const inExpoGo = Constants.appOwnership === "expo";

/** True when the native AppsFlyer module is linked. In Expo Go / web
 *  this returns false and every helper below becomes a no-op. */
export function isAnalyticsAvailable(): boolean {
  return !inExpoGo && appsFlyer !== null;
}

let initialised = false;
let initPromise: Promise<void> | null = null;

// UUID v4 via Math.random. Not cryptographically secure — fine for an
// anonymous attribution ID, whose only job is to be unique per install.
function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Fetch the cached anonymous user id, or mint and persist a new one. */
async function getOrCreateCustomerUserId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(CUSTOMER_USER_ID_KEY);
    if (existing) return existing;
    const fresh = uuidv4();
    await AsyncStorage.setItem(CUSTOMER_USER_ID_KEY, fresh);
    return fresh;
  } catch {
    // AsyncStorage unavailable (extremely rare) — fall back to a
    // session-only id. Attribution still flows, it just won't
    // correlate across restarts if storage is borked.
    return uuidv4();
  }
}

/**
 * Initialise AppsFlyer. Safe to call from app startup — idempotent,
 * no-ops on Expo Go / web. Flow:
 *
 * 1. On iOS 14.5+, request ATT **before** calling initSdk. AppsFlyer
 *    needs the IDFA permission state fixed before firing the install
 *    event; otherwise we get "ghost installs" that can't be
 *    attributed.
 * 2. Call `initSdk` with `timeToWaitForATTUserAuthorization: 10` as a
 *    belt-and-braces — if our manual prompt is somehow slow, AppsFlyer
 *    still waits for the answer before reporting the install.
 *
 * Unlike `initAds`, this runs for **all users** — attribution is
 * valuable regardless of Pro status, and ATT is also required by
 * other first-party measurement (Apple Search Ads attribution).
 */
export async function initAppsFlyer(): Promise<void> {
  if (initialised) return;
  if (initPromise) return initPromise;
  if (!isAnalyticsAvailable() || !appsFlyer) return;

  initPromise = (async () => {
    try {
      // ── 1. ATT (iOS only) ──────────────────────────────────────
      // Same idempotent pattern used in `lib/ads.ts` — second caller
      // sees `current.status !== "undetermined"` and skips. We let
      // this one run first so AppsFlyer can attach IDFA to the
      // install event.
      if (Platform.OS === "ios" && TT) {
        try {
          const current = await TT.getTrackingPermissionsAsync();
          if (current.status === "undetermined") {
            await TT.requestTrackingPermissionsAsync();
          }
        } catch {
          // ATT prompt can throw on simulator / pre-iOS-14 devices.
          // Ignore — AppsFlyer still works without IDFA (install
          // attribution just degrades to SKAN-only).
        }
      }

      // ── 2. Set the stable anonymous customer user id BEFORE init
      // so it attaches to the install event. AppsFlyer uses this to
      // dedupe reinstalls + bridge app-to-web journeys in later
      // campaigns. Safe no-op if the SDK throws (the install event
      // still fires, just without a custom id).
      try {
        const customerUserId = await getOrCreateCustomerUserId();
        await new Promise<void>((resolve) => {
          appsFlyer!.setCustomerUserId(customerUserId, () => resolve());
          // Safety in case the success callback never fires.
          setTimeout(() => resolve(), 1000);
        });
      } catch {
        // noop — attribution still works without a customer id.
      }

      // ── 3. Init SDK ────────────────────────────────────────────
      await new Promise<void>((resolve, reject) => {
        appsFlyer!.initSdk(
          {
            devKey: DEV_KEY,
            isDebug: __DEV__,
            appId: IOS_APP_ID,
            onInstallConversionDataListener: true,
            onDeepLinkListener: true,
            timeToWaitForATTUserAuthorization: 10,
          },
          () => resolve(),
          (err) => reject(err),
        );
      });

      initialised = true;
    } catch {
      // SDK init failures shouldn't crash the app. `logEvent` /
      // `logPurchase` will keep no-op'ing until the next launch
      // re-attempts init.
    }
  })();

  return initPromise;
}

// ── Event helpers ─────────────────────────────────────────────────
//
// AppsFlyer recognises a set of "predefined" event names (`af_*`)
// that automatically populate its dashboards. Custom events are fine
// too but won't light up the conversion funnels. Stick to predefined
// names for anything marketing cares about.

type EventParams = Record<string, string | number | boolean>;

/** Log an arbitrary event. Use predefined `af_*` names for anything
 *  marketing cares about (e.g. `af_level_achieved`,
 *  `af_tutorial_completion`). */
export async function logEvent(
  name: string,
  params: EventParams = {},
): Promise<void> {
  if (!isAnalyticsAvailable() || !appsFlyer) return;
  // If init is still in flight, wait — events fired before init land
  // in a separate "anonymous" user bucket and can't be reconciled.
  if (initPromise && !initialised) {
    try {
      await initPromise;
    } catch {
      return;
    }
  }
  try {
    await new Promise<void>((resolve) => {
      appsFlyer!.logEvent(
        name,
        params,
        () => resolve(),
        () => resolve(),
      );
    });
  } catch {
    // Event logging failures are silent — they'd just pollute logs
    // and don't affect app behaviour.
  }
}

/** Log an IAP. Must be called after a successful RevenueCat purchase
 *  so campaign ROAS includes the revenue. `revenue` should be the
 *  local-currency price the user paid (AppsFlyer converts to USD in
 *  the dashboard using store-locale rates). */
export function logPurchase(opts: {
  revenue: number;
  currency: string;
  productId: string;
  contentType?: "inapp" | "subscription";
}): Promise<void> {
  return logEvent("af_purchase", {
    af_revenue: opts.revenue,
    af_currency: opts.currency,
    af_content_id: opts.productId,
    af_content_type: opts.contentType ?? "inapp",
  });
}

/** Log a level-completion. `level` is the numeric level reached. */
export function logLevelAchieved(level: number): Promise<void> {
  return logEvent("af_level_achieved", { af_level: level });
}

/** Log tutorial completion — fires once per install, key retention
 *  signal for Meta / Google campaign optimization. */
export function logTutorialComplete(): Promise<void> {
  return logEvent("af_tutorial_completion");
}

// Re-export the raw module for advanced callers. Consumers should
// prefer the helpers above.
export { appsFlyer };
