import React from "react";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

// Gold trophy SVG for the "Cups" tile and any "winners / tournament"
// affordance. Same gold gradient language as CoinIcon and the
// best-value product highlight so all the premium accents match.
export function TrophyIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FDE047" />
          <Stop offset="0.5" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#B45309" />
        </LinearGradient>
        <LinearGradient id="trophyFaceShine" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FEF3C7" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Left handle */}
      <Path
        d="M6 5 Q3 5 3 8 Q3 10.5 6 11.5 L6 9.7 Q5 9 5 7.5 Q5 6.5 6 6.5 Z"
        fill="url(#trophyGold)"
      />
      {/* Right handle */}
      <Path
        d="M18 5 Q21 5 21 8 Q21 10.5 18 11.5 L18 9.7 Q19 9 19 7.5 Q19 6.5 18 6.5 Z"
        fill="url(#trophyGold)"
      />

      {/* Cup bowl — rounded trapezoid */}
      <Path
        d="M5.5 3.8 L18.5 3.8 L18 12.5 Q17 15.5 12 15.5 Q7 15.5 6 12.5 Z"
        fill="url(#trophyGold)"
      />
      {/* Bowl face shine */}
      <Path
        d="M7.5 5 L10 5 L9.2 11 Q8.5 11.5 7.8 10.5 Z"
        fill="url(#trophyFaceShine)"
      />

      {/* Stem */}
      <Rect x="10.5" y="15.5" width="3" height="3.5" fill="url(#trophyGold)" />
      {/* Base plate */}
      <Rect x="7.5" y="19" width="9" height="2.2" rx="0.6" fill="url(#trophyGold)" />
      {/* Base pedestal — slightly wider foot for stability */}
      <Rect x="6.5" y="20.8" width="11" height="0.8" rx="0.4" fill="#B45309" />
    </Svg>
  );
}
