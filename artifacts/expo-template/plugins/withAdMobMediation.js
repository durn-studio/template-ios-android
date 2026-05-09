// Expo config plugin — adds Google Mobile Ads mediation adapters
// for Unity Ads + Vungle (Liftoff) to the Android build.
//
// iOS-side mediation is handled separately via `expo-build-properties`
// in app.json (see the `extraPods` block under that plugin's config).
// Pods like `GoogleMobileAdsMediationUnity` and
// `GoogleMobileAdsMediationVungle` are declarative, so they don't need
// a custom plugin.
//
// Android-side mediation isn't covered by `expo-build-properties` —
// adding `implementation` lines to `android/app/build.gradle` requires
// a `withAppBuildGradle` mod. That's what this plugin does.
//
// Versions are pinned but should be checked against Google's published
// AdMob mediation compatibility matrix when bumping:
//   https://developers.google.com/admob/android/mediation
// The compat matrix lists each adapter version against the underlying
// network SDK version — they have to move in lockstep, otherwise the
// adapter fails to initialise at runtime and that network's demand
// silently drops out of the waterfall.

const { withAppBuildGradle } = require("@expo/config-plugins");

// Single source of truth for the mediation adapters we're including.
// Each entry is one Maven coordinate the build needs to download.
// Adding a new partner = append an entry; removing one = drop it.
//
// The marker comment that the plugin injects above the implementation
// lines is what makes the mod idempotent — we look for the marker on
// re-runs to know whether we've already injected, so prebuild won't
// accumulate duplicates across multiple builds.
const ADAPTERS = [
  // Unity Ads — Unity's network SDK + Google's mediation adapter.
  // The SDK and adapter share their major.minor; the adapter's
  // patch suffix (.0 here) is Google's iteration number for that
  // SDK version.
  "com.unity3d.ads:unity-ads:4.12.5",
  "com.google.ads.mediation:unity:4.12.5.0",

  // Vungle / Liftoff — Liftoff's underlying SDK is pulled in
  // transitively by the mediation adapter, so we only need the
  // adapter line. (Same pattern is used by AppLovin if you ever
  // add it; not all adapters auto-pull the underlying SDK so check
  // the docs per-network when adding.)
  //
  // Adapter version tracks Vungle's SDK version with a `.0` suffix
  // (Google's iteration counter). NOTE: Google's Android adapter
  // release cadence lags Vungle's iOS Pod version — a Vungle Pod
  // 7.7.3 doesn't necessarily mean a `vungle:7.7.3.0` Android
  // adapter exists on Maven. We pin 7.4.2.0 because it's the
  // most recent version verified to resolve from
  // dl.google.com/dl/android/maven2/. When bumping, check
  // https://developers.google.com/admob/android/mediation/vungle
  // for the highest published Android adapter version BEFORE
  // changing this string — picking a non-existent version fails
  // gradlew at dependency resolution.
  "com.google.ads.mediation:vungle:7.4.2.0",
];

const MARKER = "// expo-config-plugin: withAdMobMediation (do not remove)";

function withAndroidMediationDeps(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      console.warn(
        "[withAdMobMediation] android/app/build.gradle is not in Groovy; skipping injection.",
      );
      return cfg;
    }

    // Idempotency — bail if we've already injected. The marker
    // comment is unique enough that we can match it textually
    // without worrying about false positives in user code.
    if (cfg.modResults.contents.includes(MARKER)) {
      return cfg;
    }

    const injection = [
      "",
      `    ${MARKER}`,
      ...ADAPTERS.map((coord) => `    implementation "${coord}"`),
    ].join("\n");

    // Insert just before the closing `}` of the `dependencies { ... }`
    // block. The regex matches the LAST `}` in that block by
    // anchoring to the dependencies opener and looking for its
    // matching close. Groovy blocks are nested freely inside
    // `dependencies`, so a naive "first }" would inject in the
    // wrong place; this anchors to the depth-0 close.
    //
    // The replacement keeps the original indentation by re-emitting
    // the trailing `}` on its own line.
    const before = cfg.modResults.contents;
    const updated = before.replace(
      /(dependencies\s*\{[\s\S]*?)\n\}/m,
      `$1${injection}\n}`,
    );

    if (updated === before) {
      console.warn(
        "[withAdMobMediation] couldn't find the dependencies { } block in app/build.gradle to inject mediation adapters. Build will succeed but Unity / Vungle ads won't serve.",
      );
      return cfg;
    }

    cfg.modResults.contents = updated;
    return cfg;
  });
}

module.exports = function withAdMobMediation(config) {
  return withAndroidMediationDeps(config);
};
