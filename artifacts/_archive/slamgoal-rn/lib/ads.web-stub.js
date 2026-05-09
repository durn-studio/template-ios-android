// Web stub for `react-native-google-mobile-ads`.
//
// The real package imports react-native internals
// (`react-native/Libraries/Utilities/codegenNativeComponent`) that
// don't exist when Metro bundles for the web target. Aliased in via
// `metro.config.js` so the web bundle resolves the import without
// crashing during static analysis.
//
// At runtime, `Platform.OS === "web"` guards in `lib/ads.ts` and
// `components/AdBanner.tsx` short-circuit before any property on
// this stub is ever read — so the empty object is enough.
module.exports = {};
