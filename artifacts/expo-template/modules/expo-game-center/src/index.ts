// TypeScript wrapper for the local `expo-game-center` native module.
// Only iOS; Android + web return safe no-ops so the rest of the
// app can call these helpers unconditionally.

import { NativeModule, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

export interface GameCenterAuthResult {
  authenticated: boolean;
  displayName?: string;
  alias?: string;
  gamePlayerID?: string;
  teamPlayerID?: string;
  errorMessage?: string | null;
}

declare class ExpoGameCenterNative extends NativeModule {
  isAvailable(): boolean;
  authenticate(): Promise<GameCenterAuthResult>;
  submitScore(score: number, leaderboardIDs: string[]): Promise<boolean>;
  presentLeaderboard(leaderboardID?: string | null): Promise<boolean>;
}

const Native = requireOptionalNativeModule<ExpoGameCenterNative>(
  "ExpoGameCenter",
);

export function isGameCenterAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  return !!Native;
}

export async function authenticate(): Promise<GameCenterAuthResult> {
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
