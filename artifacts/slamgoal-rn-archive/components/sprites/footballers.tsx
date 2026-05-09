import { Circle, Group, Path } from "@shopify/react-native-skia";
import React from "react";

import { registerSprite, type SpriteOpts } from "./registry";

// Slam Goal — footballer sprites (composed Skia primitives).
//
// Each character is a 5-10 element composition: body fill, optional
// outline ring, hair / hat, face, eyes (whites + pupils + shines),
// mouth, accessory. All scaled relative to the body radius `r` so
// the same code renders at any size.
//
// Visual language:
//   • Saturated body colours matching constants/footballers.ts so
//     the FootballerPicker dot + the in-world sprite read as the
//     same character.
//   • Thick dark outline (#0d1b2a) for "vector cartoon" feel.
//   • Each character has a distinguishing accessory (headband,
//     ponytail, cap, helmet, gloves) so they're identifiable at
//     small in-world sizes.
//
// Phase 5b's external art pass can replace any of these
// `draw*` functions with `<Image source={spriteSheet} />` calls
// without touching the dispatcher.

const OUTLINE = "#0d1b2a";
const SHADOW = "rgba(0,0,0,0.25)";
const FACE = "#fde0a0";

interface BaseProps extends SpriteOpts {
  bodyColor: string;
  faceColor?: string;
}

/** Common shadow + body fill + outline. Draws in order so subsequent
 *  children (hair, face, accessories) appear on top of the body. */
function characterBase({ cx, cy, angle, radius, bodyColor }: BaseProps) {
  const r = radius ?? 20;
  return (
    <Group
      transform={[
        { translateX: cx },
        { translateY: cy },
        { rotate: angle },
      ]}
    >
      {/* Drop shadow */}
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      {/* Outline (slightly larger filled circle behind body) */}
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      {/* Body */}
      <Circle cx={0} cy={0} r={r} color={bodyColor} />
    </Group>
  );
}

// ── Striker Sam ─────────────────────────────────────────────────────
// Hot-headed striker. Yellow body, red headband, spike hair,
// determined open-mouth grin. Lightning bolt on chest.
function drawStrikerSam({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 20;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#ffd166" />
      {/* Spike hair (orange, peeking above headband) */}
      <Path
        path={`M ${-r * 0.55} ${-r * 0.4}
               L ${-r * 0.3} ${-r * 1.05}
               L ${-r * 0.05} ${-r * 0.5}
               L ${r * 0.1} ${-r * 0.95}
               L ${r * 0.3} ${-r * 0.55}
               L ${r * 0.5} ${-r * 0.85}
               L ${r * 0.55} ${-r * 0.4}
               Z`}
        color="#ff9f1c"
      />
      {/* Headband (red) */}
      <Path
        path={`M ${-r * 0.7} ${-r * 0.45}
               Q ${0} ${-r * 0.6} ${r * 0.7} ${-r * 0.45}
               L ${r * 0.7} ${-r * 0.3}
               Q ${0} ${-r * 0.45} ${-r * 0.7} ${-r * 0.3} Z`}
        color="#ef476f"
      />
      {/* Eyebrows — angled inward (determined) */}
      <Path
        path={`M ${-r * 0.36} ${-r * 0.18} L ${-r * 0.12} ${-r * 0.25}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.09}
      />
      <Path
        path={`M ${r * 0.12} ${-r * 0.25} L ${r * 0.36} ${-r * 0.18}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.09}
      />
      {/* Eyes */}
      <Circle cx={-r * 0.22} cy={-r * 0.05} r={r * 0.11} color="#fff" />
      <Circle cx={+r * 0.22} cy={-r * 0.05} r={r * 0.11} color="#fff" />
      <Circle cx={-r * 0.22} cy={-r * 0.05} r={r * 0.06} color={OUTLINE} />
      <Circle cx={+r * 0.22} cy={-r * 0.05} r={r * 0.06} color={OUTLINE} />
      <Circle cx={-r * 0.20} cy={-r * 0.08} r={r * 0.025} color="#fff" />
      <Circle cx={+r * 0.24} cy={-r * 0.08} r={r * 0.025} color="#fff" />
      {/* Open mouth grin */}
      <Path
        path={`M ${-r * 0.28} ${r * 0.18}
               Q 0 ${r * 0.5} ${r * 0.28} ${r * 0.18}
               Q 0 ${r * 0.32} ${-r * 0.28} ${r * 0.18} Z`}
        color={OUTLINE}
      />
      {/* Tongue */}
      <Path
        path={`M ${-r * 0.13} ${r * 0.32}
               Q 0 ${r * 0.42} ${r * 0.13} ${r * 0.32}
               Q 0 ${r * 0.38} ${-r * 0.13} ${r * 0.32} Z`}
        color="#ef476f"
      />
    </Group>
  );
}

// ── Banana Belle ────────────────────────────────────────────────────
// Curve specialist. Green body, blonde ponytail, winking smirk.
function drawBananaBelle({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 20;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#06d6a0" />
      {/* Hair — top sweep */}
      <Path
        path={`M ${-r * 0.7} ${-r * 0.3}
               Q ${-r * 0.5} ${-r * 1.05} ${0} ${-r * 0.95}
               Q ${r * 0.55} ${-r * 0.95} ${r * 0.7} ${-r * 0.3}
               L ${r * 0.65} ${-r * 0.1}
               Q ${0} ${-r * 0.4} ${-r * 0.65} ${-r * 0.1} Z`}
        color="#ffd166"
      />
      {/* Ponytail flying back-left */}
      <Path
        path={`M ${-r * 0.5} ${-r * 0.55}
               Q ${-r * 1.1} ${-r * 0.3} ${-r * 1.2} ${r * 0.15}
               Q ${-r * 0.95} ${r * 0.05} ${-r * 0.65} ${-r * 0.1}
               Q ${-r * 0.85} ${-r * 0.4} ${-r * 0.5} ${-r * 0.55} Z`}
        color="#ffd166"
      />
      {/* Hairband (green) */}
      <Path
        path={`M ${-r * 0.7} ${-r * 0.18}
               Q 0 ${-r * 0.32} ${r * 0.7} ${-r * 0.18}
               L ${r * 0.7} ${-r * 0.05}
               Q 0 ${-r * 0.2} ${-r * 0.7} ${-r * 0.05} Z`}
        color="#0d8c70"
      />
      {/* Right eye open */}
      <Circle cx={+r * 0.22} cy={r * 0.04} r={r * 0.11} color="#fff" />
      <Circle cx={+r * 0.22} cy={r * 0.04} r={r * 0.06} color={OUTLINE} />
      <Circle cx={+r * 0.24} cy={r * 0.01} r={r * 0.025} color="#fff" />
      {/* Left eye winking — short curved line */}
      <Path
        path={`M ${-r * 0.32} ${r * 0.05}
               Q ${-r * 0.22} ${r * -0.04} ${-r * 0.12} ${r * 0.05}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.07}
      />
      {/* Eyelashes */}
      <Path
        path={`M ${-r * 0.32} ${r * 0.05} L ${-r * 0.36} ${r * -0.03}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.04}
      />
      {/* Smirk */}
      <Path
        path={`M ${-r * 0.18} ${r * 0.32} Q ${0} ${r * 0.4} ${r * 0.22} ${r * 0.22}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.07}
      />
    </Group>
  );
}

// ── Split Steve ─────────────────────────────────────────────────────
// Multi-shot specialist. Blue body, backward cap, sunglasses, smirk.
function drawSplitSteve({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 20;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#4cc9f0" />
      {/* Backward cap brim sticking out left */}
      <Path
        path={`M ${-r * 1.05} ${-r * 0.35}
               L ${-r * 0.8} ${-r * 0.55}
               L ${-r * 0.55} ${-r * 0.5}
               L ${-r * 0.8} ${-r * 0.3} Z`}
        color="#1d3557"
      />
      {/* Cap dome */}
      <Path
        path={`M ${-r * 0.75} ${-r * 0.5}
               Q 0 ${-r * 1.1} ${r * 0.75} ${-r * 0.5}
               L ${r * 0.75} ${-r * 0.25}
               Q 0 ${-r * 0.45} ${-r * 0.75} ${-r * 0.25} Z`}
        color="#1d3557"
      />
      {/* Cap stripe */}
      <Path
        path={`M ${-r * 0.7} ${-r * 0.35}
               Q 0 ${-r * 0.5} ${r * 0.7} ${-r * 0.35}
               L ${r * 0.7} ${-r * 0.27}
               Q 0 ${-r * 0.42} ${-r * 0.7} ${-r * 0.27} Z`}
        color="#ffd166"
      />
      {/* Sunglasses — single bar across both eyes */}
      <Path
        path={`M ${-r * 0.4} ${-r * 0.05}
               L ${r * 0.4} ${-r * 0.05}
               L ${r * 0.4} ${r * 0.12}
               L ${-r * 0.4} ${r * 0.12} Z`}
        color={OUTLINE}
      />
      {/* Lens highlights */}
      <Path
        path={`M ${-r * 0.32} ${r * 0.0} L ${-r * 0.18} ${r * 0.0}`}
        color="#fff"
        style="stroke"
        strokeWidth={r * 0.04}
      />
      <Path
        path={`M ${r * 0.18} ${r * 0.0} L ${r * 0.32} ${r * 0.0}`}
        color="#fff"
        style="stroke"
        strokeWidth={r * 0.04}
      />
      {/* Smirk — cocky one-sided grin */}
      <Path
        path={`M ${-r * 0.15} ${r * 0.35} Q ${r * 0.05} ${r * 0.42} ${r * 0.28} ${r * 0.25}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.07}
      />
    </Group>
  );
}

// ── Header Hank ─────────────────────────────────────────────────────
// Heavy hitter. Purple body, helmet, thick eyebrows, set jaw.
function drawHeaderHank({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 20;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#bb88ff" />
      {/* Helmet shell — half-dome on top */}
      <Path
        path={`M ${-r * 0.95} ${-r * 0.1}
               Q 0 ${-r * 1.15} ${r * 0.95} ${-r * 0.1}
               L ${r * 0.85} ${r * 0.05}
               Q 0 ${-r * 0.05} ${-r * 0.85} ${r * 0.05} Z`}
        color="#5a3aa0"
      />
      {/* Helmet centre stripe */}
      <Path
        path={`M ${-r * 0.08} ${-r * 1.05}
               Q 0 ${-r * 1.1} ${r * 0.08} ${-r * 1.05}
               L ${r * 0.05} ${-r * 0.1}
               L ${-r * 0.05} ${-r * 0.1} Z`}
        color="#ffd166"
      />
      {/* Helmet face mask — horizontal bar */}
      <Path
        path={`M ${-r * 0.65} ${r * 0.1}
               L ${r * 0.65} ${r * 0.1}
               L ${r * 0.65} ${r * 0.16}
               L ${-r * 0.65} ${r * 0.16} Z`}
        color="#3a2470"
      />
      {/* Vertical face mask bar */}
      <Path
        path={`M ${-r * 0.05} ${r * 0.05}
               L ${r * 0.05} ${r * 0.05}
               L ${r * 0.05} ${r * 0.45}
               L ${-r * 0.05} ${r * 0.45} Z`}
        color="#3a2470"
      />
      {/* Heavy eyebrows */}
      <Path
        path={`M ${-r * 0.45} ${r * 0.0} L ${-r * 0.05} ${r * 0.05}
               L ${-r * 0.05} ${r * 0.12} L ${-r * 0.45} ${r * 0.08} Z`}
        color={OUTLINE}
      />
      <Path
        path={`M ${r * 0.05} ${r * 0.05} L ${r * 0.45} ${r * 0.0}
               L ${r * 0.45} ${r * 0.08} L ${r * 0.05} ${r * 0.12} Z`}
        color={OUTLINE}
      />
      {/* Set jaw — flat horizontal mouth */}
      <Path
        path={`M ${-r * 0.25} ${r * 0.55}
               L ${r * 0.25} ${r * 0.55}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.08}
      />
    </Group>
  );
}

// ── Goalie Greg ─────────────────────────────────────────────────────
// Bouncy defender. Orange body, big gloves, jersey "1", big smile.
function drawGoalieGreg({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 20;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#ff9f1c" />
      {/* Hair (brown, simple top swirl) */}
      <Path
        path={`M ${-r * 0.55} ${-r * 0.45}
               Q ${-r * 0.6} ${-r * 1.0} ${0} ${-r * 0.95}
               Q ${r * 0.6} ${-r * 1.0} ${r * 0.55} ${-r * 0.45}
               L ${r * 0.5} ${-r * 0.3}
               Q 0 ${-r * 0.55} ${-r * 0.5} ${-r * 0.3} Z`}
        color="#5a3a1a"
      />
      {/* Gloves — round bumps on either side of body */}
      <Circle cx={-r * 1.05} cy={r * 0.4} r={r * 0.32} color="#ffd166" />
      <Circle cx={-r * 1.05} cy={r * 0.4} r={r * 0.32} color={OUTLINE} style="stroke" strokeWidth={r * 0.06} />
      <Circle cx={+r * 1.05} cy={r * 0.4} r={r * 0.32} color="#ffd166" />
      <Circle cx={+r * 1.05} cy={r * 0.4} r={r * 0.32} color={OUTLINE} style="stroke" strokeWidth={r * 0.06} />
      {/* Eyes */}
      <Circle cx={-r * 0.22} cy={-r * 0.05} r={r * 0.11} color="#fff" />
      <Circle cx={+r * 0.22} cy={-r * 0.05} r={r * 0.11} color="#fff" />
      <Circle cx={-r * 0.20} cy={-r * 0.04} r={r * 0.06} color={OUTLINE} />
      <Circle cx={+r * 0.20} cy={-r * 0.04} r={r * 0.06} color={OUTLINE} />
      <Circle cx={-r * 0.18} cy={-r * 0.07} r={r * 0.025} color="#fff" />
      <Circle cx={+r * 0.22} cy={-r * 0.07} r={r * 0.025} color="#fff" />
      {/* Big smile */}
      <Path
        path={`M ${-r * 0.32} ${r * 0.22}
               Q 0 ${r * 0.55} ${r * 0.32} ${r * 0.22}
               Q 0 ${r * 0.36} ${-r * 0.32} ${r * 0.22} Z`}
        color={OUTLINE}
      />
      {/* Teeth strip inside smile */}
      <Path
        path={`M ${-r * 0.22} ${r * 0.28}
               Q 0 ${r * 0.42} ${r * 0.22} ${r * 0.28}
               Q 0 ${r * 0.32} ${-r * 0.22} ${r * 0.28} Z`}
        color="#fff"
      />
    </Group>
  );
}

// Register all five.
registerSprite("striker_sam", drawStrikerSam);
registerSprite("banana_belle", drawBananaBelle);
registerSprite("split_steve", drawSplitSteve);
registerSprite("header_hank", drawHeaderHank);
registerSprite("goalie_greg", drawGoalieGreg);
// Generic ball fallback (split-shot children inherit the
// footballer's stats but get id "ball") — render as Striker by
// default. Phase 5b can introduce a footballerId field on the body
// so each child renders as the right character.
registerSprite("ball", drawStrikerSam);

// Hook for non-Skia callers (e.g. FootballerPicker) that want to
// embed a footballer's mini portrait inside a small Skia Canvas.
export function getFootballerSprite(footballerId: string) {
  switch (footballerId) {
    case "striker_sam":
      return drawStrikerSam;
    case "banana_belle":
      return drawBananaBelle;
    case "split_steve":
      return drawSplitSteve;
    case "header_hank":
      return drawHeaderHank;
    case "goalie_greg":
      return drawGoalieGreg;
    default:
      return drawStrikerSam;
  }
}
