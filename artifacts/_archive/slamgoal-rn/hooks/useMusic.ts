import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useState } from "react";

// Background-music singleton. Mirrors the shape of useSfx so the
// settings UI can treat both audio channels symmetrically:
//   • mute flag persisted under `fc_music_muted`
//   • volume (0..1) persisted under `fc_music_volume`
//
// Implementation notes:
//   • One AudioPlayer at a time, looping. Track is shuffled once per
//     app session so consecutive launches don't always start with the
//     same loop.
//   • Expo-Go-safe — `expo-audio` is a native module; the dynamic
//     require is wrapped in try/catch so a missing native binary
//     downgrades to a silent no-op rather than crashing import.
//   • Module-level atoms + listener set so multiple consumers stay in
//     sync without prop-drilling through context.

const MUSIC_MUTED_KEY = "fc_music_muted";
const MUSIC_VOLUME_KEY = "fc_music_volume";
const DEFAULT_VOLUME = 0.4; // music sits below SFX by default

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

const TRACKS: number[] = [
  require("@/assets/cafedeseda.mp3"),
  require("@/assets/clavcatwalk.mp3"),
  require("@/assets/sugartiledrift.mp3"),
  require("@/assets/turntablemeadow.mp3"),
];

// Pick a track index once per session — shuffling per-mount would
// restart the song every time the settings sheet opens.
const sessionTrack = TRACKS[Math.floor(Math.random() * TRACKS.length)];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let player: any = null;
let started = false;

let mutedAtom = false;
let volumeAtom = DEFAULT_VOLUME;
const mutedListeners = new Set<(v: boolean) => void>();
const volumeListeners = new Set<(v: number) => void>();

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function applyPlaybackState(): void {
  if (!player) return;
  try {
    // Effective volume is 0 when muted so we can keep the player
    // running and resume instantly when the user un-mutes.
    player.volume = mutedAtom ? 0 : volumeAtom;
  } catch {
    // ignore — non-fatal
  }
}

function ensurePlayer(): void {
  if (!isNativeAvailable) return;
  if (player) return;
  try {
    player = ExpoAudio.createAudioPlayer(sessionTrack);
    player.loop = true;
    applyPlaybackState();
  } catch {
    player = null;
  }
}

function startIfNeeded(): void {
  if (started) return;
  ensurePlayer();
  if (!player) return;
  try {
    player.play();
    started = true;
  } catch {
    // ignore — try again next mount
  }
}

async function hydrate(): Promise<void> {
  try {
    const [mRaw, vRaw] = await Promise.all([
      AsyncStorage.getItem(MUSIC_MUTED_KEY),
      AsyncStorage.getItem(MUSIC_VOLUME_KEY),
    ]);
    mutedAtom = mRaw === "1";
    if (vRaw != null) {
      const parsed = Number.parseFloat(vRaw);
      if (Number.isFinite(parsed)) volumeAtom = clamp01(parsed);
    }
  } catch {
    // defaults are fine
  }
  applyPlaybackState();
  mutedListeners.forEach((l) => l(mutedAtom));
  volumeListeners.forEach((l) => l(volumeAtom));
}
void hydrate();

export async function setMusicMuted(muted: boolean): Promise<void> {
  mutedAtom = muted;
  applyPlaybackState();
  mutedListeners.forEach((l) => l(muted));
  try {
    await AsyncStorage.setItem(MUSIC_MUTED_KEY, muted ? "1" : "0");
  } catch {
    // noop
  }
}

export async function setMusicVolume(volume: number): Promise<void> {
  const v = clamp01(volume);
  volumeAtom = v;
  applyPlaybackState();
  volumeListeners.forEach((l) => l(v));
  try {
    await AsyncStorage.setItem(MUSIC_VOLUME_KEY, String(v));
  } catch {
    // noop
  }
}

/**
 * Mount this once near the app root to start the background music.
 * It's safe to mount it from multiple places — `started` guards
 * against double-starting the same player.
 */
export function useMusicPlayback(): void {
  useEffect(() => {
    startIfNeeded();
  }, []);
}

/**
 * Read/write hook for the settings UI. Returns the current mute and
 * volume values plus setters that persist + broadcast.
 */
export function useMusic() {
  const [muted, setMutedState] = useState<boolean>(mutedAtom);
  const [volume, setVolumeState] = useState<number>(volumeAtom);

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

  const setMuted = useCallback((v: boolean) => {
    void setMusicMuted(v);
  }, []);
  const setVolume = useCallback((v: number) => {
    void setMusicVolume(v);
  }, []);

  return useMemo(
    () => ({ muted, volume, setMuted, setVolume }),
    [muted, volume, setMuted, setVolume],
  );
}
