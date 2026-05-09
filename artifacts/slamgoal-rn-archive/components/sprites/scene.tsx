import {
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  vec,
} from "@shopify/react-native-skia";
import React from "react";

// Slam Goal — scene props.
//
// Static decoration drawn inside the Skia canvas, behind / around
// the physics bodies. Three pieces:
//   • SceneBackdrop — full-canvas sky gradient, distant building
//     silhouettes, ground band. Stays put as the level scrolls
//     (which it doesn't yet — Phase 5b can layer parallax).
//   • SlingshotRig — Y-shaped wooden post with an elastic band
//     drawn at the slingshot anchor.
//   • GoalPost — frame + cross-hatch net drawn at the goal AABB.
//
// All measurements are in pixels (already converted from world
// coords by the caller). Sizing constants scale with the level's
// pixelsPerMeter so a level rendered larger keeps proportional
// visual weight.

const OUTLINE = "#0d1b2a";

// ── SceneBackdrop ───────────────────────────────────────────────────
// Full-canvas sky → ground. Building silhouettes along the horizon
// just above the level's floor (groundY = canvasH - bottomBand).
export function SceneBackdrop({
  width,
  height,
  groundY,
}: {
  width: number;
  height: number;
  /** Y-pixel where the floor sits (everything below = ground band). */
  groundY: number;
}) {
  // Pseudo-random building heights derived from x position so the
  // skyline looks varied but is stable across renders.
  const buildings: { x: number; w: number; h: number; color: string }[] = [];
  const buildingCount = Math.max(8, Math.floor(width / 90));
  for (let i = 0; i < buildingCount; i++) {
    const x = (width / buildingCount) * i + (i * 73) % 30;
    const w = 45 + ((i * 47) % 35);
    const h = 60 + ((i * 31) % 90);
    const tone = 30 + ((i * 19) % 50);
    buildings.push({
      x,
      w,
      h,
      color: `rgb(${tone}, ${tone + 12}, ${tone + 28})`,
    });
  }
  return (
    <Group>
      {/* Sky gradient — top: deep night, bottom: warmer twilight */}
      <Rect x={0} y={0} width={width} height={groundY}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, groundY)}
          colors={["#1c2a4a", "#3a3a5e", "#5a4a6e"]}
          positions={[0, 0.65, 1]}
        />
      </Rect>

      {/* Distant building silhouettes */}
      {buildings.map((b, i) => (
        <Group key={i}>
          <Rect
            x={b.x}
            y={groundY - b.h}
            width={b.w}
            height={b.h}
            color={b.color}
          />
          {/* A few windows */}
          {[0.25, 0.5, 0.75].map((fy) => {
            const wy = groundY - b.h + b.h * fy;
            return (
              <Group key={`${i}-${fy}`}>
                <Rect
                  x={b.x + b.w * 0.2}
                  y={wy}
                  width={b.w * 0.18}
                  height={6}
                  color="rgba(255,209,102,0.65)"
                />
                <Rect
                  x={b.x + b.w * 0.62}
                  y={wy}
                  width={b.w * 0.18}
                  height={6}
                  color="rgba(255,209,102,0.55)"
                />
              </Group>
            );
          })}
        </Group>
      ))}

      {/* Ground band — pavement / dirt */}
      <Rect x={0} y={groundY} width={width} height={height - groundY}>
        <LinearGradient
          start={vec(0, groundY)}
          end={vec(0, height)}
          colors={["#3a2a1a", "#1a1410"]}
        />
      </Rect>
      {/* Ground edge accent line */}
      <Rect x={0} y={groundY - 2} width={width} height={2} color="#1a1410" />
    </Group>
  );
}

// ── SlingshotRig ────────────────────────────────────────────────────
// Y-shaped wooden post + stretched red elastic band. Drawn at
// (anchorX, anchorY) — the world's slingshot anchor in pixels.
export function SlingshotRig({
  x,
  y,
  scale,
}: {
  x: number;
  y: number;
  /** Scale factor (pixelsPerMeter) so the rig sizes with the level. */
  scale: number;
}) {
  // 1m = scale px. Rig is 1.0m tall, 0.6m wide.
  const armH = scale * 0.6;
  const trunkH = scale * 0.5;
  const armW = scale * 0.16;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {/* Trunk */}
      <Rect
        x={-armW / 2}
        y={0}
        width={armW}
        height={trunkH}
        color="#5a3a1a"
      />
      <Rect
        x={-armW / 2 - 2}
        y={0}
        width={armW + 4}
        height={trunkH}
        color={OUTLINE}
        // Outline by drawing a slightly larger filled rect first; this
        // is wrong order — using stroke instead would be cleaner, but
        // Skia's Rect doesn't support style="stroke" in v2 the same
        // way Path does. Keep simple: just the trunk fill below.
      />
      {/* Trunk fill (overdraws the outline above) */}
      <Rect
        x={-armW / 2}
        y={0}
        width={armW}
        height={trunkH}
        color="#7a5232"
      />
      {/* Left fork arm */}
      <Path
        path={`M ${-armW / 2} ${0}
               L ${-armW / 2 - scale * 0.2} ${-armH}
               L ${-armW / 2 - scale * 0.2 + armW * 0.9} ${-armH}
               L ${armW / 2} ${-armW * 0.4} Z`}
        color="#7a5232"
      />
      {/* Right fork arm */}
      <Path
        path={`M ${armW / 2} ${0}
               L ${armW / 2 + scale * 0.2} ${-armH}
               L ${armW / 2 + scale * 0.2 - armW * 0.9} ${-armH}
               L ${-armW / 2} ${-armW * 0.4} Z`}
        color="#7a5232"
      />
      {/* Wood grain on trunk */}
      <Path
        path={`M ${-armW * 0.2} ${trunkH * 0.2} L ${-armW * 0.2} ${trunkH * 0.8}`}
        color="#5a3a1a"
        style="stroke"
        strokeWidth={1.5}
      />
      <Path
        path={`M ${armW * 0.2} ${trunkH * 0.15} L ${armW * 0.2} ${trunkH * 0.85}`}
        color="#5a3a1a"
        style="stroke"
        strokeWidth={1.5}
      />
      {/* Elastic band — taut between fork tops */}
      <Path
        path={`M ${-armW / 2 - scale * 0.2 + armW * 0.4} ${-armH + 2}
               Q 0 ${-armH + scale * 0.05} ${armW / 2 + scale * 0.2 - armW * 0.4} ${-armH + 2}`}
        color="#ef476f"
        style="stroke"
        strokeWidth={Math.max(2, scale * 0.05)}
      />
      {/* Fork knobs */}
      <Circle
        cx={-armW / 2 - scale * 0.2 + armW * 0.4}
        cy={-armH + 2}
        r={scale * 0.05}
        color="#5a3a1a"
      />
      <Circle
        cx={armW / 2 + scale * 0.2 - armW * 0.4}
        cy={-armH + 2}
        r={scale * 0.05}
        color="#5a3a1a"
      />
    </Group>
  );
}

// ── GoalPost ────────────────────────────────────────────────────────
// Frame + cross-hatch net + bright top/bottom bars. Drawn aligned to
// the goal AABB in pixels.
export function GoalPost({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const postW = Math.max(4, width * 0.07);
  const netRows = 4;
  const netCols = 4;
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {/* Net (cross-hatched diagonal lines) */}
      {Array.from({ length: netRows }).map((_, i) => {
        const yPos = (height / netRows) * (i + 1);
        return (
          <Path
            key={`h-${i}`}
            path={`M 0 ${yPos} L ${width} ${yPos}`}
            color="rgba(255,255,255,0.22)"
            style="stroke"
            strokeWidth={1.5}
          />
        );
      })}
      {Array.from({ length: netCols }).map((_, i) => {
        const xPos = (width / netCols) * (i + 1);
        return (
          <Path
            key={`v-${i}`}
            path={`M ${xPos} 0 L ${xPos} ${height}`}
            color="rgba(255,255,255,0.22)"
            style="stroke"
            strokeWidth={1.5}
          />
        );
      })}
      {/* Diagonal accents — gives the diamond net look */}
      <Path
        path={`M 0 0 L ${width} ${height}`}
        color="rgba(255,255,255,0.15)"
        style="stroke"
        strokeWidth={1.5}
      />
      <Path
        path={`M ${width} 0 L 0 ${height}`}
        color="rgba(255,255,255,0.15)"
        style="stroke"
        strokeWidth={1.5}
      />

      {/* Translucent goal-zone fill (so the player sees the target) */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        color="rgba(255,209,102,0.10)"
      />

      {/* Frame — top, left, right posts (NOT bottom; ball enters
          from above through the net). */}
      <Rect x={0} y={0} width={width} height={postW} color="#fff" />
      <Rect x={0} y={0} width={postW} height={height} color="#fff" />
      <Rect x={width - postW} y={0} width={postW} height={height} color="#fff" />
      {/* Outline frame */}
      <Path
        path={`M 0 0 L ${width} 0 L ${width} ${height} M 0 0 L 0 ${height}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={2}
      />
    </Group>
  );
}
