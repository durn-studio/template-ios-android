// Low-level RevenueCat wrapper — hides the native modules behind a
// runtime-safe surface so the app still boots in Expo Go (where the
// native bindings aren't available).
//
// The `react-native-purchases` + `react-native-purchases-ui` modules
// throw at import time when no native side is linked (Expo Go).
// Wrapping the `require()` in a try/catch means every helper in here
// degrades to a benign no-op on Expo Go. EAS dev builds + production
// builds pick up the real implementations automatically.
//
// All callers should go through `context/PurchasesContext` rather
// than this file directly. This module only exposes the minimum API
// the context needs.

import Constants from "expo-constants";
import { Platform } from "react-native";

// Single source of truth for the Slam Goal Pro entitlement
// identifier. Matches the name the user configured in the RevenueCat
// dashboard — case-sensitive. Update both this string and the RC
// dashboard entitlement name together; they MUST stay in lockstep.
export const PRO_ENTITLEMENT = "Slam Goal Pro";

// Unlimited-hearts monthly subscription entitlement. Separate from
// Pro by design: Pro is a one-time ad-removal, this is a recurring
// sub. A user can hold either, both, or neither. The hearts system
// in GameContext checks this at read time via PurchasesContext so
// consumeHeart() becomes a no-op while active.
export const UNLIMITED_HEARTS_ENTITLEMENT = "unlimited_hearts";

// Public SDK keys, one per platform. RevenueCat's public keys are
// designed to ship with the client — they only grant the ability to
// fetch offerings and start purchases, never to read raw customer
// data. Store them as plain strings here; no env var needed.
//
// Replace the placeholders below with the public iOS / Android keys
// from the new Slam Goal RevenueCat project before any build that
// needs IAP working. Until then, IAP calls will fail at runtime.
const API_KEYS = {
  ios: "REPLACE_WITH_REVENUECAT_IOS_PUBLIC_KEY",
  android: "REPLACE_WITH_REVENUECAT_ANDROID_PUBLIC_KEY",
} as const;

// Dynamic-require guarded by try/catch so Expo Go (no native module)
// doesn't crash on import. `require` is used instead of top-level
// `import` because import can't be inside try/catch and is hoisted.
type PurchasesModule = typeof import("react-native-purchases").default;
type PurchasesUIModule = typeof import("react-native-purchases-ui").default;

let Purchases: PurchasesModule | null = null;
let RevenueCatUI: PurchasesUIModule | null = null;
let LOG_LEVEL: typeof import("react-native-purchases").LOG_LEVEL | null = null;
let PAYWALL_RESULT: typeof import("react-native-purchases-ui").PAYWALL_RESULT | null =
  null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require("react-native-purchases");
  Purchases = rn.default;
  LOG_LEVEL = rn.LOG_LEVEL;
} catch {
  // Expo Go / web — native module not available. Leave null.
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnui = require("react-native-purchases-ui");
  RevenueCatUI = rnui.default;
  PAYWALL_RESULT = rnui.PAYWALL_RESULT;
} catch {
  // Same guard — the UI package also ships a native side.
}

// Expo Go's `appOwnership === "expo"` tells us we're inside Expo Go
// specifically, where even a successfully-required module would have
// no native methods. Used as a belt-and-braces alongside the
// try/catch above.
const inExpoGo = Constants.appOwnership === "expo";

export function isRevenueCatAvailable(): boolean {
  return !inExpoGo && Purchases !== null;
}

let configured = false;

/**
 * Initialise the RevenueCat SDK. Safe to call from app startup — it
 * no-ops on Expo Go / web and is idempotent. Call once per app
 * lifetime.
 *
 * @param appUserID - Stable user identifier for cross-device
 *   entitlement sync. Pass `undefined` for guest users; RevenueCat
 *   generates an anonymous ID that you can later link with
 *   `identify()` when the player signs in.
 */
export function initPurchases(appUserID?: string): void {
  if (!isRevenueCatAvailable() || !Purchases) return;
  if (configured) return;

  if (__DEV__ && LOG_LEVEL) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const apiKey =
    Platform.OS === "ios"
      ? API_KEYS.ios
      : Platform.OS === "android"
        ? API_KEYS.android
        : null;

  if (!apiKey) return;

  Purchases.configure({ apiKey, appUserID });
  configured = true;
}

/** Link an anonymous customer to a real user ID on sign-in. */
export async function identifyPurchases(appUserID: string): Promise<void> {
  if (!isRevenueCatAvailable() || !Purchases) return;
  await Purchases.logIn(appUserID);
}

/** Switch to an anonymous customer on sign-out. */
export async function signOutPurchases(): Promise<void> {
  if (!isRevenueCatAvailable() || !Purchases) return;
  await Purchases.logOut();
}

/**
 * Purchase a product (consumable coin/heart pack, power-up bundle,
 * or non-renewing/auto-renewing subscription) by store product ID.
 *
 * Returns:
 *   { ok: true }                            — Apple/Google charged successfully
 *   { ok: false, reason: "userCancelled" } — user dismissed the sheet
 *   { ok: false, reason: "rcUnavailable" } — Expo Go / web — caller should fall back to local sim
 *   { ok: false, reason: "noProduct" }     — RC could not find the productId in App Store / Play
 *   { ok: false, reason: "error", errorMessage } — any other failure
 *
 * Consumables (coins, hearts packs, power-ups) DON'T flip a
 * RevenueCat entitlement — the app must apply the grant locally on
 * `ok: true`. Subscriptions (`unlimited_hearts`, Pro) DO flip an
 * entitlement; the PurchasesContext listener picks that up and
 * downstream consumers respect it without explicit grant calls.
 */
export interface PurchaseProductResult {
  ok: boolean;
  reason?: "userCancelled" | "noProduct" | "rcUnavailable" | "error";
  errorMessage?: string;
}

export async function purchaseProduct(
  productId: string,
): Promise<PurchaseProductResult> {
  if (!isRevenueCatAvailable() || !Purchases) {
    return { ok: false, reason: "rcUnavailable" };
  }
  try {
    const products = await Purchases.getProducts([productId]);
    if (!products.length) {
      return { ok: false, reason: "noProduct" };
    }
    await Purchases.purchaseStoreProduct(products[0]);
    return { ok: true };
  } catch (e: unknown) {
    // RevenueCat tags user-initiated cancels with `userCancelled:
    // true` on the error object. Anything else is a real failure
    // (StoreKit error, network, signature mismatch, etc.).
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) {
      return { ok: false, reason: "userCancelled" };
    }
    return {
      ok: false,
      reason: "error",
      errorMessage: err?.message ?? String(e),
    };
  }
}

/**
 * Fetch localized prices for a set of product IDs.
 *
 * Returns a `productId → priceString` map populated from RC's
 * `getProducts(...)` call (which under the hood asks StoreKit /
 * Play Billing for the user's locale-formatted price). IDs that
 * StoreKit doesn't know about are simply omitted from the map —
 * callers should fall back to the static `priceLocal` field.
 *
 * Cached at module scope: a second call with overlapping IDs reuses
 * cached entries and only fetches the new ones. The Store-reported
 * prices are stable enough for a session and an unconditional
 * round-trip on every sheet open is wasteful.
 */
const priceCache = new Map<string, string>();

export async function getProductPrices(
  productIds: readonly string[],
): Promise<Record<string, string>> {
  if (!isRevenueCatAvailable() || !Purchases) return {};
  if (!productIds.length) return {};

  const cached: Record<string, string> = {};
  const missing: string[] = [];
  for (const id of productIds) {
    const hit = priceCache.get(id);
    if (hit) {
      cached[id] = hit;
    } else {
      missing.push(id);
    }
  }
  if (!missing.length) return cached;

  try {
    const products = await Purchases.getProducts(missing);
    for (const product of products) {
      // PurchasesStoreProduct shape — `priceString` is the
      // localized, currency-formatted price (e.g. "0,99 €",
      // "$0.99", "¥120"). Same field on iOS and Android.
      const ps = (product as { priceString?: string; identifier: string });
      if (ps.priceString) {
        priceCache.set(ps.identifier, ps.priceString);
        cached[ps.identifier] = ps.priceString;
      }
    }
  } catch {
    // Network / Store hiccup — cached entries already returned;
    // missing IDs simply won't be in the map and callers will fall
    // back to the static priceLocal.
  }
  return cached;
}

// Re-export the raw modules so the context can listen for customer-
// info updates / call purchase methods without a second try/catch.
// Consumers should prefer the context's public API over touching
// these directly — they're nullable in Expo Go.
export { Purchases, RevenueCatUI, PAYWALL_RESULT };
