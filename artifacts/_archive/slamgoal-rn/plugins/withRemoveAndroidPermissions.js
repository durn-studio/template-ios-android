// Expo config plugin — removes Android permissions that get
// auto-injected by native libraries we don't actually need.
//
// expo-audio bundles both playback and recording APIs, and its
// AndroidManifest.xml declares RECORD_AUDIO unconditionally. Even
// though we only call the playback path (see hooks/useSfx.ts and
// hooks/useMusic.ts), Android's manifest merger pulls the permission
// into our app, and Google Play rejects the upload with:
//
//   "Your APK or Android App Bundle is using permissions that
//    require a privacy policy: (android.permission.RECORD_AUDIO)"
//
// Fixing it via app.json's `android.permissions` array doesn't work
// — that field is additive, not exclusive, so library-declared
// permissions still slip through.
//
// The correct manifest-merger override is `tools:node="remove"` on
// the unwanted <uses-permission>. This plugin walks the parsed
// AndroidManifest, ensures the `tools:` XML namespace is declared
// on the <manifest> root, and tags each requested permission with
// the remove directive.
//
// Usage (app.json):
//   ["./plugins/withRemoveAndroidPermissions",
//    ["android.permission.RECORD_AUDIO"]]

const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withRemoveAndroidPermissions(
  config,
  permissionsToRemove,
) {
  const list = Array.isArray(permissionsToRemove)
    ? permissionsToRemove
    : [];

  if (!list.length) return config;

  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // The manifest merger directives live in the `tools` namespace.
    // Expo's prebuilt manifest doesn't always declare it on the
    // root, so add it idempotently.
    manifest.$ = manifest.$ || {};
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    manifest["uses-permission"] = manifest["uses-permission"] || [];

    for (const permName of list) {
      const existing = manifest["uses-permission"].find(
        (p) => p?.$?.["android:name"] === permName,
      );
      if (existing) {
        existing.$["tools:node"] = "remove";
      } else {
        manifest["uses-permission"].push({
          $: {
            "android:name": permName,
            "tools:node": "remove",
          },
        });
      }
    }

    return cfg;
  });
};
