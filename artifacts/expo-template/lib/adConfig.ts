// Centralised AdMob unit IDs. Real IDs ship in production; `__DEV__`
// builds get Google's public test IDs so we never burn live inventory
// during development — even on a registered test device, prefer test
// IDs because they're guaranteed to fill and won't accumulate
// invalid-traffic flags against the real units.
//
// Source of truth in the AdMob console:
//   App: Slam Goal (iOS / Android — publisher TBD; placeholders below
//   until the new AdMob app entries are created and unit IDs assigned).
// Refresh these values when rotating units in the dashboard.

import { Platform } from "react-native";

// Google's public test unit IDs — same values across every test
// device, every project. Do NOT replace with our own units in dev:
// the test IDs are what AdMob's policy requires for development
// traffic, and they auto-fill 100% of the time.
//
// Source: https://developers.google.com/admob/ios/test-ads
//         https://developers.google.com/admob/android/test-ads
const TEST_IDS = {
  ios: {
    banner: "ca-app-pub-3940256099942544/2934735716",
    interstitial: "ca-app-pub-3940256099942544/4411468910",
    rewarded: "ca-app-pub-3940256099942544/1712485313",
    rewardedInterstitial: "ca-app-pub-3940256099942544/6978759866",
    native: "ca-app-pub-3940256099942544/3986624511",
    appOpen: "ca-app-pub-3940256099942544/5662855259",
  },
  android: {
    banner: "ca-app-pub-3940256099942544/6300978111",
    interstitial: "ca-app-pub-3940256099942544/1033173712",
    rewarded: "ca-app-pub-3940256099942544/5224354917",
    rewardedInterstitial: "ca-app-pub-3940256099942544/5354046379",
    native: "ca-app-pub-3940256099942544/2247696110",
    appOpen: "ca-app-pub-3940256099942544/9257395921",
  },
} as const;

// Production unit IDs — replace each "REPLACE_WITH_*" placeholder with
// the real ID from the new Slam Goal AdMob app entries (one per OS).
// Until then, production builds will hit invalid units and ads will
// fail to load. Dev builds use Google's test IDs above and are
// unaffected.
const PROD_IDS = {
  ios: {
    banner: "REPLACE_WITH_ADMOB_IOS_BANNER_UNIT_ID",
    interstitial: "REPLACE_WITH_ADMOB_IOS_INTERSTITIAL_UNIT_ID",
    rewarded: "REPLACE_WITH_ADMOB_IOS_REWARDED_UNIT_ID",
    // TODO(admob-placement): no UI placement consumes this format yet.
    // When we add a between-rounds rewarded-interstitial slot, wire it
    // through `lib/ads.ts` → `showRewardedInterstitialAd()`.
    rewardedInterstitial: "REPLACE_WITH_ADMOB_IOS_REWARDED_INTERSTITIAL_UNIT_ID",
    // TODO(admob-placement): no native ad slot in the UI yet. Native
    // would fit nicely in a results screen card or shop "featured"
    // tile — design exercise before implementation.
    native: "REPLACE_WITH_ADMOB_IOS_NATIVE_UNIT_ID",
    // Currently gated by `LAUNCH_AD_ENABLED = false` in `lib/ads.ts`.
    appOpen: "REPLACE_WITH_ADMOB_IOS_APP_OPEN_UNIT_ID",
  },
  android: {
    banner: "REPLACE_WITH_ADMOB_ANDROID_BANNER_UNIT_ID",
    interstitial: "REPLACE_WITH_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID",
    rewarded: "REPLACE_WITH_ADMOB_ANDROID_REWARDED_UNIT_ID",
    rewardedInterstitial: "REPLACE_WITH_ADMOB_ANDROID_REWARDED_INTERSTITIAL_UNIT_ID",
    native: "REPLACE_WITH_ADMOB_ANDROID_NATIVE_UNIT_ID",
    appOpen: "REPLACE_WITH_ADMOB_ANDROID_APP_OPEN_UNIT_ID",
  },
} as const;

const SOURCE = __DEV__ ? TEST_IDS : PROD_IDS;

const PLATFORM_IDS =
  Platform.OS === "ios"
    ? SOURCE.ios
    : Platform.OS === "android"
      ? SOURCE.android
      : // Web / any non-mobile target — never reached at runtime because
        // the ads layer no-ops there, but TS still needs values.
        SOURCE.android;

export const AD_UNIT_IDS = PLATFORM_IDS;

export type AdUnitFormat = keyof typeof PLATFORM_IDS;
