// Worlds registry — Slam Goal Phase 1 stub.
//
// The Bubble Masters merge game shipped 24 themed worlds populated
// here. Slam Goal will define its own worlds in Phase 4-5 (Street
// Pitch / European Classic / Desert Cup / Frozen / Jungle / Galactic
// per the design doc) once the new gameplay is in place. Until then,
// this file exposes the type surface so downstream consumers
// (`constants/gameCenter.ts`, `app/leaderboard.tsx`, etc.) compile,
// but the WORLDS array is empty so no merge content leaks into the
// shell.

export interface WorldPlayer {
  name: string;
  ringColor: string;
}

export interface World {
  id: string;
  name: string;
  /** Human-readable subtitle for the world card. */
  flag?: string;
  /** ISO 3166-1 alpha-2 country code if the world has a national
   *  identity (e.g. "BR"). Optional. */
  countryCode?: string;
  primaryColor: string;
  secondaryColor: string;
  /** Optional roster of named characters per world. The Bubble
   *  Masters merge game used this for per-tier nicknames + ring
   *  colours; Slam Goal may use it for footballer line-ups. */
  players?: WorldPlayer[];
}

export interface WorldGroup {
  id: string;
  name: string;
  emoji: string;
  description: string;
  bgGradient: [string, string];
  unlocked: boolean;
  unlockCost?: number;
  worldIds: string[];
}

export const WORLDS: readonly World[] = [];

export const WORLD_GROUPS: readonly WorldGroup[] = [];

export function getWorldById(id: string): World | undefined {
  return WORLDS.find((w) => w.id === id);
}
