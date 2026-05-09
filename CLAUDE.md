# Slam Goal — operating notes for Claude

This repo is a pnpm workspace. The shipping app lives at
`artifacts/slamgoal/`; the marketing site at `artifacts/web/`.
Most session work targets the app — `cd artifacts/slamgoal` for
`pnpm`, EAS, or `expo` commands.

## Project status (May 2026)

This codebase is a fork of the production **Bubble Masters / fruit-clash**
Suika-style merge game, mid-rebuild as **Slam Goal** — an
Angry-Birds-style landscape physics-destruction football game (working
title; see `REBRANDING.md` for the identity-swap checklist and the build
plan at `/root/.claude/plans/can-you-read-docx-delegated-haven.md` for
the phased rollout).

**Phases 0-2 have landed.** External IDs (bundle IDs, AdMob,
RevenueCat, AppsFlyer, EAS project ID, ASC App ID) are placeholders —
`grep -r "REPLACE_WITH_"` to find them.

- Phase 0: identity rebrand to Slam Goal.
- Phase 1: stripped Bubble Masters merge gameplay, locked landscape.
- Phase 2: physics layer wired — `planck.js` (Box2D port, JS) +
  `@shopify/react-native-skia`. Smoke test at `/smoketest` route
  drops N bouncing bodies and shows an FPS overlay. **Pure JS
  physics, not native C++** — runs in Expo Go for fast iteration,
  ships as a real native app via EAS. Migration to native C++
  Box2D is bounded (swap `lib/physics.ts` for a native bridge);
  trigger if profiling shows the JS step is the bottleneck above
  ~100 dynamic bodies on a Galaxy A14.

The next milestone is Phase 3: slingshot input + first footballer
+ level loader + scoring + results screen.

## Release workflow — non-negotiable

**`main` is the integration trunk. Every TestFlight build comes from
`main`. Every OTA update comes from `main`. No exceptions.**

- Develop on a feature/side branch.
- Merge to `main` when ready to ship.
- Always build from a clean, up-to-date `main`.

The `build:production` and `update:production` scripts in
`artifacts/slamgoal/package.json` enforce this — they refuse to
run unless current branch is `main`, the working tree is clean,
and `HEAD` matches `origin/main` exactly. Don't bypass these
guards. If a guard is firing, fix the underlying state (commit,
push, merge), don't edit the script around it.

### Native build vs. OTA — pick the right tool

| Change touches | Run |
|---|---|
| Native deps, `app.json` plugins, native config, app version, the C++ physics module | `pnpm build:production` (new TestFlight build, auto-submits) |
| JS / TSX / assets / strings / level JSON | `pnpm update:production` (OTA push to production channel) |

`runtimeVersion.policy: "appVersion"` in `app.json` means OTA updates only reach
clients on the same `version` string — bumping `version` requires a full build.

### Side branches

When working on a side branch:
- Push commits to **both** the side branch and `main` only when
  shipping (typically: merge to `main`, then push `main`). The
  stop-hook will flag unpushed commits on the side branch — keep
  them in sync to avoid the warning, but the build still has to
  come from `main`.
- Don't run `pnpm build:production` from the side branch — the
  guard will reject it.

## Known traps (don't reintroduce)

These are inherited from the Bubble Masters era but apply identically
to Slam Goal because the integration plumbing is the same.

- **AdMob banner: use fixed `BannerAdSize.BANNER` (320×50), not
  `ANCHORED_ADAPTIVE_BANNER`.** Adaptive measures the parent's
  width through the native bridge; `<AdBanner>`'s wrapper uses
  `alignItems: "center"` which doesn't give a definite child
  width, so the SDK measured 0/invalid and rejected every banner
  request. Fixed `BANNER` has intrinsic size and bypasses this.
  See `components/AdBanner.tsx`.
- **GMA preload error handlers must retry.** A naive `cachedX = null`
  on ERROR with no rebuild left rewarded ads dead for the rest of
  the session after a single transient failure. `lib/ads.ts`
  schedules a 5 s `setTimeout(preloadX, 5000)` from the ERROR
  handler — keep it. If you add a new ad format, do the same.
- **`react-native-google-mobile-ads` plugin keys are camelCase.**
  `iosAppId` / `androidAppId` / `userTrackingUsageDescription` /
  `skAdNetworkItems`. Snake_case looks plausible but the plugin
  silently treats every value as `undefined`, then native crashes
  at launch on missing `GADApplicationIdentifier`. See `app.json`
  under the `react-native-google-mobile-ads` plugin entry.

## Leaderboards (cross-platform)

`lib/gameCenter.ts` is a **platform-dispatch layer**. It picks the right
native bridge per `Platform.OS`:

- iOS → `expo-game-center` (custom local module, GameKit / Apple).
- Android → `expo-play-games-services` (custom local module, Google Play Games v2).
- Expo Go / web → no-op stubs.

Both bridges expose the same TS surface (`isAvailable`, `authenticate`, `submitScore`, `presentLeaderboard`) so the dispatch is just a `Platform.OS` switch. Don't re-introduce iOS-only assumptions in `gameCenter.ts`.

Leaderboard IDs differ per platform: iOS uses reverse-DNS bundle-id strings, Android uses Console-generated opaque IDs. `constants/gameCenter.ts` exposes `leaderboardIdForWorld(worldId)` and `overallLeaderboardId()` that resolve to the active platform's ID. The Android map (`ANDROID_LEADERBOARD_IDS_BY_WORLD`) starts empty — populate it as leaderboards are created in Play Games Console.

The Android plugin (`plugins/withPlayGamesServices.js`) writes the Play Games App ID into `AndroidManifest.xml` + `strings.xml`. The App ID lives in `app.json` under the plugin's config block — replace `REPLACE_WITH_PLAY_CONSOLE_APP_ID` with the value from Play Console → Game services → Configuration.

## Image optimisation

`assets/images/` ships as **WebP at quality 80, max 512 px** for sprites and **max 1024 px** for `bg-*` / `map-bg` / `splash-*` backgrounds. iOS and Android both use the same files — there's no platform-split. Source PNGs at 1024×1024 RGBA are wasteful (rendered sprites are ≤ 280 px on screen, so the extra resolution is downsampled-and-thrown-away every frame), and Play Console's 200 MB compressed-bundle cap makes them a hard blocker on Android.

For Slam Goal's larger sprite atlases (per the design doc, 2048×2048
per world), the script will need a tunable `--max` flag — extend
`scripts/optimize-images.mjs` when Phase 5 art lands.

### Adding a new image batch (PNG source)

```bash
# Drop the PNGs into artifacts/slamgoal/assets/images/, then:
pnpm optimize:images
# Update imports in callers to reference .webp instead of .png.
git add -A
git commit -m "feat(theme): add <name> assets"
```

The script is idempotent — only touches `.png` files, ignores existing `.webp`, won't double-process. Safe to run any time.

### Don't reintroduce PNGs at runtime

If you find PNG files in `assets/images/`, run the script. Don't ship them — Android Play Console will reject the upload, and iOS download sizes balloon for no quality gain.

## Audio

All SFX are `.mp3` (was `.wav`; switched for size). Catalogue at
`hooks/useSfx.ts:38` keyed by `SfxName`. Filenames must be
camelCase to match the keys (`mergeBig.mp3`, not `mergebig.mp3`)
since Metro's `require()` is case-sensitive.

The current SFX library is the merge-game inventory. Slam Goal's
~150-sound library (slingshot, materials, abilities, environment,
crowd) gets authored in Phase 4-5; the keying convention stays the
same.

## Where things live (current state)

- **Reusable shell (kept from Bubble Masters):**
  - `lib/ads.ts`, `lib/adConfig.ts`, `components/AdBanner.tsx` — AdMob
  - `lib/purchases.ts`, `context/PurchasesContext.tsx` — RevenueCat
  - `lib/gameCenter.ts` + `modules/expo-game-center/` + `modules/expo-play-games-services/` — leaderboards
  - `lib/icloudKV.ts` + `modules/expo-icloud-kv/` — cross-device save sync
  - `lib/analytics.ts` — AppsFlyer
  - `hooks/useSfx.ts`, `hooks/useMusic.ts` — audio playback (sound files swap, code stays)
  - `app/_layout.tsx`, `app/leaderboard.tsx` — navigation + leaderboard UI
  - `app/+not-found.tsx` — 404
- **Stripped in Phase 1 (no longer present):**
  - `app/game.tsx`, `app/themes.tsx`, `app/worlds.tsx` — old merge UI
  - `hooks/usePhysicsGame.ts` — old JS merge physics engine
  - `constants/{worlds,levels,playerImages,dailyQuests}.ts`
  - `components/DailyQuestsCard.tsx`
  - Merge-specific portions of `context/GameContext.tsx` and `app/index.tsx`
- **Phase 2 (landed):**
  - `lib/physics.ts` — thin wrapper around planck.js
  - `components/PhysicsCanvas.tsx` — Skia canvas + JS-thread RAF loop
  - `app/smoketest.tsx` — perf canary route (FPS overlay, 50-100 bodies)
- **Coming in Phase 3+:**
  - New `app/game.tsx` — slingshot + level renderer
  - `components/{Slingshot,ResultsScreen}.tsx`
  - `constants/{footballers,materials}.ts`
  - `lib/levelLoader.ts` + `assets/levels/world-1/*.json`

## Stylistic conventions

- Don't add comments that explain what well-named code does.
  Comments are for **why** — hidden constraints, workarounds,
  surprising behavior. The existing codebase follows this; match
  it.
- TypeScript strict mode is on.
- No new files unless required. Edit existing ones.

## Testing

`pnpm typecheck` is the closest thing to CI — run it before
committing anything that touches types. There's no test suite to
run; functional verification is via the dev client or a TestFlight
build.
