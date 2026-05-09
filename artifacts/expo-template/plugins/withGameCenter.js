// Expo config plugin — enables iOS Game Center.
//
// Game Center needs three touches at the Xcode level:
//
//   1. The `com.apple.developer.game-center` entitlement, set to
//      true. Without it, `GKLocalPlayer.local.authenticateHandler`
//      returns "no Game Center account" on every device.
//
//   2. The `GKGameCenterEnabled` Info.plist key (some older tooling
//      still checks this — harmless on modern iOS).
//
//   3. The App ID (in the Apple Developer portal) must have Game
//      Center turned on as a capability. That's a dashboard step,
//      not code. App Store Connect → your app → Services → Game
//      Center.
//
// Leaderboards + achievements themselves are declared server-side in
// App Store Connect; the app just references them by ID. See
// `constants/gameCenter.ts` for the ID naming convention.

const {
  withEntitlementsPlist,
  withInfoPlist,
} = require("@expo/config-plugins");

function withGameCenterEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    cfg.modResults["com.apple.developer.game-center"] = true;
    return cfg;
  });
}

function withGameCenterInfoPlist(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.GKGameCenterEnabled = true;
    return cfg;
  });
}

module.exports = function withGameCenter(config) {
  let next = config;
  next = withGameCenterEntitlement(next);
  next = withGameCenterInfoPlist(next);
  return next;
};
