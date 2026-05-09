# Operating notes for Claude

This repo is a **React Native (Expo) template** for new iOS +
Android apps. The active starter lives at `artifacts/expo-template/`
— all session work targets it. Past projects (Bubble Masters, Slam
Goal, the API server, codegen libs, marketing site) are kept under
`artifacts/_archive/` for reference; don't develop against them,
but they're a useful source when wiring a new feature that mirrors
something we've shipped before.

`cd artifacts/expo-template` for `pnpm`, EAS, or `expo` commands.

## What's in the template

- SDK plumbing: `lib/{ads,adConfig,interstitial,purchases,analytics,gameCenter,icloudKV,social}.ts`
  + `components/AdBanner.tsx` + `context/PurchasesContext.tsx`
- Custom local Expo modules: `modules/expo-game-center`,
  `expo-play-games-services`, `expo-icloud-kv`
- Plugins: `plugins/with{AdMobMediation,GameCenter,ICloudKV,PlayGamesServices,RemoveAndroidPermissions}.js`
- Audio infra: `hooks/useSfx.ts`, `hooks/useMusic.ts` + sample mp3s
- App shell: `app/{_layout,index,leaderboard,smoketest,+not-found}.tsx`,
  `ErrorBoundary`, `LoadingOverlay`, `BottomSheet`,
  `KeyboardAwareScrollViewCompat`, `Logo`, `PhysicsCanvas`
- Build/release: `eas.json`, `app.json` (with placeholders),
  `scripts/optimize-images.mjs`, the `build:production` /
  `update:production` guards in `package.json`

The example screens are deliberately minimal:

- `app/index.tsx` — hello menu linking to the two demos.
- `app/smoketest.tsx` — planck.js + Skia bouncing bodies + FPS
  overlay. Acts as the example game and as a perf canary.
- `app/leaderboard.tsx` — exercises the cross-platform leaderboard
  bridge (Game Center on iOS, Play Games on Android).

Replace these with your app. Keep the bootstrap order in
`app/_layout.tsx` (AppsFlyer → ATT → AdMob → app-open ad → splash
hide) — it took several iterations to get right and is documented
inline.

## First-time per-project checklist

After copying this repo into a new project, run through:

1. Rename the workspace: `package.json` `name`, root `README.md`,
   `pnpm-workspace.yaml` if you restructure.
2. `grep -r "REPLACE_WITH_"` and fill in: bundle IDs, AdMob app IDs
   + ad unit IDs, RevenueCat API keys, AppsFlyer dev key + Apple
   App ID, Play Console App ID for Play Games, EAS project ID, ASC
   App ID, backend API URL.
3. Replace `assets/images/{icon.png,splash-bg.png}` with your app
   art. Re-run `node scripts/generate-app-icon.mjs` if you keep an
   SVG-driven icon (script is archived — copy from
   `artifacts/_archive/root-scripts/`).
4. Author or import the SFX + music files referenced by
   `hooks/useSfx.ts` / `hooks/useMusic.ts`, or trim those hooks to
   match the assets you actually have.
5. Set up leaderboards in App Store Connect + Play Games Console,
   populate `constants/gameCenter.ts` with the IDs.

## Known traps (don't reintroduce)

These are inherited from prior shipping versions of this repo and
apply to anything built on top of the same plumbing.

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
  at launch on missing `GADApplicationIdentifier`. See `app.json`.

## Leaderboards (cross-platform)

`lib/gameCenter.ts` is a **platform-dispatch layer**. It picks the
right native bridge per `Platform.OS`:

- iOS → `expo-game-center` (custom local module, GameKit / Apple).
- Android → `expo-play-games-services` (custom local module, Google
  Play Games v2).
- Expo Go / web → no-op stubs.

Both bridges expose the same TS surface (`isAvailable`,
`authenticate`, `submitScore`, `presentLeaderboard`) so the
dispatch is just a `Platform.OS` switch. Don't re-introduce
iOS-only assumptions in `gameCenter.ts`.

Leaderboard IDs differ per platform: iOS uses reverse-DNS
bundle-id strings, Android uses Console-generated opaque IDs.
`constants/gameCenter.ts` exposes `leaderboardIdForWorld(id)` and
`overallLeaderboardId()` that resolve to the active platform's ID.
The Android map (`ANDROID_LEADERBOARD_IDS_BY_WORLD`) starts empty —
populate it as you create leaderboards in Play Games Console.

The Android plugin (`plugins/withPlayGamesServices.js`) writes the
Play Games App ID into `AndroidManifest.xml` + `strings.xml`. The
App ID lives in `app.json` under the plugin's config block —
replace `REPLACE_WITH_PLAY_CONSOLE_APP_ID` with the value from Play
Console → Game services → Configuration.

## Image optimisation

`assets/images/` ships as **WebP at quality 80, max 512 px** for
sprites and **max 1024 px** for `bg-*` / `splash-*` backgrounds.
Source PNGs at 1024×1024 RGBA are wasteful (rendered sprites are
≤ 280 px on screen) and Play Console's 200 MB compressed-bundle cap
makes them a hard blocker on Android.

```bash
# Drop the PNGs into artifacts/expo-template/assets/images/, then:
pnpm optimize:images
```

The script is idempotent — only touches `.png` files, ignores
existing `.webp`, won't double-process. Safe to run any time.

If you find PNG files in `assets/images/` at commit time, run the
script. Don't ship them — Play Console will reject the upload, and
iOS download sizes balloon for no quality gain.

## Audio

The SFX catalogue is at `hooks/useSfx.ts` keyed by `SfxName`.
Filenames must be camelCase to match the keys (`mergeBig.mp3`, not
`mergebig.mp3`) since Metro's `require()` is case-sensitive. All
sounds are `.mp3` (not `.wav`) for size.

The current files are placeholders inherited from the merge-game
era — swap them for your project's sounds and update the `SfxName`
union and the `SFX_SOURCES` map together.

## Stylistic conventions

- Don't add comments that explain what well-named code does.
  Comments are for **why** — hidden constraints, workarounds,
  surprising behavior. The existing codebase follows this; match it.
- TypeScript strict mode is on.
- No new files unless required. Edit existing ones.

## Testing

`pnpm typecheck` is the closest thing to CI — run it before
committing anything that touches types. There's no test suite to
run; functional verification is via the dev client or a TestFlight
build.
