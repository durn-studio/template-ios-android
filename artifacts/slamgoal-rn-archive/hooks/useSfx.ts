import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Typed catalogue of every sound effect we fire during gameplay.
// Keeping it a discriminated union makes call sites self-documenting
// — `sfx.play("bomb")` is greppable and typo-proof.
export type SfxName =
  | "drop"
  | "merge"
  | "mergeBig"
  | "bomb"
  | "shake"
  | "swap"
  | "magnet"
  | "goat"
  | "gameOver"
  | "shopPurchase";

const SFX_MUTED_KEY = "fc_sfx_muted";
const SFX_VOLUME_KEY = "fc_sfx_volume";
const DEFAULT_SFX_VOLUME = 0.8;

// Expo-Go-safe dynamic require. `expo-audio` is a native module; calls
// into it in Expo Go would throw at import time without this guard.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ExpoAudio: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ExpoAudio = require("expo-audio");
} catch {
  ExpoAudio = null;
}

const inExpoGo = Constants.appOwnership === "expo";
const isNativeAvailable = !inExpoGo && !!ExpoAudio;

// Configure the iOS / Android audio session so our SFX MIX with
// any other audio the user is already playing — Spotify, Apple
// Music, YouTube Music, podcast apps, etc. The default expo-audio
// session category interrupts existing playback the moment our
// first sound fires, which silenced the user's music for the rest
// of the session. `mixWithOthers` on iOS keeps both streams alive
// and lets the system mix them. Android lacks a true mix-with-
// others mode, so we use `duckOthers` — our SFX briefly lower the
// background music volume while the sound plays, then restore it.
// Net result: the player can listen to whatever they want and
// still hear the merge / drop / bomb feedback over the top.
//
// Runs once at module load; `setAudioModeAsync` is idempotent so
// re-runs (HMR, Fast Refresh) are harmless. `playsInSilentMode`
// stays false — game SFX should respect the device's silent
// switch, same as the prior behaviour.
if (isNativeAvailable && typeof ExpoAudio.setAudioModeAsync === "function") {
  void ExpoAudio.setAudioModeAsync({
    interruptionMode: "mixWithOthers",
    interruptionModeAndroid: "duckOthers",
    playsInSilentMode: false,
    shouldPlayInBackground: false,
    allowsRecording: false,
  }).catch(() => {
    // Audio session config is best-effort. Failure shouldn't break
    // SFX playback — worst case we fall back to the default session
    // category, which is what the app was using before this change.
  });
}

// Static require() of each MP3 so Metro bundles the assets. Keys match
// SfxName exactly; lookup is a single Record access at play() time.
const SFX_SOURCES: Record<SfxName, number> = {
  drop: require("@/assets/sfx/drop.mp3"),
  merge: require("@/assets/sfx/merge.mp3"),
  mergeBig: require("@/assets/sfx/mergeBig.mp3"),
  bomb: require("@/assets/sfx/bomb.mp3"),
  shake: require("@/assets/sfx/shake.mp3"),
  swap: require("@/assets/sfx/swap.mp3"),
  magnet: require("@/assets/sfx/magnet.mp3"),
  goat: require("@/assets/sfx/goat.mp3"),
  gameOver: require("@/assets/sfx/gameOver.mp3"),
  shopPurchase: require("@/assets/sfx/shopPurchase.mp3"),
};

// Module-level cache — shared across all hook instances so we don't
// re-allocate 10 AudioPlayer objects per render cycle. First call
// creates them; subsequent hook mounts reuse the same references.
// Never destroyed — SFX players are lightweight on modern iOS and
// the overhead is a one-time cost on boot.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerCache: Partial<Record<SfxName, any>> = {};

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function ensurePlayer(name: SfxName): unknown | null {
  if (!isNativeAvailable) return null;
  if (playerCache[name]) return playerCache[name];
  try {
    const p = ExpoAudio.createAudioPlayer(SFX_SOURCES[name]);
    p.volume = volumeAtom;
    playerCache[name] = p;
    return p;
  } catch {
    return null;
  }
}

function applyVolumeToCache(): void {
  for (const key in playerCache) {
    const p = playerCache[key as SfxName];
    if (!p) continue;
    try {
      p.volume = volumeAtom;
    } catch {
      // ignore — non-fatal
    }
  }
}

// Mute + volume state — persisted across sessions under `fc_sfx_muted`
// and `fc_sfx_volume`. Mute is independent of volume so users can
// silence a noisy moment without losing their preferred level.
let mutedAtom = false;
let volumeAtom = DEFAULT_SFX_VOLUME;
const mutedListeners = new Set<(v: boolean) => void>();
const volumeListeners = new Set<(v: number) => void>();

async function hydrate(): Promise<void> {
  try {
    const [mRaw, vRaw] = await Promise.all([
      AsyncStorage.getItem(SFX_MUTED_KEY),
      AsyncStorage.getItem(SFX_VOLUME_KEY),
    ]);
    mutedAtom = mRaw === "1";
    if (vRaw != null) {
      const parsed = Number.parseFloat(vRaw);
      if (Number.isFinite(parsed)) volumeAtom = clamp01(parsed);
    }
    applyVolumeToCache();
    mutedListeners.forEach((l) => l(mutedAtom));
    volumeListeners.forEach((l) => l(volumeAtom));
  } catch {
    // noop — defaults are fine.
  }
}
void hydrate();

/** Imperative setter used by the settings UI. Persists + broadcasts. */
export async function setSfxMuted(muted: boolean): Promise<void> {
  mutedAtom = muted;
  mutedListeners.forEach((l) => l(muted));
  try {
    await AsyncStorage.setItem(SFX_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // noop
  }
}

export async function setSfxVolume(volume: number): Promise<void> {
  const v = clamp01(volume);
  volumeAtom = v;
  applyVolumeToCache();
  volumeListeners.forEach((l) => l(v));
  try {
    await AsyncStorage.setItem(SFX_VOLUME_KEY, String(v));
  } catch {
    // noop
  }
}

/** Read-only snapshot of the mute flag. Use the hook's return value
 *  if you need React re-renders when it flips. */
export function isSfxMuted(): boolean {
  return mutedAtom;
}

export function useSfx() {
  const [muted, setMutedState] = useState<boolean>(mutedAtom);
  const [volume, setVolumeState] = useState<number>(volumeAtom);

  // Subscribe to module-level mute/volume broadcasts so every useSfx()
  // consumer re-renders together when the toggle or slider changes.
  useEffect(() => {
    const onMuted = (v: boolean) => setMutedState(v);
    const onVolume = (v: number) => setVolumeState(v);
    mutedListeners.add(onMuted);
    volumeListeners.add(onVolume);
    return () => {
      mutedListeners.delete(onMuted);
      volumeListeners.delete(onVolume);
    };
  }, []);

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Warm the player cache on first mount of the hook so the very
  // first drop/merge doesn't stall on file-load latency. Runs once
  // per app session — all subsequent useSfx() hooks reuse the cache.
  useEffect(() => {
    if (!isNativeAvailable) return;
    for (const name of Object.keys(SFX_SOURCES) as SfxName[]) {
      ensurePlayer(name);
    }
  }, []);

  const play = useCallback((name: SfxName) => {
    if (mutedRef.current) return;
    const player = ensurePlayer(name) as
      | { seekTo?: (s: number) => Promise<void> | void; play?: () => void }
      | null;
    if (!player) return;
    try {
      // Rewind then play so rapid-fire events (merge cascade) don't
      // just play once — each trigger gets the full SFX from the top.
      const sr = player.seekTo?.(0);
      // seekTo is async on some platforms; we don't await it, the
      // play() call right after resolves against whatever position
      // the player is at when it lands.
      if (sr && typeof (sr as Promise<void>).catch === "function") {
        (sr as Promise<void>).catch(() => {});
      }
      player.play?.();
    } catch {
      // Ad-hoc errors are non-fatal for SFX — never crash gameplay.
    }
  }, []);

  const setMuted = useCallback((v: boolean) => {
    void setSfxMuted(v);
  }, []);
  const setVolume = useCallback((v: number) => {
    void setSfxVolume(v);
  }, []);

  return useMemo(
    () => ({ play, muted, setMuted, volume, setVolume }),
    [play, muted, setMuted, volume, setVolume],
  );
}
