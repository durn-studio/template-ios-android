import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// Slam Goal — the logo mark.
// (Inherited from Bubble Masters; placeholder until the slingshot-
// boot mark is drawn in Phase 5.)
//
// Pure SVG, theme-agnostic. A smaller amber bubble merging into a large
// royal-violet orb, topped by an editorial crown with a ruby gem and
// two amber accents. Reads as "merge game for kings" in one glance.
//
// Composition rules pulled from the BombIcon / SwapIcon / EarthquakeIcon
// editorial family:
//   • Two-stop linear gradients only (no radial shine on the body)
//   • One restrained ambient highlight per orb
//   • Slightly asymmetric so the mark feels drawn, not stencilled
//   • A single warm-colour accent (the gold crown + amber satellite)
//     against a cool-colour body (indigo/violet orb)
//
// The old version depended on two Argentine superstar PNGs, which
// locked the brand to football. With themes expanding to food, pop
// stars, landmarks, and more, the new mark is illustrative rather
// than photographic — one SVG, any size, any theme.
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* Main orb — indigo top-left, violet mid, deep purple base.
              Gives the body premium depth without a specular shine. */}
          <LinearGradient id="logoMain" x1="0.2" y1="0.15" x2="0.8" y2="0.95">
            <Stop offset="0" stopColor="#818CF8" />
            <Stop offset="0.5" stopColor="#7C3AED" />
            <Stop offset="1" stopColor="#2E1065" />
          </LinearGradient>

          {/* Satellite — warm cream → amber → rust. Complements the
              cool-violet orb and ties the mark to the gold crown. */}
          <LinearGradient id="logoSat" x1="0.2" y1="0.15" x2="0.8" y2="0.95">
            <Stop offset="0" stopColor="#FDE68A" />
            <Stop offset="0.55" stopColor="#F59E0B" />
            <Stop offset="1" stopColor="#92400E" />
          </LinearGradient>

          {/* Crown — three-stop gold bevel (cream → amber → bronze) so
              the metal has top-down depth without looking chrome. */}
          <LinearGradient id="logoCrown" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FEF3C7" />
            <Stop offset="0.5" stopColor="#F59E0B" />
            <Stop offset="1" stopColor="#92400E" />
          </LinearGradient>

          {/* Ambient halo behind the main orb — soft radial violet
              wash so the mark doesn't feel pasted on a black square
              when used as the iOS app icon. */}
          <RadialGradient id="logoHalo" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#A855F7" stopOpacity="0.4" />
            <Stop offset="0.75" stopColor="#A855F7" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Soft halo — only visible against darker backgrounds; fades
            invisibly against white. */}
        <Circle cx="50" cy="62" r="44" fill="url(#logoHalo)" />

        {/* ── Crown ──────────────────────────────────────────────────
            Five-peak silhouette. Centre peak is tallest (classic
            regalia composition). Drawn as one filled path so there's
            no seam between spikes. */}
        <Path
          d="M 22 32 L 26 14 L 34 22 L 42 8 L 50 20 L 58 8 L 66 22 L 74 14 L 78 32 Z"
          fill="url(#logoCrown)"
          stroke="#78350F"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Crown base band — the horizontal strip that meets the
            orb. Overlaps the top of the orb by ~4 px so the crown
            reads as sitting *on* the bubble. */}
        <Path
          d="M 22 30 L 78 30 L 78 37 L 22 37 Z"
          fill="url(#logoCrown)"
          stroke="#78350F"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Centre gem — ruby red with a single cream glint. */}
        <Circle cx="50" cy="19" r="2.6" fill="#DC2626" />
        <Circle cx="49" cy="17.8" r="0.9" fill="#FCA5A5" opacity="0.9" />
        {/* Side amber accents on the second-tallest peaks. */}
        <Circle cx="34" cy="22" r="1.4" fill="#FDE68A" />
        <Circle cx="66" cy="22" r="1.4" fill="#FDE68A" />
        {/* Crown edge highlights — thin cream strokes along peak
            faces so the gold has bevel definition at small sizes. */}
        <Path
          d="M 26 15 L 32 21"
          stroke="#FEF3C7"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <Path
          d="M 43 9 L 49 19"
          stroke="#FEF3C7"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <Path
          d="M 51 19 L 57 9"
          stroke="#FEF3C7"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.85"
        />
        <Path
          d="M 68 21 L 74 15"
          stroke="#FEF3C7"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* ── Main orb ──────────────────────────────────────────────
            The master bubble. Big, saturated, anchors the mark. */}
        <Circle cx="50" cy="62" r="34" fill="url(#logoMain)" />
        {/* Rim light — thin white stroke around the edge, low opacity
            so it reads as subtle glass rim, not a highlighted ring. */}
        <Circle
          cx="50"
          cy="62"
          r="34"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.5"
          opacity="0.3"
        />
        {/* Ambient highlight — angled crescent at upper-left. */}
        <Ellipse
          cx="35"
          cy="48"
          rx="11"
          ry="5"
          fill="#FFFFFF"
          opacity="0.38"
          transform="rotate(-25 35 48)"
        />
        {/* Single pin-glint — the BombIcon "one intentional point of
            light" rule, applied here to unify the icon family. */}
        <Circle cx="39" cy="46" r="1.6" fill="#FFFFFF" opacity="0.9" />

        {/* ── Satellite orb ─────────────────────────────────────────
            A smaller warm bubble nudging into the main orb's lower-
            right quadrant — the exact silhouette of a Suika-style
            merge a frame before it snaps. */}
        <Circle cx="82" cy="78" r="11" fill="url(#logoSat)" />
        <Circle
          cx="82"
          cy="78"
          r="11"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.35"
          opacity="0.4"
        />
        <Ellipse
          cx="78"
          cy="74"
          rx="3.5"
          ry="1.7"
          fill="#FFFFFF"
          opacity="0.55"
          transform="rotate(-25 78 74)"
        />

        {/* ── Merge sparkles ────────────────────────────────────────
            Four dots at the contact point between the two orbs. Two
            in white, two in cream so the twinkle has tonal variety
            rather than feeling copy-pasted. */}
        <Circle cx="72" cy="69" r="1.4" fill="#FFFFFF" opacity="0.95" />
        <Circle cx="67" cy="75" r="0.8" fill="#FEF3C7" opacity="0.85" />
        <Circle cx="76" cy="65" r="1.1" fill="#FFFFFF" opacity="0.9" />
        <Circle cx="79" cy="72" r="0.6" fill="#FEF3C7" opacity="0.75" />
      </Svg>
    </View>
  );
}
