// Leaderboard ID registry — platform-split because Apple Game Center
// and Google Play Games use different ID conventions:
//
//   • iOS (GameKit) uses your reverse-DNS bundle id with a
//     `.leaderboard.<shortname>` suffix. The string you type into
//     App Store Connect → Game Center → Leaderboards must match the
//     string the app submits exactly; mismatched IDs silently drop.
//
//   • Android (Play Games) uses opaque IDs the Play Console
//     auto-generates when you create each leaderboard
//     (`Game services → Leaderboards → Add leaderboard`). The IDs
//     look like `CgkI...AAAAA`. Same strict-match rule as iOS.
//
// To onboard a new theme:
//   1. Create the iOS leaderboard in App Store Connect with the
//      reverse-DNS string from `iosLeaderboardIdForWorld(worldId)`.
//   2. Create the Android leaderboard in Play Games Console; paste
//      the generated ID into ANDROID_LEADERBOARD_IDS_BY_WORLD below.
//   3. (Optional) overall leaderboards too — set both
//      OVERALL_LEADERBOARD_ID_IOS and ..._ANDROID.

import { Platform } from "react-native";

import { WORLDS } from "@/constants/worlds";

const IOS_LEADERBOARD_PREFIX = "REPLACE_WITH_BUNDLE_PREFIX.app.leaderboard";

/** Build the iOS GameKit leaderboard ID for a world. */
export function iosLeaderboardIdForWorld(worldId: string): string {
  return `${IOS_LEADERBOARD_PREFIX}.${worldId}`;
}

/** Android Play Games leaderboard IDs per world. The Console
 *  auto-generates these when you create each leaderboard; paste
 *  them in here. Until populated, Android submissions for that
 *  world are silently dropped (the JS layer skips empty strings).
 *  Add entries as you create leaderboards in Play Games Console. */
export const ANDROID_LEADERBOARD_IDS_BY_WORLD: Readonly<Record<string, string>> = {
  // worldId: "CgkI...AAAAA",
};

/** Resolve the active platform's leaderboard ID for a world.
 *  Returns an empty string when the Android ID hasn't been set yet
 *  (the submitScore wrapper in `lib/gameCenter.ts` filters those
 *  out before calling the native bridge). */
export function leaderboardIdForWorld(worldId: string): string {
  if (Platform.OS === "android") {
    return ANDROID_LEADERBOARD_IDS_BY_WORLD[worldId] ?? "";
  }
  if (Platform.OS === "ios") {
    return iosLeaderboardIdForWorld(worldId);
  }
  return "";
}

/** Every iOS leaderboard ID the app expects to exist in App Store
 *  Connect. Handy for the onboarding checklist — paste these into
 *  the ASC UI. */
export const ALL_IOS_LEADERBOARD_IDS: readonly string[] = WORLDS.map((w) =>
  iosLeaderboardIdForWorld(w.id),
);

/** Combined "overall best" leaderboards — submitted alongside the
 *  per-world IDs so players can also see a global ranking. iOS uses
 *  the same reverse-DNS convention; Android needs the Console-
 *  generated ID pasted in once you've created the leaderboard. */
export const OVERALL_LEADERBOARD_ID_IOS = `${IOS_LEADERBOARD_PREFIX}.overall`;
export const OVERALL_LEADERBOARD_ID_ANDROID = "";

/** Resolve the active platform's "overall" leaderboard ID. Empty
 *  string on Android until you populate OVERALL_LEADERBOARD_ID_ANDROID. */
export function overallLeaderboardId(): string {
  if (Platform.OS === "android") return OVERALL_LEADERBOARD_ID_ANDROID;
  if (Platform.OS === "ios") return OVERALL_LEADERBOARD_ID_IOS;
  return "";
}

/** Source-compat alias: existing call sites import the iOS-only
 *  constant under this name. Re-exported as the iOS string so
 *  nothing breaks on the iOS path; Android call sites should use
 *  `overallLeaderboardId()` (platform-aware) instead. */
export const OVERALL_LEADERBOARD_ID = OVERALL_LEADERBOARD_ID_IOS;
