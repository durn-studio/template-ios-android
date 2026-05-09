import { z } from "zod";

import {
  addBody,
  addBoundary,
  addEdge,
  type World,
  type Body,
} from "@/lib/physics";
import { getMaterialById } from "@/constants/materials";

// Level loader — parses a JSON blob into a populated planck world,
// validates the shape with Zod (so a typo in a hand-authored level
// surfaces as a clear error rather than an undefined-deref at
// runtime), and returns a level handle the game screen can drive
// the slingshot + scoring against.

const Vec2Schema = z.object({ x: z.number(), y: z.number() });

const RectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const BlockSchema = z.discriminatedUnion("shape", [
  z.object({
    shape: z.literal("box"),
    material: z.string(),
    position: Vec2Schema,
    halfW: z.number().positive(),
    halfH: z.number().positive(),
    angle: z.number().optional().default(0),
    type: z
      .enum(["dynamic", "static", "kinematic"])
      .optional()
      .default("dynamic"),
  }),
  z.object({
    shape: z.literal("circle"),
    material: z.string(),
    position: Vec2Schema,
    radius: z.number().positive(),
    type: z
      .enum(["dynamic", "static", "kinematic"])
      .optional()
      .default("dynamic"),
  }),
]);

export const LevelDataSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  name: z.string(),
  /** Playfield width in meters. */
  width: z.number().positive(),
  /** Playfield height in meters. */
  height: z.number().positive(),
  /** Slingshot anchor (where the footballer is held before launch). */
  slingshot: Vec2Schema,
  /** Goal AABB. Footballer scores when its body centre crosses the
   *  rectangle, regardless of remaining momentum. */
  goal: RectSchema,
  /** Bodies populated when the level loads. Order doesn't matter —
   *  Box2D handles solver order internally. */
  blocks: z.array(BlockSchema),
  /** Score thresholds for 1 / 2 / 3-star clears. The "Cleared the
   *  level at all" condition is independent — to clear, the
   *  footballer must enter the goal AABB; star count then maps off
   *  destruction score. */
  stars: z.object({
    one: z.number().nonnegative(),
    two: z.number().nonnegative(),
    three: z.number().nonnegative(),
  }),
  /** Maximum footballers the player can launch per attempt. Running
   *  out without scoring in the goal = level failed. */
  shotsAllowed: z.number().int().positive(),
});

export type LevelData = z.infer<typeof LevelDataSchema>;
export type BlockSpec = z.infer<typeof BlockSchema>;

export interface LoadedLevel {
  data: LevelData;
  /** Maps body refs to the spawned material id, so the contact
   *  listener can score destruction + the renderer can recolour
   *  damaged blocks. Bodies created from BLOCKS only — slingshot
   *  ammo and edges aren't tracked here. */
  blockBodies: Map<Body, { materialId: string; hp: number }>;
}

/** Validate + populate. Throws ZodError if the data doesn't match
 *  the schema; caller should surface as a load-failed UI rather
 *  than crashing the app. */
export function loadLevel(world: World, raw: unknown): LoadedLevel {
  const data = LevelDataSchema.parse(raw);

  // Outer playfield walls so bodies don't fall off the world. The
  // goal-side wall is split: floor + ceiling extend the full width,
  // but the right wall only goes from the top down to the goal's
  // top edge, leaving a gap so the football can enter the goal.
  // Same on the left for the slingshot's "ammo" anchor — closed.
  addEdge(
    world,
    { x: 0, y: data.height },
    { x: data.width, y: data.height },
  ); // floor
  addEdge(world, { x: 0, y: 0 }, { x: data.width, y: 0 }); // ceiling
  addEdge(world, { x: 0, y: 0 }, { x: 0, y: data.height }); // left wall

  // Right wall — split around the goal opening.
  if (data.goal.x + data.goal.width >= data.width - 0.01) {
    // Goal is flush against the right edge. Open the gap.
    addEdge(world, { x: data.width, y: 0 }, { x: data.width, y: data.goal.y });
    addEdge(
      world,
      { x: data.width, y: data.goal.y + data.goal.height },
      { x: data.width, y: data.height },
    );
  } else {
    // Goal sits inside the playfield — full right wall.
    addEdge(world, { x: data.width, y: 0 }, { x: data.width, y: data.height });
  }

  const blockBodies = new Map<Body, { materialId: string; hp: number }>();

  for (const block of data.blocks) {
    const mat = getMaterialById(block.material);
    if (!mat) {
      // Skip unknown material rather than crash — in playtesting we
      // want a half-broken level to be obvious, not silent.
      console.warn(
        `[levelLoader] Unknown material "${block.material}" in level ${data.id}; skipping block`,
      );
      continue;
    }
    let body: Body;
    if (block.shape === "box") {
      body = addBody(world, {
        shape: "box",
        position: block.position,
        halfW: block.halfW,
        halfH: block.halfH,
        angle: block.angle,
        type: block.type,
        density: mat.density,
        friction: mat.friction,
        restitution: mat.restitution,
        color: mat.color,
        id: mat.id,
      });
    } else {
      body = addBody(world, {
        shape: "circle",
        position: block.position,
        radius: block.radius,
        type: block.type,
        density: mat.density,
        friction: mat.friction,
        restitution: mat.restitution,
        color: mat.color,
        id: mat.id,
      });
    }
    blockBodies.set(body, { materialId: mat.id, hp: mat.hp });
  }

  return { data, blockBodies };
}

/** Map raw destruction-points score to a 0-3 star rating per the
 *  level's thresholds. 0 means the level was cleared (football
 *  reached the goal) but score was below the 1-star threshold —
 *  unusual but possible. The game-over screen treats 0 as "cleared,
 *  retry to earn stars". */
export function starsForScore(level: LevelData, score: number): 0 | 1 | 2 | 3 {
  if (score >= level.stars.three) return 3;
  if (score >= level.stars.two) return 2;
  if (score >= level.stars.one) return 1;
  return 0;
}

// Phase 3 ships three hand-authored placeholder levels under
// `assets/levels/world-1/`. The catalogue here keeps them resolvable
// by id so the level select on home can iterate and the game screen
// can load by route param.
//
// Phase 4-5 expands this to all 30 Street Pitch levels and adds
// per-world catalogues; for now the array is fine as a registry.
import level1 from "@/assets/levels/world-1/1.json";
import level2 from "@/assets/levels/world-1/2.json";
import level3 from "@/assets/levels/world-1/3.json";
import level4 from "@/assets/levels/world-1/4.json";
import level5 from "@/assets/levels/world-1/5.json";
import level6 from "@/assets/levels/world-1/6.json";
import level7 from "@/assets/levels/world-1/7.json";
import level8 from "@/assets/levels/world-1/8.json";
import level9 from "@/assets/levels/world-1/9.json";
import level10 from "@/assets/levels/world-1/10.json";
import level11 from "@/assets/levels/world-1/11.json";
import level12 from "@/assets/levels/world-1/12.json";

const LEVEL_REGISTRY: Readonly<Record<string, unknown>> = {
  "world1-level1": level1,
  "world1-level2": level2,
  "world1-level3": level3,
  "world1-level4": level4,
  "world1-level5": level5,
  "world1-level6": level6,
  "world1-level7": level7,
  "world1-level8": level8,
  "world1-level9": level9,
  "world1-level10": level10,
  "world1-level11": level11,
  "world1-level12": level12,
};

export const LEVEL_IDS = [
  "world1-level1",
  "world1-level2",
  "world1-level3",
  "world1-level4",
  "world1-level5",
  "world1-level6",
  "world1-level7",
  "world1-level8",
  "world1-level9",
  "world1-level10",
  "world1-level11",
  "world1-level12",
] as const;

/** Boss level ids — UI marks these specially in the level select.
 *  Phase 5 has only one (the Street Pitch captain). */
export const BOSS_LEVEL_IDS: readonly string[] = ["world1-level12"];

export function getLevelData(id: string): LevelData | null {
  const raw = LEVEL_REGISTRY[id];
  if (!raw) return null;
  try {
    return LevelDataSchema.parse(raw);
  } catch (err) {
    console.error(`[levelLoader] Invalid level data for ${id}:`, err);
    return null;
  }
}
