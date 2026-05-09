// TypeScript wrapper for the local `expo-play-games-services` native
// module. Android only — the iOS path goes through `expo-game-center`
// (Apple GameKit). Web / Expo Go return safe no-ops so call sites can
// treat both platforms uniformly via `lib/gameCenter.ts`.
//
// Mirrors the GameCenterAuthResult shape so the consumer-side
// dispatch in `lib/gameCenter.ts` doesn't have to remap fields.

import { NativeModule, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export interface PlayGamesAuthResult {
  authenticated: boolean;
  displayName?: string;
  alias?: string;
  gamePlayerID?: string;
  teamPlayerID?: string;
  errorMessage?: string | null;
}

declare class ExpoPlayGamesServicesNative extends NativeModule {
  isAvailable(): boolean;
  authenticate(): Promise<PlayGamesAuthResult>;
  submitScore(score: number, leaderboardIDs: string[]): Promise<boolean>;
  presentLeaderboard(leaderboardID?: string | null): Promise<boolean>;
}

const Native = requireOptionalNativeModule<ExpoPlayGamesServicesNative>(
  "ExpoPlayGamesServices",
);

export function isPlayGamesAvailable(): boolean {
  if (Platform.OS !== "android") return false;
  return !!Native;
}

export async function authenticate(): Promise<PlayGamesAuthResult> {
  if (!Native) return { authenticated: false };
  return Native.authenticate();
}

export async function submitScore(
  score: number,
  leaderboardIDs: string[],
): Promise<boolean> {
  if (!Native) return false;
  if (!leaderboardIDs.length) return false;
  return Native.submitScore(score, leaderboardIDs);
}

export async function presentLeaderboard(
  leaderboardID?: string | null,
): Promise<boolean> {
  if (!Native) return false;
  return Native.presentLeaderboard(leaderboardID ?? null);
}
