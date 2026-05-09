import React from "react";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

// Gradient gift-box icon. Pink/red body with a gold ribbon + bow on top.
// The gold matches the coin + Best Value accents already in use;
// pink-to-magenta body keeps the daily-reward tile from feeling like
// another yellow CTA among the cyan/violet siblings.
//
// 24 viewBox so it pairs cleanly with Feather's 24×24 grid — scale via
// the `size` prop.
export function GiftIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="giftBoxBody" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F472B6" />
          <Stop offset="1" stopColor="#BE185D" />
        </LinearGradient>
        <LinearGradient id="giftRibbon" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE047" />
          <Stop offset="1" stopColor="#F59E0B" />
        </LinearGradient>
      </Defs>

      {/* Bow loops — two offset circles on top of the lid */}
      <Circle cx="9.5" cy="5.5" r="2.6" fill="url(#giftRibbon)" />
      <Circle cx="14.5" cy="5.5" r="2.6" fill="url(#giftRibbon)" />
      {/* Bow knot — small rectangle between the loops */}
      <Rect x="11" y="5" width="2" height="4" rx="0.5" fill="#B45309" />

      {/* Lid */}
      <Rect x="2.5" y="8.5" width="19" height="4.5" rx="1.2" fill="url(#giftBoxBody)" />
      {/* Horizontal ribbon across lid */}
      <Rect x="2.5" y="10" width="19" height="1.8" fill="url(#giftRibbon)" />

      {/* Body */}
      <Rect x="3.5" y="13" width="17" height="8.5" rx="1.4" fill="url(#giftBoxBody)" />
      {/* Vertical ribbon down body */}
      <Rect x="10.6" y="13" width="2.8" height="8.5" fill="url(#giftRibbon)" />

      {/* Subtle lid highlight */}
      <Path
        d="M3.5 9 L20.5 9"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}
