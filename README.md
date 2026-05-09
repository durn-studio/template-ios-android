# Expo iOS + Android template

A reusable starter for shipping a real iOS + Android app via Expo
+ EAS, with the integration plumbing already wired:

- **AdMob** (`react-native-google-mobile-ads`) — banner, interstitial,
  rewarded, app-open. Mediation plugin included.
- **RevenueCat** (`react-native-purchases`) — Pro entitlement +
  consumable IAPs, exposed via `PurchasesContext`.
- **AppsFlyer** — attribution + ATT prompt sequencing on iOS.
- **Game Center / Play Games** — leaderboards via custom local Expo
  modules (`expo-game-center`, `expo-play-games-services`) behind a
  single `lib/gameCenter.ts` dispatch.
- **iCloud Key-Value Store** — cross-device save sync via
  `expo-icloud-kv` (custom local module).
- **Audio** — `expo-audio` SFX + music with mute/volume persistence.
- **Physics smoke test** — `planck.js` + `@shopify/react-native-skia`
  bouncing-bodies demo at `/smoketest`, doubles as perf canary.

The intent is to clone this repo, rename the workspace + bundle ids,
swap the `REPLACE_WITH_*` placeholders for real keys, and ship.
`grep -r "REPLACE_WITH_"` finds them all.

## Layout

```
artifacts/
├── expo-template/    # The actual starter — clone + rename to start
└── _archive/         # Past projects + tooling, kept for reference
```

`artifacts/_archive/` contains the prior incarnations of this repo
(Bubble Masters merge game, Slam Goal football-physics, a Unity
prototype, an Express API server, a Vite marketing site, and the
codegen libs that paired with the API). See
[`artifacts/_archive/README.md`](artifacts/_archive/README.md) for
the index.

## Getting started

```bash
pnpm install
cd artifacts/expo-template
pnpm dev          # expo start
pnpm typecheck
```

Then walk the per-SDK setup notes in `artifacts/expo-template/`.

## Release workflow

`main` is the integration trunk. Every TestFlight build and every
OTA update comes from clean, up-to-date `main`. The
`build:production` and `update:production` scripts in
`artifacts/expo-template/package.json` enforce this — they refuse to
run unless the working tree is clean and `HEAD` matches
`origin/main` exactly. Don't bypass these guards; fix the underlying
state instead.

| Change touches | Run |
|---|---|
| Native deps, `app.json` plugins, native config, app version | `pnpm build:production` |
| JS / TSX / assets / strings | `pnpm update:production` |

`runtimeVersion.policy: "appVersion"` in `app.json` means OTA only
reaches clients on the same `version` string — bumping `version`
requires a full build.
