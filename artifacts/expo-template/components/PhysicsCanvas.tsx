import { Canvas, Circle, Group, Rect } from "@shopify/react-native-skia";
import React, { useEffect, useRef, useState, type ReactNode, type MutableRefObject } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  PHYSICS_STEP_DT,
  snapshotBodies,
  stepWorld,
  type BodySnapshot,
  type World,
} from "@/lib/physics";

// ── Particle system ─────────────────────────────────────────────────
// JS-managed (not planck) particles for destruction debris. Spawned
// by the game screen on body destruction; stepped + rendered by
// PhysicsCanvas alongside the physics bodies. Cheaper than planck
// bodies for short-lived effects (5-8 per destroy event, ~600 ms ttl).
export interface Particle {
  /** Position in world meters. */
  x: number;
  y: number;
  /** Velocity in m/s. */
  vx: number;
  vy: number;
  /** Radius in meters. */
  radius: number;
  /** Skia color. */
  color: string;
  /** Time-to-live in seconds; particle is removed when this hits 0. */
  ttl: number;
  /** Initial ttl, used to compute alpha fade. */
  ttlMax: number;
  rotation: number;
  angularVelocity: number;
}

/** Particle gravity should match the world's so debris falls
 *  consistently. Caller passes the world's gravityY in. */
function stepParticles(
  list: Particle[],
  dt: number,
  gravityY: number,
): Particle[] {
  const next: Particle[] = [];
  for (const p of list) {
    const ttl = p.ttl - dt;
    if (ttl <= 0) continue;
    next.push({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + gravityY * dt,
      // Slight air drag so they don't accelerate forever sideways.
      vx: p.vx * 0.985,
      rotation: p.rotation + p.angularVelocity * dt,
      ttl,
    });
  }
  return next;
}

// Slam Goal physics canvas — runs the physics loop on the JS thread,
// renders bodies via Skia. Phase 2 smoke-test surface; the slingshot
// + level renderer in Phase 3 will compose on top of this.
//
// Loop architecture:
//   • requestAnimationFrame on JS thread drives a fixed-timestep
//     accumulator. Each tick advances the planck world by 1/60 s,
//     up to 4 sub-steps to catch up after a long pause without a
//     spiral-of-death. (Box2D's docs: step the world at a fixed dt
//     to keep physics deterministic.)
//   • After each frame's physics work, we snapshot all body
//     positions/angles into React state. Skia re-renders from state.
//   • For the body counts we expect (≤ 100 dynamic), this hits 60fps
//     on mid-range Android. If profiling later shows the
//     setState-per-frame is the bottleneck, swap to reanimated
//     SharedValue + Skia's worklet props.
//
// FPS overlay: optional dev-only HUD so we can watch perf during
// playtests. Off in production.

interface Props {
  world: World;
  /** Pixels per physics meter. 100 px/m is a sensible default for
   *  phone screens — a 0.5 m circle renders as 50 px diameter. */
  pixelsPerMeter: number;
  /** Canvas dimensions in pixels. Caller passes the on-screen size
   *  (typically the parent's measured layout). */
  width: number;
  height: number;
  /** Show an FPS / body-count overlay in the top-left. Defaults to
   *  true in __DEV__, false in release. */
  showFpsOverlay?: boolean;
  /** Optional cap for the per-frame catch-up. Box2D's docs warn
   *  against unbounded sub-steps — 4 means we tolerate up to 4
   *  frames of stalled JS before letting the simulation drift. */
  maxStepsPerFrame?: number;
  /** Optional pixel offset applied to every body's render position.
   *  Used by the game screen to centre a level inside a wider canvas
   *  (letterbox) without nesting another container. Defaults to 0. */
  originX?: number;
  originY?: number;
  /** Called once per rendered frame, after all sub-steps for the
   *  frame have run and the snapshot has been taken. Use this to
   *  drain a destruction queue, check end-of-shot conditions, or
   *  fire game-state transitions that need the world in a stable
   *  state (planck rejects body destruction inside a step). */
  onAfterStep?: (world: World) => void;
  /** Skia children rendered behind the bodies — sky / parallax /
   *  buildings / slingshot rig / goal post. Static decoration that
   *  shouldn't move with physics. */
  backLayer?: ReactNode;
  /** Skia children rendered on top of the bodies — score flair,
   *  goal callout text, etc. Cleared each frame; caller manages. */
  frontLayer?: ReactNode;
  /** Mutable ref to a particle list. Caller pushes new particles in
   *  on destruction events; this component steps them every frame
   *  and renders them as small circles in the body layer. The ref
   *  is mutated in place rather than replaced so the caller can
   *  push without forcing a parent re-render. */
  particlesRef?: MutableRefObject<Particle[]>;
  /** Gravity Y for particle motion. Should match the world's gravity
   *  so debris falls consistently. */
  gravityY?: number;
}

export function PhysicsCanvas({
  world,
  pixelsPerMeter,
  width,
  height,
  showFpsOverlay = __DEV__,
  maxStepsPerFrame = 4,
  originX = 0,
  originY = 0,
  onAfterStep,
  backLayer,
  frontLayer,
  particlesRef,
  gravityY = 12,
}: Props) {
  const [bodies, setBodies] = useState<BodySnapshot[]>([]);
  const [particleSnapshot, setParticleSnapshot] = useState<Particle[]>([]);
  const [fps, setFps] = useState(0);

  const accRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const fpsBucketRef = useRef({ frames: 0, sinceMs: 0 });

  useEffect(() => {
    let raf = 0;
    let alive = true;

    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      const last = lastRef.current ?? now;
      const dtMs = now - last;
      lastRef.current = now;

      // Fixed-timestep accumulator — catch up by up to N sub-steps
      // if the previous frame stalled. Anything beyond the cap is
      // dropped on the floor (better than a death spiral).
      accRef.current += dtMs / 1000;
      let steps = 0;
      while (accRef.current >= PHYSICS_STEP_DT && steps < maxStepsPerFrame) {
        stepWorld(world, PHYSICS_STEP_DT);
        accRef.current -= PHYSICS_STEP_DT;
        steps += 1;
      }
      if (steps >= maxStepsPerFrame) {
        accRef.current = 0; // discard backlog after a long stall.
      }

      onAfterStep?.(world);
      setBodies(snapshotBodies(world));

      // Step particles using the same wall-clock dt as the physics
      // accumulator. Particles aren't fixed-timestep — they're
      // visual fluff and a couple of frames of jitter in their
      // motion is invisible.
      if (particlesRef && particlesRef.current.length > 0) {
        const newList = stepParticles(particlesRef.current, dtMs / 1000, gravityY);
        particlesRef.current = newList;
        setParticleSnapshot(newList);
      } else if (particleSnapshot.length > 0) {
        // Drained — clear the snapshot so we stop rendering them.
        setParticleSnapshot([]);
      }

      // FPS bucket — count frames over a 500 ms rolling window.
      const bucket = fpsBucketRef.current;
      bucket.frames += 1;
      bucket.sinceMs += dtMs;
      if (bucket.sinceMs >= 500) {
        setFps(Math.round((bucket.frames * 1000) / bucket.sinceMs));
        bucket.frames = 0;
        bucket.sinceMs = 0;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [world, maxStepsPerFrame, onAfterStep, particlesRef, gravityY, particleSnapshot.length]);

  return (
    <View style={[styles.root, { width, height }]}>
      <Canvas style={{ width, height }}>
        {backLayer}
        <Group>
          {bodies.map((b, i) => {
            const cx = b.x * pixelsPerMeter + originX;
            const cy = b.y * pixelsPerMeter + originY;
            // Skip the goal sensor — it's a physics-only body with
            // userData so contact detection works, but the visual is
            // drawn by GoalPost in the back layer.
            if (b.data.id === "goal_sensor") return null;
            if (b.data.shape === "circle") {
              const r = (b.data.radius ?? 0.5) * pixelsPerMeter;
              return <Circle key={i} cx={cx} cy={cy} r={r} color={b.data.color} />;
            }
            if (b.data.shape === "box") {
              const w = (b.data.halfW ?? 0.5) * 2 * pixelsPerMeter;
              const h = (b.data.halfH ?? 0.5) * 2 * pixelsPerMeter;
              const x = cx - w / 2;
              const y = cy - h / 2;
              return (
                <Group
                  key={i}
                  transform={[
                    { translateX: cx },
                    { translateY: cy },
                    { rotate: b.angle },
                    { translateX: -cx },
                    { translateY: -cy },
                  ]}
                >
                  <Rect x={x} y={y} width={w} height={h} color={b.data.color} />
                </Group>
              );
            }
            return null;
          })}
        </Group>
        {/* Particle layer — destruction debris. Rendered above
            bodies so debris flies in front of remaining structures. */}
        {particleSnapshot.length > 0 && (
          <Group>
            {particleSnapshot.map((p, i) => {
              const cx = p.x * pixelsPerMeter + originX;
              const cy = p.y * pixelsPerMeter + originY;
              const r = p.radius * pixelsPerMeter;
              return <Circle key={i} cx={cx} cy={cy} r={r} color={p.color} />;
            })}
          </Group>
        )}
        {frontLayer}
      </Canvas>

      {showFpsOverlay && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayText}>{fps} fps</Text>
          <Text style={styles.overlayText}>{bodies.length} bodies</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "transparent",
  },
  overlay: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overlayText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Menlo",
    fontWeight: "600",
  },
});
