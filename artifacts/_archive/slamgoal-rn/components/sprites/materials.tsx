import { Group, Path, Rect } from "@shopify/react-native-skia";
import React from "react";

import { registerSprite, type SpriteOpts } from "./registry";

// Slam Goal — material textures.
//
// All four materials are rendered as box bodies with internal
// detail (grain, corrugation, panel lines, rivets). Each draw
// function takes the body's halfW / halfH in pixels and renders
// the texture filling the box.
//
// Coordinate system: origin (0,0) is at the body centre. Box
// extends from (-halfW, -halfH) to (+halfW, +halfH). All paths are
// drawn relative to this local frame, then the parent Group's
// transform places them at (cx, cy) and rotates by angle.

const OUTLINE = "#0d1b2a";
const SHADOW = "rgba(0,0,0,0.18)";

interface BoxFrameProps {
  halfW: number;
  halfH: number;
  fill: string;
  outline?: string;
  outlineWidth?: number;
}

/** Filled rect with outline. Used as the frame for every material. */
function boxFrame({ halfW, halfH, fill, outline = OUTLINE, outlineWidth = 2 }: BoxFrameProps) {
  return (
    <>
      {/* Drop shadow under the box */}
      <Rect
        x={-halfW}
        y={-halfH + Math.min(4, halfH * 0.1)}
        width={halfW * 2}
        height={halfH * 2}
        color={SHADOW}
      />
      {/* Outline (slightly larger filled rect behind body) */}
      <Rect
        x={-halfW - outlineWidth}
        y={-halfH - outlineWidth}
        width={halfW * 2 + outlineWidth * 2}
        height={halfH * 2 + outlineWidth * 2}
        color={outline}
      />
      {/* Body fill */}
      <Rect x={-halfW} y={-halfH} width={halfW * 2} height={halfH * 2} color={fill} />
    </>
  );
}

// ── Wood ────────────────────────────────────────────────────────────
// Brown box with horizontal grain lines + a couple of darker knots.
function drawWood({ cx, cy, angle, halfW, halfH }: SpriteOpts) {
  const w = halfW ?? 30;
  const h = halfH ?? 30;
  const ow = Math.max(2, Math.min(w, h) * 0.06);
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      {boxFrame({ halfW: w, halfH: h, fill: "#a47148", outlineWidth: ow })}
      {/* Three horizontal grain lines */}
      {[-h * 0.45, -h * 0.05, h * 0.4].map((y, i) => (
        <Path
          key={i}
          path={`M ${-w * 0.85} ${y}
                 Q ${-w * 0.3} ${y - h * 0.05} ${0} ${y}
                 Q ${w * 0.3} ${y + h * 0.05} ${w * 0.85} ${y}`}
          color="#7a5232"
          style="stroke"
          strokeWidth={Math.max(1, h * 0.04)}
        />
      ))}
      {/* Two knots */}
      <Path
        path={`M ${-w * 0.4} ${-h * 0.15}
               m -${h * 0.08},0
               a ${h * 0.08},${h * 0.05} 0 1,0 ${h * 0.16},0
               a ${h * 0.08},${h * 0.05} 0 1,0 ${-h * 0.16},0`}
        color="#6e4624"
      />
      <Path
        path={`M ${w * 0.45} ${h * 0.2}
               m -${h * 0.06},0
               a ${h * 0.06},${h * 0.04} 0 1,0 ${h * 0.12},0
               a ${h * 0.06},${h * 0.04} 0 1,0 ${-h * 0.12},0`}
        color="#6e4624"
      />
    </Group>
  );
}

// ── Cardboard ───────────────────────────────────────────────────────
// Tan box with corrugated zigzag pattern + tape strip across middle.
function drawCardboard({ cx, cy, angle, halfW, halfH }: SpriteOpts) {
  const w = halfW ?? 30;
  const h = halfH ?? 30;
  const ow = Math.max(2, Math.min(w, h) * 0.06);
  // Build a zigzag path across the middle of the box.
  const segs = Math.max(4, Math.floor(w / 8));
  let zigzag = `M ${-w * 0.85} ${0}`;
  for (let i = 1; i <= segs; i++) {
    const x = -w * 0.85 + (w * 1.7 * i) / segs;
    const y = i % 2 === 0 ? 0 : -h * 0.08;
    zigzag += ` L ${x} ${y}`;
  }
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      {boxFrame({ halfW: w, halfH: h, fill: "#d4a373", outlineWidth: ow })}
      {/* Top + bottom corrugation hint (horizontal lines) */}
      <Path
        path={`M ${-w * 0.85} ${-h * 0.55} L ${w * 0.85} ${-h * 0.55}`}
        color="#a87b50"
        style="stroke"
        strokeWidth={Math.max(1, h * 0.04)}
      />
      <Path
        path={`M ${-w * 0.85} ${h * 0.55} L ${w * 0.85} ${h * 0.55}`}
        color="#a87b50"
        style="stroke"
        strokeWidth={Math.max(1, h * 0.04)}
      />
      {/* Zigzag in middle */}
      <Path
        path={zigzag}
        color="#a87b50"
        style="stroke"
        strokeWidth={Math.max(1, h * 0.05)}
      />
      {/* Centre tape strip */}
      <Rect
        x={-w * 0.85}
        y={-h * 0.18}
        width={w * 1.7}
        height={h * 0.12}
        color="rgba(255,255,255,0.4)"
      />
    </Group>
  );
}

// ── Tin (corrugated) ────────────────────────────────────────────────
// Silver box with vertical corrugation grooves + rust spots.
function drawTin({ cx, cy, angle, halfW, halfH }: SpriteOpts) {
  const w = halfW ?? 30;
  const h = halfH ?? 30;
  const ow = Math.max(2, Math.min(w, h) * 0.06);
  const grooves = Math.max(3, Math.floor(w / 6));
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      {boxFrame({ halfW: w, halfH: h, fill: "#9ca3af", outlineWidth: ow })}
      {/* Vertical grooves */}
      {Array.from({ length: grooves - 1 }).map((_, i) => {
        const x = -w + ((w * 2) / grooves) * (i + 1);
        return (
          <Path
            key={i}
            path={`M ${x} ${-h * 0.85} L ${x} ${h * 0.85}`}
            color="#6b7280"
            style="stroke"
            strokeWidth={Math.max(1, w * 0.03)}
          />
        );
      })}
      {/* Highlight strip — one bright vertical line for sheen */}
      <Path
        path={`M ${w * 0.05} ${-h * 0.85} L ${w * 0.05} ${h * 0.85}`}
        color="#e5e7eb"
        style="stroke"
        strokeWidth={Math.max(1, w * 0.04)}
      />
      {/* Rust speck */}
      <Path
        path={`M ${-w * 0.55} ${h * 0.45}
               m -${h * 0.06},0
               a ${h * 0.06},${h * 0.04} 0 1,0 ${h * 0.12},0
               a ${h * 0.06},${h * 0.04} 0 1,0 ${-h * 0.12},0`}
        color="#b45309"
      />
    </Group>
  );
}

// ── Container (shipping container) ──────────────────────────────────
// Dark slate body with horizontal panels, rivet dots, and a faded
// company-id stencil. Used as static level architecture.
function drawContainer({ cx, cy, angle, halfW, halfH }: SpriteOpts) {
  const w = halfW ?? 30;
  const h = halfH ?? 30;
  const ow = Math.max(3, Math.min(w, h) * 0.08);
  const panels = Math.max(4, Math.floor(h / 12));
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      {boxFrame({ halfW: w, halfH: h, fill: "#5a4a3a", outlineWidth: ow })}
      {/* Horizontal panel lines */}
      {Array.from({ length: panels - 1 }).map((_, i) => {
        const y = -h + ((h * 2) / panels) * (i + 1);
        return (
          <Path
            key={i}
            path={`M ${-w * 0.92} ${y} L ${w * 0.92} ${y}`}
            color="#3a2f24"
            style="stroke"
            strokeWidth={Math.max(1, h * 0.025)}
          />
        );
      })}
      {/* Rivets in 4 corners */}
      {[
        { x: -w * 0.85, y: -h * 0.85 },
        { x: w * 0.85, y: -h * 0.85 },
        { x: -w * 0.85, y: h * 0.85 },
        { x: w * 0.85, y: h * 0.85 },
      ].map((p, i) => (
        <Path
          key={i}
          path={`M ${p.x} ${p.y}
                 m -${ow * 0.5},0
                 a ${ow * 0.5},${ow * 0.5} 0 1,0 ${ow},0
                 a ${ow * 0.5},${ow * 0.5} 0 1,0 ${-ow},0`}
          color="#1a1410"
        />
      ))}
      {/* Stencil patch (lighter rectangle) */}
      <Rect
        x={-w * 0.4}
        y={-h * 0.15}
        width={w * 0.8}
        height={h * 0.3}
        color="rgba(255,209,102,0.18)"
      />
    </Group>
  );
}

registerSprite("wood", drawWood);
registerSprite("cardboard", drawCardboard);
registerSprite("tin", drawTin);
registerSprite("container", drawContainer);
