import {
  Box,
  Circle as PlanckCircle,
  Edge,
  Vec2,
  World,
  type Body,
} from "planck";

// Slam Goal physics — thin wrapper around planck.js (Box2D port).
//
// planck operates in meters / kg / radians. The on-screen scale is
// applied at render time by `PhysicsCanvas`. Default world gravity
// matches Box2D's standard "Earth-like" Y-down setup.
//
// Why planck (JS) instead of native C++ Box2D:
//   • Runs in Expo Go for fast iteration — no EAS dev client
//     required to test physics changes.
//   • At Slam Goal's expected per-level body count (20-40 dynamic
//     bodies in Street Pitch, ~80 peak in boss levels), JS physics
//     hits 60fps comfortably on mid-range phones.
//   • Migration to native C++ Box2D in Phase 5+ is bounded — the
//     PhysicsCanvas + level loader + scoring layers can stay; only
//     this file gets swapped for a native bridge.
//
// If profiling reveals the JS step is the bottleneck (>4ms per
// frame on a Galaxy A14 during boss-level shipping containers),
// that's the cue to migrate. Until then, JS wins on iteration speed.

export type Vec = { x: number; y: number };

export interface BodyUserData {
  shape: "circle" | "box";
  /** Radius in meters for `circle`. */
  radius?: number;
  /** Half-width / half-height in meters for `box`. */
  halfW?: number;
  halfH?: number;
  /** Skia color string. Phase 4 will replace with sprite refs. */
  color: string;
  /** Optional caller-attached id for level-loader / scoring lookup. */
  id?: string;
}

export interface CircleSpec {
  shape: "circle";
  radius: number;
  position: Vec;
  type?: "dynamic" | "static" | "kinematic";
  density?: number;
  friction?: number;
  restitution?: number;
  color: string;
  id?: string;
}

export interface BoxSpec {
  shape: "box";
  halfW: number;
  halfH: number;
  position: Vec;
  angle?: number;
  type?: "dynamic" | "static" | "kinematic";
  density?: number;
  friction?: number;
  restitution?: number;
  color: string;
  id?: string;
}

export type BodySpec = CircleSpec | BoxSpec;

export interface WorldOpts {
  gravity?: Vec;
}

export function createWorld(opts: WorldOpts = {}): World {
  const g = opts.gravity ?? { x: 0, y: 10 };
  return new World({ gravity: Vec2(g.x, g.y) });
}

export function addBody(world: World, spec: BodySpec): Body {
  const body = world.createBody({
    type: spec.type ?? "dynamic",
    position: Vec2(spec.position.x, spec.position.y),
    angle: spec.shape === "box" ? (spec.angle ?? 0) : 0,
  });
  const fixtureOpts = {
    density: spec.density ?? 1,
    friction: spec.friction ?? 0.3,
    restitution: spec.restitution ?? 0.4,
  };
  if (spec.shape === "circle") {
    body.createFixture(new PlanckCircle(spec.radius), fixtureOpts);
    body.setUserData({
      shape: "circle",
      radius: spec.radius,
      color: spec.color,
      id: spec.id,
    } satisfies BodyUserData);
  } else {
    body.createFixture(new Box(spec.halfW, spec.halfH), fixtureOpts);
    body.setUserData({
      shape: "box",
      halfW: spec.halfW,
      halfH: spec.halfH,
      color: spec.color,
      id: spec.id,
    } satisfies BodyUserData);
  }
  return body;
}

/** Add a static thin edge (line) between two world points. Useful
 *  for level boundaries and goal-zone walls — zero-thickness so it
 *  doesn't affect mass distribution. */
export function addEdge(world: World, a: Vec, b: Vec): Body {
  const body = world.createBody({ type: "static" });
  body.createFixture(new Edge(Vec2(a.x, a.y), Vec2(b.x, b.y)), {
    friction: 0.3,
  });
  return body;
}

/** Convenience: 4 static edges around an axis-aligned rectangle.
 *  Used for the smoke test's playfield boundary. */
export function addBoundary(
  world: World,
  left: number,
  top: number,
  right: number,
  bottom: number,
): void {
  addEdge(world, { x: left, y: top }, { x: right, y: top });
  addEdge(world, { x: right, y: top }, { x: right, y: bottom });
  addEdge(world, { x: right, y: bottom }, { x: left, y: bottom });
  addEdge(world, { x: left, y: bottom }, { x: left, y: top });
}

/** Snapshot the world's dynamic + static bodies into render-ready
 *  rows (positions in meters; the canvas applies the px/m scale).
 *  Skips bodies without userData since we can't render them. */
export interface BodySnapshot {
  x: number;
  y: number;
  angle: number;
  data: BodyUserData;
}

export function snapshotBodies(world: World): BodySnapshot[] {
  const out: BodySnapshot[] = [];
  for (let b = world.getBodyList(); b; b = b.getNext()) {
    const data = b.getUserData() as BodyUserData | null;
    if (!data) continue;
    const p = b.getPosition();
    out.push({
      x: p.x,
      y: p.y,
      angle: b.getAngle(),
      data,
    });
  }
  return out;
}

/** Deterministic fixed-timestep stepper. Box2D's docs recommend
 *  velocity 8 / position 3 iterations as a sweet spot for game
 *  scenes; Slam Goal sticks with that until we measure otherwise. */
export const PHYSICS_STEP_DT = 1 / 60;
export const PHYSICS_VELOCITY_ITERS = 8;
export const PHYSICS_POSITION_ITERS = 3;

export function stepWorld(world: World, dt: number = PHYSICS_STEP_DT): void {
  world.step(dt, PHYSICS_VELOCITY_ITERS, PHYSICS_POSITION_ITERS);
}

export type { Body, World };
