// TypeScript wrapper for the local `expo-icloud-kv` native module.
// iOS-only; everything else (Android, web, Expo Go without a dev
// build) returns safe no-ops so callers can use the helpers
// unconditionally and get a local-only experience.

import { NativeModule, requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

declare class ExpoICloudKVNative extends NativeModule {
  isAvailable(): boolean;
  getNumber(key: string): Promise<number | null>;
  setNumber(key: string, value: number): Promise<boolean>;
}

const Native = requireOptionalNativeModule<ExpoICloudKVNative>(
  "ExpoICloudKV",
);

export function isICloudKVAvailable(): boolean {
  if (Platform.OS !== "ios") return false;
  return !!Native;
}

export async function getICloudNumber(
  key: string,
): Promise<number | null> {
  if (!Native) return null;
  return Native.getNumber(key);
}

export async function setICloudNumber(
  key: string,
  value: number,
): Promise<boolean> {
  if (!Native) return false;
  return Native.setNumber(key, value);
}
