import { Circle, Group, Path } from "@shopify/react-native-skia";
import React from "react";

import { registerSprite, type SpriteOpts } from "./registry";

const OUTLINE = "#0d1b2a";
const SHADOW = "rgba(0,0,0,0.25)";

// ── Generic enemy ───────────────────────────────────────────────────
// Small angry mook: red body, sharp teeth, beady eyes, V-eyebrows.
function drawEnemy({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 20;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.05} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#ef476f" />
      {/* Body shading bottom-right */}
      <Path
        path={`M ${r * 0.95} ${r * 0.0}
               Q ${r * 0.85} ${r * 0.85} ${r * 0.0} ${r * 0.95}
               Q ${r * 0.5} ${r * 0.6} ${r * 0.7} ${r * 0.0} Z`}
        color="#bf2c4d"
      />
      {/* Furrowed brow — V-shape eyebrows */}
      <Path
        path={`M ${-r * 0.5} ${-r * 0.35}
               L ${-r * 0.1} ${-r * 0.15}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.1}
      />
      <Path
        path={`M ${r * 0.1} ${-r * 0.15}
               L ${r * 0.5} ${-r * 0.35}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.1}
      />
      {/* Beady eyes */}
      <Circle cx={-r * 0.2} cy={r * 0.0} r={r * 0.1} color="#fff" />
      <Circle cx={+r * 0.2} cy={r * 0.0} r={r * 0.1} color="#fff" />
      <Circle cx={-r * 0.18} cy={r * 0.02} r={r * 0.06} color={OUTLINE} />
      <Circle cx={+r * 0.22} cy={r * 0.02} r={r * 0.06} color={OUTLINE} />
      {/* Snarling open mouth with fangs */}
      <Path
        path={`M ${-r * 0.4} ${r * 0.3}
               Q 0 ${r * 0.5} ${r * 0.4} ${r * 0.3}
               L ${r * 0.4} ${r * 0.42}
               Q 0 ${r * 0.62} ${-r * 0.4} ${r * 0.42} Z`}
        color={OUTLINE}
      />
      {/* Fangs — two triangles */}
      <Path
        path={`M ${-r * 0.22} ${r * 0.32}
               L ${-r * 0.12} ${r * 0.55}
               L ${-r * 0.05} ${r * 0.32} Z`}
        color="#fff"
      />
      <Path
        path={`M ${r * 0.05} ${r * 0.32}
               L ${r * 0.12} ${r * 0.55}
               L ${r * 0.22} ${r * 0.32} Z`}
        color="#fff"
      />
    </Group>
  );
}

// ── Boss captain ────────────────────────────────────────────────────
// Pirate captain — big, dark crimson, bicorn hat, eyepatch, scar,
// gold tooth, scowl. Drawn at radius=0.7m so it fills more space.
function drawBossCaptain({ cx, cy, angle, radius }: SpriteOpts) {
  const r = radius ?? 40;
  return (
    <Group transform={[{ translateX: cx }, { translateY: cy }, { rotate: angle }]}>
      <Circle cx={0} cy={r * 0.08} r={r * 1.08} color={SHADOW} />
      <Circle cx={0} cy={0} r={r * 1.06} color={OUTLINE} />
      <Circle cx={0} cy={0} r={r} color="#7f0000" />
      {/* Body shading */}
      <Path
        path={`M ${r * 0.95} ${r * 0.0}
               Q ${r * 0.85} ${r * 0.85} ${r * 0.0} ${r * 0.95}
               Q ${r * 0.5} ${r * 0.6} ${r * 0.7} ${r * 0.0} Z`}
        color="#5a0000"
      />
      {/* Bicorn hat */}
      <Path
        path={`M ${-r * 1.05} ${-r * 0.4}
               Q ${-r * 0.75} ${-r * 1.2} ${0} ${-r * 0.7}
               Q ${r * 0.75} ${-r * 1.2} ${r * 1.05} ${-r * 0.4}
               Q ${r * 0.7} ${-r * 0.4} ${r * 0.55} ${-r * 0.32}
               Q 0 ${-r * 0.5} ${-r * 0.55} ${-r * 0.32}
               Q ${-r * 0.7} ${-r * 0.4} ${-r * 1.05} ${-r * 0.4} Z`}
        color={OUTLINE}
      />
      {/* Hat stripe */}
      <Path
        path={`M ${-r * 0.7} ${-r * 0.55}
               Q 0 ${-r * 0.42} ${r * 0.7} ${-r * 0.55}
               L ${r * 0.7} ${-r * 0.45}
               Q 0 ${-r * 0.32} ${-r * 0.7} ${-r * 0.45} Z`}
        color="#ffd166"
      />
      {/* Skull insignia centre */}
      <Circle cx={0} cy={-r * 0.55} r={r * 0.13} color="#fff" />
      <Circle cx={-r * 0.05} cy={-r * 0.57} r={r * 0.025} color={OUTLINE} />
      <Circle cx={+r * 0.05} cy={-r * 0.57} r={r * 0.025} color={OUTLINE} />
      {/* Scar (left side, diagonal red line) */}
      <Path
        path={`M ${-r * 0.45} ${-r * 0.2}
               L ${-r * 0.25} ${r * 0.15}`}
        color="#ff8888"
        style="stroke"
        strokeWidth={r * 0.05}
      />
      {/* Eyepatch (right eye) */}
      <Circle cx={+r * 0.22} cy={r * 0.0} r={r * 0.18} color={OUTLINE} />
      <Path
        path={`M ${r * 0.04} ${-r * 0.15}
               L ${r * 0.55} ${-r * 0.25}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.04}
      />
      {/* Left eye open and angry */}
      <Path
        path={`M ${-r * 0.4} ${-r * 0.2}
               L ${-r * 0.1} ${-r * 0.05}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.07}
      />
      <Circle cx={-r * 0.22} cy={r * 0.02} r={r * 0.1} color="#fff" />
      <Circle cx={-r * 0.22} cy={r * 0.02} r={r * 0.06} color={OUTLINE} />
      {/* Beard */}
      <Path
        path={`M ${-r * 0.4} ${r * 0.25}
               Q ${-r * 0.5} ${r * 0.7} ${-r * 0.2} ${r * 0.85}
               Q 0 ${r * 0.95} ${r * 0.2} ${r * 0.85}
               Q ${r * 0.5} ${r * 0.7} ${r * 0.4} ${r * 0.25}
               Q 0 ${r * 0.4} ${-r * 0.4} ${r * 0.25} Z`}
        color="#2a0a0a"
      />
      {/* Snarl */}
      <Path
        path={`M ${-r * 0.2} ${r * 0.45}
               L ${r * 0.2} ${r * 0.45}`}
        color={OUTLINE}
        style="stroke"
        strokeWidth={r * 0.06}
      />
      {/* Gold tooth */}
      <Path
        path={`M ${-r * 0.06} ${r * 0.45}
               L ${r * 0.06} ${r * 0.45}
               L ${r * 0.06} ${r * 0.55}
               L ${-r * 0.06} ${r * 0.55} Z`}
        color="#ffd166"
      />
    </Group>
  );
}

registerSprite("enemy", drawEnemy);
registerSprite("boss_captain", drawBossCaptain);
