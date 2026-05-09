import React from "react";
import { Dimensions } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

// Painterly-but-geometric dawn scene used as the home-screen backdrop.
//
// Composition (bottom-up):
//   1. Sky: 5-stop vertical gradient — deep violet → indigo → cyan →
//      soft pink → warm amber at the horizon. Matches the PLAY button
//      palette so the whole page reads as one system.
//   2. Star field: ~30 faint dots in the upper band, irregular sizes.
//   3. Sun disc + radial glow behind the mountains.
//   4. Three soft cloud ellipses at low opacity.
//   5. Distant mountain silhouette — gently rolling, mid-indigo.
//   6. Near mountain silhouette — taller, near-black, anchors the
//      bottom edge.
//
// Rendered as a full-bleed SVG so it scales to any phone size without
// blur. No external asset, no licensing concerns.

const { width, height } = Dimensions.get("window");

// Pre-computed pseudo-random star positions (stable across renders so
// the sky doesn't twinkle-shuffle between frames).
const STARS: Array<{ x: number; y: number; r: number; o: number }> = [
  { x: 0.06, y: 0.04, r: 1.0, o: 0.75 },
  { x: 0.14, y: 0.08, r: 1.3, o: 0.85 },
  { x: 0.22, y: 0.03, r: 0.8, o: 0.6 },
  { x: 0.31, y: 0.09, r: 1.5, o: 0.9 },
  { x: 0.40, y: 0.05, r: 1.1, o: 0.7 },
  { x: 0.49, y: 0.11, r: 0.9, o: 0.65 },
  { x: 0.58, y: 0.04, r: 1.4, o: 0.88 },
  { x: 0.67, y: 0.07, r: 1.0, o: 0.72 },
  { x: 0.76, y: 0.10, r: 1.2, o: 0.8 },
  { x: 0.85, y: 0.03, r: 0.9, o: 0.65 },
  { x: 0.93, y: 0.08, r: 1.3, o: 0.85 },
  { x: 0.10, y: 0.15, r: 0.8, o: 0.55 },
  { x: 0.25, y: 0.13, r: 1.1, o: 0.7 },
  { x: 0.38, y: 0.16, r: 0.9, o: 0.6 },
  { x: 0.53, y: 0.14, r: 1.2, o: 0.78 },
  { x: 0.65, y: 0.17, r: 1.0, o: 0.68 },
  { x: 0.82, y: 0.15, r: 1.1, o: 0.72 },
  { x: 0.18, y: 0.22, r: 0.8, o: 0.5 },
  { x: 0.34, y: 0.25, r: 1.0, o: 0.6 },
  { x: 0.48, y: 0.21, r: 0.9, o: 0.55 },
  { x: 0.62, y: 0.23, r: 1.1, o: 0.65 },
  { x: 0.78, y: 0.22, r: 0.9, o: 0.55 },
  { x: 0.92, y: 0.20, r: 1.0, o: 0.6 },
  { x: 0.05, y: 0.30, r: 0.8, o: 0.45 },
  { x: 0.43, y: 0.29, r: 0.9, o: 0.5 },
  { x: 0.71, y: 0.28, r: 1.0, o: 0.55 },
];

export function SceneBackground() {
  // SVG viewBox chosen to match device aspect so our fixed-coordinate
  // silhouettes land in sensible places regardless of phone size. 1000
  // is an arbitrary base; Dimensions give us the actual ratio.
  const vw = 1000;
  const vh = Math.round((height / width) * vw);

  // Horizon height — where the near mountains crest. Tweak: lower value
  // = more sky, higher value = more ground.
  const horizon = vh * 0.72;
  const farHorizon = vh * 0.66;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <Defs>
        {/* Sky — deep violet at the top warming to amber at horizon */}
        <LinearGradient id="sceneSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1E1B4B" />
          <Stop offset="0.28" stopColor="#4C1D95" />
          <Stop offset="0.52" stopColor="#6366F1" />
          <Stop offset="0.72" stopColor="#F472B6" />
          <Stop offset="1" stopColor="#FB923C" />
        </LinearGradient>
        {/* Sun halo behind the mountains */}
        <RadialGradient id="sceneSunGlow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FDE047" stopOpacity="0.75" />
          <Stop offset="0.4" stopColor="#F59E0B" stopOpacity="0.45" />
          <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </RadialGradient>
        {/* Distant mountain fade — lighter, flatter */}
        <LinearGradient id="sceneMountainFar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3730A3" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#1E1B4B" stopOpacity="1" />
        </LinearGradient>
        {/* Near mountain — taller silhouette, near-black for depth */}
        <LinearGradient id="sceneMountainNear" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0B0F2E" />
          <Stop offset="1" stopColor="#020617" />
        </LinearGradient>
      </Defs>

      {/* Sky */}
      <Rect x="0" y="0" width={vw} height={vh} fill="url(#sceneSky)" />

      {/* Stars — only the upper half, below the sunrise band */}
      {STARS.map((s, i) => (
        <Circle
          key={i}
          cx={s.x * vw}
          cy={s.y * vh}
          r={s.r}
          fill="#ffffff"
          fillOpacity={s.o}
        />
      ))}

      {/* Sun halo + disc — centered horizontally, tucked just above the
          far horizon so the near mountains cut through it */}
      <Circle
        cx={vw * 0.5}
        cy={farHorizon - 40}
        r={vw * 0.4}
        fill="url(#sceneSunGlow)"
      />
      <Circle
        cx={vw * 0.5}
        cy={farHorizon - 40}
        r={vw * 0.085}
        fill="#FEF3C7"
        fillOpacity="0.9"
      />

      {/* Soft clouds — very low opacity so they read as atmospheric haze */}
      <Ellipse
        cx={vw * 0.18}
        cy={vh * 0.35}
        rx={vw * 0.28}
        ry={vh * 0.03}
        fill="#ffffff"
        fillOpacity="0.13"
      />
      <Ellipse
        cx={vw * 0.80}
        cy={vh * 0.26}
        rx={vw * 0.22}
        ry={vh * 0.025}
        fill="#ffffff"
        fillOpacity="0.10"
      />
      <Ellipse
        cx={vw * 0.48}
        cy={vh * 0.48}
        rx={vw * 0.38}
        ry={vh * 0.035}
        fill="#ffffff"
        fillOpacity="0.07"
      />

      {/* Distant mountain range — gentle rolling silhouette */}
      <Path
        d={[
          `M 0 ${farHorizon}`,
          `L ${vw * 0.08} ${farHorizon - 30}`,
          `L ${vw * 0.18} ${farHorizon - 10}`,
          `L ${vw * 0.32} ${farHorizon - 55}`,
          `L ${vw * 0.42} ${farHorizon - 20}`,
          `L ${vw * 0.54} ${farHorizon - 70}`,
          `L ${vw * 0.68} ${farHorizon - 25}`,
          `L ${vw * 0.78} ${farHorizon - 60}`,
          `L ${vw * 0.88} ${farHorizon - 15}`,
          `L ${vw} ${farHorizon - 40}`,
          `L ${vw} ${vh}`,
          `L 0 ${vh}`,
          `Z`,
        ].join(" ")}
        fill="url(#sceneMountainFar)"
      />

      {/* Near mountain range — sharper peaks, near-black */}
      <Path
        d={[
          `M 0 ${horizon}`,
          `L ${vw * 0.06} ${horizon - 70}`,
          `L ${vw * 0.14} ${horizon - 20}`,
          `L ${vw * 0.24} ${horizon - 110}`,
          `L ${vw * 0.34} ${horizon - 40}`,
          `L ${vw * 0.46} ${horizon - 140}`,
          `L ${vw * 0.58} ${horizon - 60}`,
          `L ${vw * 0.70} ${horizon - 120}`,
          `L ${vw * 0.82} ${horizon - 30}`,
          `L ${vw * 0.92} ${horizon - 90}`,
          `L ${vw} ${horizon - 50}`,
          `L ${vw} ${vh}`,
          `L 0 ${vh}`,
          `Z`,
        ].join(" ")}
        fill="url(#sceneMountainNear)"
      />
    </Svg>
  );
}
