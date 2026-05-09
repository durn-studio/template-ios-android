import React from "react";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

// Gold-coin SVG — minted look with an embossed "$" centred on the
// face. Used everywhere we display the in-game currency: the
// currency pill, top-up sheet, daily-rewards grid, locked-theme
// cost badge, game-over coin reward, etc.
//
// Construction (outside → inside):
//   1. Outer rim: linear-gradient ring that paints from a bright
//      yellow upper-left to a deep amber lower-right, giving the
//      coin its 3-D "this side faces a light source" cue.
//   2. Inner face: radial gradient anchored at the top-left of the
//      face so the highlight sits where the rim glow points to,
//      fading out to the deeper amber at the rim. Same warm palette
//      the rest of the game uses for coins / hearts.
//   3. Inner emboss ring: a subtle dark hairline just inside the
//      rim — the visual cue that distinguishes a coin face from a
//      flat disc.
//   4. Specular glint: small soft-white blob in the upper-left
//      quadrant for a "polished metal" feel.
//   5. "$" glyph: rendered as SvgText in a heavy weight. Two
//      passes — a transparent amber drop-shadow underneath and the
//      dark amber main glyph on top — to mimic the engraved depth
//      of a struck coin without a heavy shadow filter.
export function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="coinRim" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FCD34D" />
          <Stop offset="0.55" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#B45309" />
        </LinearGradient>
        <RadialGradient
          id="coinFace"
          cx="0.35"
          cy="0.32"
          r="0.95"
          fx="0.35"
          fy="0.32"
        >
          <Stop offset="0" stopColor="#FFF7CC" />
          <Stop offset="0.4" stopColor="#FCD34D" />
          <Stop offset="0.85" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#B45309" />
        </RadialGradient>
      </Defs>

      <Circle cx="12" cy="12" r="11" fill="url(#coinRim)" />
      <Circle cx="12" cy="12" r="9" fill="url(#coinFace)" />
      <Circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="#92400E"
        strokeOpacity="0.5"
        strokeWidth="0.4"
      />

      {/* Soft top-left specular highlight */}
      <Circle
        cx="8.5"
        cy="8.2"
        r="2.4"
        fill="#FFFDEA"
        opacity="0.55"
      />

      {/* "$" — drop pass for depth */}
      <SvgText
        x="12"
        y="16.6"
        fontSize="14"
        fontWeight="900"
        fill="#7C2D12"
        fillOpacity="0.45"
        textAnchor="middle"
      >
        $
      </SvgText>
      {/* "$" — main pass */}
      <SvgText
        x="12"
        y="16.2"
        fontSize="14"
        fontWeight="900"
        fill="#92400E"
        textAnchor="middle"
      >
        $
      </SvgText>
    </Svg>
  );
}
