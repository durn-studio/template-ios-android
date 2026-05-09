// Player sprite registry — Slam Goal Phase 1 stub.
//
// The Bubble Masters merge game shipped per-world player sprites
// here (one PNG per tier per theme). Slam Goal will populate this
// with footballer sprites in Phase 4-5. Until then, this exposes
// the type surface and an empty registry so downstream consumers
// (anything that called `getWorldImages(...)`) compile.

// Metro turns `require("./image.png")` into a numeric asset-registry
// ID at runtime, but `typeof require` resolves to a signature whose
// return type narrows to `unknown` under strict TS. Export this
// permissive alias so every consumer shares a single type and we
// don't need per-callsite casts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImageSource = any;

export const WORLD_IMAGES: Readonly<Record<string, ImageSource[]>> = {};

export function getWorldImages(worldId: string): ImageSource[] {
  return WORLD_IMAGES[worldId] ?? [];
}
