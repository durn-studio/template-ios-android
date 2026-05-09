// Expo config plugin — enables the iCloud key-value store used for
// cross-device coin sync.
//
// Two touches at the iOS / Apple Developer level:
//
//   1. The `com.apple.developer.ubiquity-kvstore-identifier`
//      entitlement. The `$(TeamIdentifierPrefix)$(CFBundleIdentifier)`
//      token resolves at build time to something like
//      `AB1234WXYZ.<your-bundle-id>` — the default
//      implicit container, which is all we need for KV-only usage.
//
//   2. The App ID in the Apple Developer portal must have iCloud
//      turned on as a capability (Key-Value storage is sufficient;
//      no CloudKit container needed). EAS regenerates the
//      provisioning profile when entitlements change — but the
//      capability toggle itself is a one-time dashboard step.
//
// Android + web get no-ops (the JS wrapper returns null on unsupported
// platforms, so callers don't need to special-case).

const { withEntitlementsPlist } = require("@expo/config-plugins");

function withICloudKVEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["com.apple.developer.ubiquity-kvstore-identifier"] =
      "$(TeamIdentifierPrefix)$(CFBundleIdentifier)";
    return cfg;
  });
}

module.exports = function withICloudKV(config) {
  return withICloudKVEntitlement(config);
};
