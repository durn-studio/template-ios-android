// High-level leaderboard wrapper used by gameplay. Despite the
// historical "gameCenter" filename, this module is now a
// platform-dispatch layer that picks the right native bridge:
//
//   • iOS     — `expo-game-center` (custom local module, Apple GameKit)
//   • Android — `expo-play-games-services` (custom local module, Google Play Games v2)
//   • Else    — Expo Go / web → no-op stubs
//
// Call sites (`app/_layout.tsx`, leaderboard screen, end-of-run
// score submission) are unchanged: they still call
// `authenticatePlayer`, `submitScore`, `presentLeaderboard`. The
// dispatch picks the right native module behind the scenes.
//
// Apple reference:
//   https://developer.apple.com/documentation/gamekit/initializing-and-configuring-game-center
// Google reference:
//   https://developers.google.com/games/services/android/quickstart

import Constants from "expo-constants";
import { Platform } from "react-native";

// Dynamic requires so Expo Go / web builds (where neither native
// module is linked) don't blow up on import. Same pattern as
// lib/ads.ts. Each bridge has the same TS surface — see the wrappers
// in modules/expo-game-center/src/index.ts and
// modules/expo-play-games-services/src/index.ts.
type LeaderboardBridge = {
  isGameCenterAvailable?: () => boolean;
  isPlayGamesAvailable?: () => boolean;
  authenticate: () => Promise<{
    authenticated: boolean;
    displayName?: string;
    alias?: string;
    gamePlayerID?: string;
  }>;
  submitScore: (score: number, leaderboardIDs: string[]) => Promise<boolean>;
  presentLeaderboard: (leaderboardID?: string | null) => Promise<boolean>;
};

let Bridge: LeaderboardBridge | null = null;
try {
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Bridge = require("expo-game-center") as LeaderboardBridge;
  } else if (Platform.OS === "android") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Bridge = require("expo-play-games-services") as LeaderboardBridge;
  }
} catch {
  Bridge = null;
}

const inExpoGo = Constants.appOwnership === "expo";

export interface GameCenterPlayer {
  authenticated: boolean;
  displayName?: string;
  alias?: string;
  gamePlayerID?: string;
}

let authPromise: Promise<GameCenterPlayer> | null = null;
let cachedPlayer: GameCenterPlayer = { authenticated: false };

/** Returns true when the platform's leaderboard service is reachable
 *  (iOS GameKit or Android Play Games), false in Expo Go / web /
 *  unsupported platforms. Name kept as `isGameCenterReady` for
 *  source-compat with existing call sites. */
export function isGameCenterReady(): boolean {
  if (inExpoGo || !Bridge) return false;
  if (Platform.OS === "ios") {
    return typeof Bridge.isGameCenterAvailable === "function"
      ? Bridge.isGameCenterAvailable()
      : false;
  }
  if (Platform.OS === "android") {
    return typeof Bridge.isPlayGamesAvailable === "function"
      ? Bridge.isPlayGamesAvailable()
      : false;
  }
  return false;
}

/** Idempotent: first call runs the platform-specific auth flow;
 *  subsequent calls return the cached result. Safe to call from any
 *  screen without worrying about double prompts.
 *
 *  iOS GameKit shows its own sign-in sheet if the player isn't
 *  already signed in system-wide. Android PGS v2 silently uses the
 *  cached Play Games identity, or surfaces a one-tap consent prompt
 *  if the user hasn't authorised the game yet. Either way, calling
 *  this once at app launch is the right pattern. */
export async function authenticatePlayer(): Promise<GameCenterPlayer> {
  if (!isGameCenterReady() || !Bridge) return cachedPlayer;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    try {
      const res = await Bridge!.authenticate();
      cachedPlayer = {
        authenticated: !!res.authenticated,
        displayName: res.displayName,
        alias: res.alias,
        gamePlayerID: res.gamePlayerID,
      };
      return cachedPlayer;
    } catch {
      cachedPlayer = { authenticated: false };
      return cachedPlayer;
    }
  })();
  return authPromise;
}

/** Snapshot of the last authenticate() result. Components that want
 *  to hide leaderboard UI when the player hasn't signed in should
 *  read this — safer than calling `authenticate()` on every render. */
export function getCachedPlayer(): GameCenterPlayer {
  return cachedPlayer;
}

/** Submit a score to one or more leaderboards. Fire-and-forget: the
 *  return value is only useful for telemetry. Both bridges silently
 *  drop submissions when the player isn't signed in. */
export async function submitScore(
  score: number,
  leaderboardIDs: string[],
): Promise<boolean> {
  if (!isGameCenterReady() || !Bridge) return false;
  if (!leaderboardIDs.length) return false;
  try {
    return await Bridge.submitScore(score, leaderboardIDs);
  } catch {
    return false;
  }
}

/** Present the platform's built-in leaderboard UI. Pass a leaderboard
 *  id to open that specific board, or omit for the top-level
 *  leaderboards picker. iOS shows GKGameCenterViewController;
 *  Android starts the Play Games leaderboard intent. Resolves `true`
 *  when the system UI was successfully presented. */
export async function presentLeaderboard(
  leaderboardID?: string | null,
): Promise<boolean> {
  if (!isGameCenterReady() || !Bridge) return false;
  try {
    return await Bridge.presentLeaderboard(leaderboardID ?? null);
  } catch {
    return false;
  }
}
