// Expo config plugin — wires Google Play Games Services into the
// Android manifest. Two pieces:
//
//   1. The `com.google.android.gms.games.APP_ID` <meta-data> tag
//      under <application>. PGS reads this on first init; without
//      it the SDK refuses to dispatch leaderboards / sign-in. The
//      App ID itself is a numeric string from the Play Console
//      under "Game services → Configuration".
//
//   2. A `play_games_app_id` string resource in `strings.xml`. The
//      manifest meta-data references it as `@string/...` so Play
//      Console's APK validation can read the value statically.
//
// Usage (in app.json under `plugins`):
//
//   ["./plugins/withPlayGamesServices", { "playGamesAppId": "1234567890" }]
//
// Android-only — iOS path uses GameKit via `expo-game-center`.
const {
  withAndroidManifest,
  withStringsXml,
  AndroidConfig,
} = require("@expo/config-plugins");

const META_KEY = "com.google.android.gms.games.APP_ID";
const STRING_KEY = "play_games_app_id";

function withPlayGamesAppIdString(config, playGamesAppId) {
  return withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: STRING_KEY, translatable: "false" },
          _: playGamesAppId,
        },
      ],
      cfg.modResults,
    );
    return cfg;
  });
}

function withPlayGamesMetaData(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults,
    );

    application["meta-data"] = application["meta-data"] || [];

    // Replace any existing entry so re-running the prebuild doesn't
    // accumulate duplicate <meta-data> tags. Match by `android:name`
    // since that's the unique identity attribute.
    const filtered = application["meta-data"].filter(
      (entry) => entry.$["android:name"] !== META_KEY,
    );
    filtered.push({
      $: {
        "android:name": META_KEY,
        "android:value": `@string/${STRING_KEY}`,
      },
    });
    application["meta-data"] = filtered;

    return cfg;
  });
}

module.exports = function withPlayGamesServices(config, props) {
  const playGamesAppId = props && props.playGamesAppId;

  if (!playGamesAppId) {
    // Don't fail the prebuild — the dev may be iterating before
    // they've created the Play Games entry. Native side gracefully
    // handles missing config by failing the auth call with a
    // meaningful error message.
    console.warn(
      "[withPlayGamesServices] No playGamesAppId provided; PGS will fail at runtime until app.json is updated.",
    );
    return config;
  }

  config = withPlayGamesAppIdString(config, playGamesAppId);
  config = withPlayGamesMetaData(config);
  return config;
};
