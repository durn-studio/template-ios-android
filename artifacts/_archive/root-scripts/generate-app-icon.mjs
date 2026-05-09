// Rasterise the Slam Goal SVG mark to a 1024×1024 PNG app icon.
//
// Matches components/Logo.tsx (inherited Bubble Masters mark, will
// be redrawn as the slingshot-boot logo in Phase 5). Pure SVG, no
// face PNGs. Composed against a navy background so the iOS icon
// renders with zero alpha (Apple rejects transparent icons).
//
// Run: `node scripts/generate-app-icon.mjs`
// Output: artifacts/slamgoal/assets/images/icon.png (1024×1024 RGB)

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import fs from "node:fs";

const ICON_PATH =
  "/home/user/slamgoal/artifacts/slamgoal/assets/images/icon.png";

// Same composition as components/Logo.tsx. The Logo's 100×100 viewBox
// is scaled up 8.2× and offset so the mark sits roughly centred in
// the 1024×1024 canvas, leaving ~100 px of breathing room on each
// side before iOS clips to the rounded-square icon shape.
const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1E1B4B"/>
      <stop offset="1" stop-color="#0d1b2a"/>
    </linearGradient>
    <linearGradient id="mainOrb" x1="0.2" y1="0.15" x2="0.8" y2="0.95">
      <stop offset="0" stop-color="#818CF8"/>
      <stop offset="0.5" stop-color="#7C3AED"/>
      <stop offset="1" stop-color="#2E1065"/>
    </linearGradient>
    <linearGradient id="satOrb" x1="0.2" y1="0.15" x2="0.8" y2="0.95">
      <stop offset="0" stop-color="#FDE68A"/>
      <stop offset="0.55" stop-color="#F59E0B"/>
      <stop offset="1" stop-color="#92400E"/>
    </linearGradient>
    <linearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FEF3C7"/>
      <stop offset="0.5" stop-color="#F59E0B"/>
      <stop offset="1" stop-color="#92400E"/>
    </linearGradient>
    <radialGradient id="haloGrad" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#A855F7" stop-opacity="0.55"/>
      <stop offset="0.75" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Full-bleed navy background (no alpha for App Store compliance) -->
  <rect x="0" y="0" width="1024" height="1024" fill="url(#bgGrad)"/>

  <!-- 8.2× scale of the Logo's 100×100 composition, centred. -->
  <g transform="translate(102 102) scale(8.2)">
    <!-- Ambient halo -->
    <circle cx="50" cy="62" r="44" fill="url(#haloGrad)"/>

    <!-- Crown -->
    <path d="M 22 32 L 26 14 L 34 22 L 42 8 L 50 20 L 58 8 L 66 22 L 74 14 L 78 32 Z"
          fill="url(#crownGrad)" stroke="#78350F" stroke-width="0.5" stroke-linejoin="round"/>
    <path d="M 22 30 L 78 30 L 78 37 L 22 37 Z"
          fill="url(#crownGrad)" stroke="#78350F" stroke-width="0.5" stroke-linejoin="round"/>
    <!-- Centre gem -->
    <circle cx="50" cy="19" r="2.6" fill="#DC2626"/>
    <circle cx="49" cy="17.8" r="0.9" fill="#FCA5A5" opacity="0.9"/>
    <!-- Side gems -->
    <circle cx="34" cy="22" r="1.4" fill="#FDE68A"/>
    <circle cx="66" cy="22" r="1.4" fill="#FDE68A"/>
    <!-- Peak bevel highlights -->
    <path d="M 26 15 L 32 21" stroke="#FEF3C7" stroke-width="0.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M 43 9 L 49 19"  stroke="#FEF3C7" stroke-width="0.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M 51 19 L 57 9"  stroke="#FEF3C7" stroke-width="0.5" stroke-linecap="round" opacity="0.85"/>
    <path d="M 68 21 L 74 15" stroke="#FEF3C7" stroke-width="0.5" stroke-linecap="round" opacity="0.85"/>

    <!-- Main orb -->
    <circle cx="50" cy="62" r="34" fill="url(#mainOrb)"/>
    <circle cx="50" cy="62" r="34" fill="none" stroke="#FFFFFF" stroke-width="0.5" opacity="0.3"/>
    <!-- Ambient highlight -->
    <ellipse cx="35" cy="48" rx="11" ry="5" fill="#FFFFFF" opacity="0.38" transform="rotate(-25 35 48)"/>
    <!-- Pin glint -->
    <circle cx="39" cy="46" r="1.6" fill="#FFFFFF" opacity="0.9"/>

    <!-- Satellite orb -->
    <circle cx="82" cy="78" r="11" fill="url(#satOrb)"/>
    <circle cx="82" cy="78" r="11" fill="none" stroke="#FFFFFF" stroke-width="0.35" opacity="0.4"/>
    <ellipse cx="78" cy="74" rx="3.5" ry="1.7" fill="#FFFFFF" opacity="0.55" transform="rotate(-25 78 74)"/>

    <!-- Merge sparkles -->
    <circle cx="72" cy="69" r="1.4" fill="#FFFFFF" opacity="0.95"/>
    <circle cx="67" cy="75" r="0.8" fill="#FEF3C7" opacity="0.85"/>
    <circle cx="76" cy="65" r="1.1" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="79" cy="72" r="0.6" fill="#FEF3C7" opacity="0.75"/>
  </g>
</svg>
`;

// 1. Rasterise SVG at full 1024×1024.
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1024 },
  background: "#0d1b2a",
});
const backdrop = resvg.render().asPng();

// 2. Flatten alpha + re-encode as RGB only. Apple rejects app icons
//    that have any alpha channel declared, even if every pixel is
//    fully opaque.
await sharp(backdrop)
  .flatten({ background: "#0d1b2a" })
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(ICON_PATH + ".tmp");

fs.renameSync(ICON_PATH + ".tmp", ICON_PATH);
const stat = fs.statSync(ICON_PATH);
console.log(
  `✓ wrote ${ICON_PATH}  (${stat.size.toLocaleString()} bytes, 1024×1024 RGB)`,
);
