import React, { useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";

// Slingshot input + trajectory preview overlay.
//
// Touch model (Angry-Birds-canonical):
//   • Anywhere on the canvas, touch-down to begin aiming.
//   • Drag: the launch vector points from current finger position
//     back to the anchor — i.e. drag down-left to launch up-right.
//   • Power scales linearly with drag distance, capped at MAX_PULL_M.
//   • Release: fire onLaunch(velocity); component clears its state.
//   • If the player drags less than DEAD_ZONE_M, treated as a tap
//     and ignored.
//
// Trajectory preview: 6 dots along the predicted parabola from the
// anchor for the first ~0.6 s of flight. Doesn't account for
// collisions — the player still has to read the level.
//
// Visual: drag line + dots are drawn here as plain RN absolutely-
// positioned <View>s (no Skia round-trip) so the touch layer and
// the preview are the same surface — keeps coordinate space
// trivial. The footballer body itself is rendered inside
// PhysicsCanvas (Skia) once launched.

const MAX_PULL_M = 2.5;
const DEAD_ZONE_M = 0.2;
/** Multiplier from pull-vector length (in meters) to launch
 *  velocity (in m/s). 8 means a 1m pull → 8 m/s, which lands a
 *  dynamic body roughly at the goal across a 16m level under the
 *  default 12 m/s² gravity. Tune per playtests. */
const VELOCITY_PER_METER = 8;

const PREVIEW_DT_S = 0.1;
const PREVIEW_STEPS = 6;
/** Default gravity Y from createWorld; preview math has to mirror
 *  the world's gravity for the dots to match the actual flight
 *  arc. Caller can override per-level if levels add per-level
 *  gravity overrides later. */
const DEFAULT_GRAVITY_Y = 12;

export interface LaunchEvent {
  /** Velocity in m/s, world coordinates. */
  vx: number;
  vy: number;
}

interface Props {
  /** Slingshot anchor in world meters. Where the football is held
   *  before launch. */
  anchorWorld: { x: number; y: number };
  pixelsPerMeter: number;
  /** Pixel offset applied to anchor + trajectory dots so they align
   *  with the same offset PhysicsCanvas uses for body rendering.
   *  Used by the game screen to centre a level inside a wider canvas. */
  offsetX?: number;
  offsetY?: number;
  /** Gravity Y (m/s²) for the trajectory-preview math. Should match
   *  the world's gravity for the preview to be accurate. */
  gravityY?: number;
  /** Disable input — set true while a footballer is in flight or
   *  the level is showing the result screen. */
  disabled?: boolean;
  onLaunch: (event: LaunchEvent) => void;
}

export function Slingshot({
  anchorWorld,
  pixelsPerMeter,
  offsetX = 0,
  offsetY = 0,
  gravityY = DEFAULT_GRAVITY_Y,
  disabled = false,
  onLaunch,
}: Props) {
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  // Drag state in canvas-pixel coordinates so the visuals can read
  // it without a meter→pixel hop on every render.
  const [dragPx, setDragPx] = useState<{ x: number; y: number } | null>(null);
  // Capture layout offsets at touch-start so move events can be
  // rebased to canvas-local coords. PanResponder gives screen-
  // relative coords (locationX is per-target, which we want).
  const startedRef = useRef(false);

  const anchorPx = {
    x: anchorWorld.x * pixelsPerMeter + offsetX,
    y: anchorWorld.y * pixelsPerMeter + offsetY,
  };

  const panHandlers = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (e) => {
          startedRef.current = true;
          setDragPx({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
        },
        onPanResponderMove: (e) => {
          if (!startedRef.current) return;
          // Cap drag distance to MAX_PULL_M from the anchor so the
          // gauge tops out and the preview stays sensible.
          const fxPx = e.nativeEvent.locationX;
          const fyPx = e.nativeEvent.locationY;
          const dxPx = fxPx - anchorPx.x;
          const dyPx = fyPx - anchorPx.y;
          const distPx = Math.hypot(dxPx, dyPx);
          const maxPx = MAX_PULL_M * pixelsPerMeter;
          if (distPx <= maxPx) {
            setDragPx({ x: fxPx, y: fyPx });
          } else {
            const k = maxPx / distPx;
            setDragPx({
              x: anchorPx.x + dxPx * k,
              y: anchorPx.y + dyPx * k,
            });
          }
        },
        onPanResponderRelease: () => {
          startedRef.current = false;
          if (!dragPx) return;
          // Pull vector in meters: from finger back to anchor.
          const pullPxX = anchorPx.x - dragPx.x;
          const pullPxY = anchorPx.y - dragPx.y;
          const pullM = Math.hypot(pullPxX, pullPxY) / pixelsPerMeter;
          if (pullM < DEAD_ZONE_M) {
            setDragPx(null);
            return;
          }
          const vx = (pullPxX / pixelsPerMeter) * VELOCITY_PER_METER;
          const vy = (pullPxY / pixelsPerMeter) * VELOCITY_PER_METER;
          onLaunch({ vx, vy });
          setDragPx(null);
        },
        onPanResponderTerminate: () => {
          startedRef.current = false;
          setDragPx(null);
        },
      }).panHandlers,
    [disabled, pixelsPerMeter, anchorPx.x, anchorPx.y, dragPx, onLaunch],
  );

  const trajectory = useMemo(() => {
    if (!dragPx) return [] as { x: number; y: number }[];
    const pullPxX = anchorPx.x - dragPx.x;
    const pullPxY = anchorPx.y - dragPx.y;
    const vx = (pullPxX / pixelsPerMeter) * VELOCITY_PER_METER;
    const vy = (pullPxY / pixelsPerMeter) * VELOCITY_PER_METER;
    const out: { x: number; y: number }[] = [];
    for (let i = 1; i <= PREVIEW_STEPS; i++) {
      const t = i * PREVIEW_DT_S;
      const xM = anchorWorld.x + vx * t;
      const yM = anchorWorld.y + vy * t + 0.5 * gravityY * t * t;
      out.push({
        x: xM * pixelsPerMeter + offsetX,
        y: yM * pixelsPerMeter + offsetY,
      });
    }
    return out;
  }, [dragPx, anchorPx.x, anchorPx.y, anchorWorld.x, anchorWorld.y, pixelsPerMeter, offsetX, offsetY, gravityY]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setLayout({ w, h });
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      pointerEvents={disabled ? "none" : "auto"}
      {...panHandlers}
    >
      {/* Anchor marker — a faint ring so the player sees where the
          ammo will spawn. Hidden when dragging since the trajectory
          preview takes over the visual budget. */}
      {layout && !dragPx && (
        <View
          style={[
            styles.anchorRing,
            {
              left: anchorPx.x - 18,
              top: anchorPx.y - 18,
            },
          ]}
        />
      )}

      {/* Trajectory dots — 6 small white circles along the preview
          arc. Fade later dots so the player reads the near future
          more strongly than the far future. */}
      {trajectory.map((p, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.previewDot,
            {
              left: p.x - 4,
              top: p.y - 4,
              opacity: 1 - (i / PREVIEW_STEPS) * 0.7,
            },
          ]}
        />
      ))}

      {/* Drag-line marker at the finger — gives the player a
          tactile anchor for the gesture. */}
      {dragPx && (
        <View
          pointerEvents="none"
          style={[
            styles.fingerMarker,
            {
              left: dragPx.x - 16,
              top: dragPx.y - 16,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  anchorRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderStyle: "dashed",
  },
  previewDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  fingerMarker: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
