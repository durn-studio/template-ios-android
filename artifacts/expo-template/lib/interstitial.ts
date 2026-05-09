// Trigger + cooldown manager for in-game interstitial ads.
//
// Separates the "when" from the "how": `showInterstitialAd()` in
// lib/ads.ts is the one-shot "fire an interstitial now" primitive;
// this file decides when it's actually OK to call that primitive.
//
// Two trigger points live in gameplay code:
//
//   • `maybeShowOnGameOver()` — called when a match ends. Standard
//     casual-game placement: the player is already transitioning
//     out of active play, they're more forgiving of a pause.
//
//   • `trackActivePlay(deltaMs)` — called from a 1 s ticker while
//     the /game screen is focused + the match isn't paused / over.
//     Accumulates wall-clock ms of real gameplay and fires an
//     interstitial the first time it crosses
//     `ACTIVE_PLAY_THRESHOLD_MS`, then resets the counter.
//
// Both paths go through `showInterstitialIfEligible` which enforces
// a 60 s cross-trigger cooldown — so a lose-then-another-lose streak
// or a 5 min threshold landing right on a game-over moment can't
// fire two ads back-to-back. The 60s cooldown at this level keeps
// the behaviour predictable regardless of SDK state and is
// independent of how Google Mobile Ads' loaded-ad cache happens to
// be primed at any given moment.
//
// State is module-scoped and session-only: we intentionally don't
// persist the cooldown / counter across app restarts. A cold start
// is already a big enough break that resetting the counters feels
// right, and we don't want to surprise a returning player with an
// ad the instant they tap PLAY.

import { isAdsAvailable, showInterstitialAd } from "@/lib/ads";

const MIN_COOLDOWN_MS = 60_000;
const ACTIVE_PLAY_THRESHOLD_MS = 5 * 60 * 1000;

let lastInterstitialAt = 0;
let activePlayMs = 0;

// Module-level "is the player on Pro?" mirror. Call sites in
// game.tsx already gate these triggers on isPro at the component
// level, but we also read the flag inside
// `showInterstitialIfEligible` as defence-in-depth — if a future
// caller forgets the React-level guard, the manager still refuses
// to fire. PurchasesContext pushes the current value via
// `setProForAds` on every isPro flip.
let isProForAds = false;
export function setProForAds(value: boolean): void {
  isProForAds = value;
  if (value) {
    // Clear the active-play accumulator when Pro turns on so the
    // counter doesn't fire an interstitial the instant Pro later
    // lapses on expiry.
    activePlayMs = 0;
  }
}

/** Reset the cumulative active-play counter. Useful when the
 *  player leaves the /game screen for an extended period (e.g.
 *  opens the shop) — keeps the counter honest to "real playing". */
export function resetActivePlayCounter(): void {
  activePlayMs = 0;
}

/** Add wall-clock ms of active play. Triggers an interstitial the
 *  first time the cumulative total crosses the threshold, then
 *  wraps the counter back to zero so the cadence stays at one ad
 *  per `ACTIVE_PLAY_THRESHOLD_MS` of playing. */
export function trackActivePlay(deltaMs: number): void {
  if (deltaMs <= 0) return;
  activePlayMs += deltaMs;
  if (activePlayMs >= ACTIVE_PLAY_THRESHOLD_MS) {
    activePlayMs = 0;
    void showInterstitialIfEligible("active_play");
  }
}

/** Fire an interstitial on game-over if eligible. Fire-and-forget —
 *  callers don't block on the ad, and the gameplay transition
 *  continues normally. */
export function maybeShowOnGameOver(): void {
  void showInterstitialIfEligible("game_over");
}

// ── Internal ──────────────────────────────────────────────────
async function showInterstitialIfEligible(_reason: string): Promise<boolean> {
  if (!isAdsAvailable()) return false;
  // Belt-and-braces Pro gate. Call sites already skip when isPro
  // is true; this prevents regression if a future caller forgets.
  if (isProForAds) return false;
  if (Date.now() - lastInterstitialAt < MIN_COOLDOWN_MS) return false;

  const shown = await showInterstitialAd();
  if (shown) {
    // Stamp the cooldown when the show call succeeds — together
    // with the cached-ad single-use semantics of Google Mobile Ads,
    // this guarantees we can't stack interstitials regardless of
    // how rapidly the triggers fire.
    lastInterstitialAt = Date.now();
    return true;
  }
  return false;
}
