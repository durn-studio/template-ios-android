import type { ReactNode } from "react";

// Sprite registry — kept in its own module to break the otherwise-
// cyclic import graph (index.tsx imports the per-category sprite
// files for their side effects; those files import registerSprite
// from here). If everything lived in index.tsx, JS hoists the
// static imports and the sprite files run their registerSprite
// calls before the SPRITE_REGISTRY = {} statement has been
// evaluated, so the assignment crashes with "Cannot set property
// of undefined".

export interface SpriteOpts {
  /** Body centre in screen pixels (already includes the level
   *  letterbox offset). */
  cx: number;
  cy: number;
  /** Body angle in radians (planck convention). */
  angle: number;
  /** Body radius in pixels — only set for circular bodies. */
  radius?: number;
  /** Box half-width / half-height in pixels — only set for box
   *  bodies. */
  halfW?: number;
  halfH?: number;
  /** Fallback color from userData — used by sprite functions that
   *  want to keep the level-loader's colour scheme. */
  color?: string;
}

export type SpriteFn = (opts: SpriteOpts) => ReactNode;

const SPRITE_REGISTRY: Record<string, SpriteFn> = {};

export function registerSprite(ids: string | string[], fn: SpriteFn) {
  const list = Array.isArray(ids) ? ids : [ids];
  for (const id of list) {
    SPRITE_REGISTRY[id] = fn;
  }
}

export function getSprite(id: string | undefined): SpriteFn | undefined {
  if (!id) return undefined;
  return SPRITE_REGISTRY[id];
}
