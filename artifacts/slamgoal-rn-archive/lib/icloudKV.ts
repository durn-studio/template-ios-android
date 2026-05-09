// High-level iCloud key-value helper. Wraps the local `expo-icloud-kv`
// native module (NSUbiquitousKeyValueStore) with Expo-Go-safe guards:
// on Android / web / Expo Go where the native module isn't linked,
// every helper resolves to a safe default so callers don't branch.
//
// Mirrors the pattern used by `lib/gameCenter.ts` — dynamic require +
// try/catch so module resolution never blows up at import time.

import Constants from "expo-constants";
import { Platform } from "react-native";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let KV: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  KV = require("expo-icloud-kv");
} catch {
  KV = null;
}

const inExpoGo = Constants.appOwnership === "expo";

export function isICloudKVReady(): boolean {
  if (Platform.OS !== "ios") return false;
  if (inExpoGo || !KV) return false;
  return typeof KV.isICloudKVAvailable === "function"
    ? KV.isICloudKVAvailable()
    : false;
}

export async function getICloudNumber(
  key: string,
): Promise<number | null> {
  if (!isICloudKVReady() || !KV) return null;
  try {
    const v = await KV.getICloudNumber(key);
    return typeof v === "number" ? v : null;
  } catch {
    return null;
  }
}

export async function setICloudNumber(
  key: string,
  value: number,
): Promise<boolean> {
  if (!isICloudKVReady() || !KV) return false;
  try {
    return !!(await KV.setICloudNumber(key, value));
  } catch {
    return false;
  }
}
