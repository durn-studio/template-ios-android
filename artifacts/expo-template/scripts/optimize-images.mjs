#!/usr/bin/env node
// One-shot asset optimisation. Walks `assets/images/` and converts
// every `.png` to a sized `.webp`. Run from the slamgoal workspace
// root (`artifacts/slamgoal/`):
//
//     pnpm optimize:images
//
// or directly: `node scripts/optimize-images.mjs`. The script DELETES
// the original `.png` after writing the `.webp` — commit the diff to
// land the smaller assets.
//
// Why this matters
// ----------------
// Source PNGs in `assets/images/` were exported at 1024×1024 RGBA, so
// `assets/images/` totals ~246 MB. Google Play Console's 200 MB cap on
// any single feature module's compressed download size blocked our
// Android submission. WebP at quality 80 + max-edge 512 px gives a
// 80–90 % size reduction on this content profile (player sprites with
// smooth gradients on transparent background) without a perceptible
// quality loss at the renderer's display density.
//
// Backgrounds (`bg-*.png`, `map-bg.png`, `splash-*.png`) keep the
// 1024 px edge since they fill the screen and benefit from the extra
// resolution on iPad / 6.9" iPhone Pro Max — they're individually
// large but few in count.
//
// After running this once, search-and-replace `.png` → `.webp` in any
// require/path string under `constants/` and any other source that
// references files in `assets/images/`. Metro's image resolver
// handles `.webp` natively on both platforms (RN ≥ 0.71).

import { readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "Missing peer dep `sharp`. Install it first:\n  pnpm add -D sharp\n",
  );
  process.exit(1);
}

const DIR = "assets/images";

// Protected filenames — these MUST stay as PNG because Apple's
// App Store and Google Play require app icons + splash screens as
// PNG. Expo's config plugin reads these paths from app.json and
// passes them to xcodebuild / gradle, both of which reject WebP for
// the icon / splash slots. The web favicon can technically be WebP
// but most browsers historically prefer PNG, so we keep it too.
//
// If you add a new file here, also keep its source PNG in
// `assets/images/` — the script skips it both for conversion AND
// for the post-conversion delete.
const KEEP_AS_PNG = new Set([
  "icon.png",
  "splash-bg.png",
]);

// Filenames that should keep the larger 1024 px edge — anything that
// fills a significant chunk of the screen. Player sprites get the
// 512 px treatment.
const isBackground = (name) => /^(bg-|map-bg|splash)/i.test(name);

// Quality knob. 80 is the sweet spot for PNG→WebP on illustrative
// content; below 75 starts producing visible block artefacts on smooth
// gradients, above 85 has diminishing returns.
const WEBP_QUALITY = 80;

// `effort` is sharp's encoder-CPU/quality slider. 4 keeps a one-shot
// run under ~2 minutes for ~270 files on a typical Mac while still
// producing close-to-optimal sizes. Bump to 6 for a final release
// pass if you want the last few % squeezed out.
const WEBP_EFFORT = 4;

let totalBefore = 0;
let totalAfter = 0;
let processed = 0;
let skipped = 0;

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".png") && !KEEP_AS_PNG.has(f))
  .sort();

if (files.length === 0) {
  console.log(`No .png files found in ${DIR}/. Nothing to do.`);
  process.exit(0);
}

console.log(
  `Optimising ${files.length} PNG${files.length === 1 ? "" : "s"} → WebP…\n`,
);

for (const file of files) {
  const src = join(DIR, file);
  const dst = src.replace(/\.png$/i, ".webp");
  const maxDim = isBackground(file) ? 1024 : 512;

  try {
    await sharp(src)
      .resize({
        width: maxDim,
        height: maxDim,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
      .toFile(dst);

    const before = statSync(src).size;
    const after = statSync(dst).size;
    totalBefore += before;
    totalAfter += after;
    processed += 1;

    const ratio = ((1 - after / before) * 100).toFixed(0);
    console.log(
      `  ${file.padEnd(36)} ${(before / 1024).toFixed(0).padStart(5)}K → ${(after / 1024).toFixed(0).padStart(4)}K  (-${ratio}%)`,
    );
    unlinkSync(src);
  } catch (err) {
    skipped += 1;
    console.warn(`  ! skipped ${file}: ${err.message}`);
  }
}

const beforeMB = (totalBefore / 1024 / 1024).toFixed(1);
const afterMB = (totalAfter / 1024 / 1024).toFixed(1);
const totalRatio = ((1 - totalAfter / totalBefore) * 100).toFixed(0);

console.log(
  `\nDone. ${processed} converted, ${skipped} skipped.`,
);
console.log(
  `Total: ${beforeMB} MB → ${afterMB} MB  (-${totalRatio}%, saved ${(
    (totalBefore - totalAfter) /
    1024 /
    1024
  ).toFixed(1)} MB).`,
);
console.log(`\nNext step: search-and-replace .png → .webp in source files`);
console.log(`that reference assets/images/. Then \`pnpm typecheck\` and commit.`);
