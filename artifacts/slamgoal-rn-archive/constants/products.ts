// In-app product catalog.
//
// At launch this is a static list used purely to render the top-up sheet.
// Once we ship a custom dev build and install `react-native-purchases`
// (RevenueCat), we replace the contents of `COIN_PRODUCTS` and
// `HEART_PRODUCTS` with `await Purchases.getOfferings()`, and the shown
// `priceLocal` strings come from the live StoreKit / Play Billing
// response.
//
// Product IDs here match what you'll register in App Store Connect /
// Google Play Console + RevenueCat's dashboard so the wiring is
// zero-diff on the UI side later. Replace the prefix below with the
// real bundle id (typically `com.<org>.<app>`):
//   REPLACE_WITH_BUNDLE_PREFIX.coins.500
//   REPLACE_WITH_BUNDLE_PREFIX.coins.2500
//   REPLACE_WITH_BUNDLE_PREFIX.coins.10000
//   REPLACE_WITH_BUNDLE_PREFIX.coins.50000
//   REPLACE_WITH_BUNDLE_PREFIX.hearts.5
//   REPLACE_WITH_BUNDLE_PREFIX.hearts.20
//   REPLACE_WITH_BUNDLE_PREFIX.hearts.unlimited.monthly (subscription — monthly)
//
// The Bubble Masters era also shipped a power-up "starter bundle"
// SKU that granted bomb / swap / shake / magnet. Slam Goal has no
// power-up inventory in Phase 1; the bundle and its grant types
// were removed. Phase 5 will redesign the IAP catalogue around the
// new economy (footballer cards, manager-pass, etc. per the design
// doc) — define the new product shape here when that lands.

export interface Product {
  id: string;
  kind: "coins" | "hearts";
  amount: number;
  priceLocal: string;          // Rendered price; replaced with real Store-reported string later.
  highlighted?: boolean;       // "Best value" badge in the sheet.
  subscription?: boolean;      // Monthly sub (hearts only for now).
}

export const COIN_PRODUCTS: Product[] = [
  { id: "REPLACE_WITH_BUNDLE_PREFIX.coins.500",   kind: "coins", amount: 500,   priceLocal: "$0.99" },
  { id: "REPLACE_WITH_BUNDLE_PREFIX.coins.2500",  kind: "coins", amount: 2500,  priceLocal: "$3.99" },
  { id: "REPLACE_WITH_BUNDLE_PREFIX.coins.10000", kind: "coins", amount: 10000, priceLocal: "$9.99", highlighted: true },
  { id: "REPLACE_WITH_BUNDLE_PREFIX.coins.50000", kind: "coins", amount: 50000, priceLocal: "$39.99" },
];

export const HEART_PRODUCTS: Product[] = [
  { id: "REPLACE_WITH_BUNDLE_PREFIX.hearts.5",          kind: "hearts", amount: 5,  priceLocal: "$0.99" },
  { id: "REPLACE_WITH_BUNDLE_PREFIX.hearts.20",         kind: "hearts", amount: 20, priceLocal: "$2.99", highlighted: true },
  { id: "REPLACE_WITH_BUNDLE_PREFIX.hearts.unlimited.monthly",  kind: "hearts", amount: 0,  priceLocal: "$4.99/mo", subscription: true },
];
