# Slam Goal — Progress Log

A snapshot of everything shipped on this fork from the original
**Bubble Masters / fruit-clash** Suika-style merge game to the
landscape Angry-Birds-style **Slam Goal** football-physics game.

Current branch: `claude/review-readme-branding-j42zq`
Last commit: `472aceb phase Unity 2b`

---

## Phase 0 — Identity rebrand (React Native era)

Renamed the product end-to-end from Bubble Masters to Slam Goal.

- App display name, bundle slug, store-listing copy.
- All in-game strings + metadata (`app.json`, `package.json`,
  workspace name, `README.md`, `REBRANDING.md` checklist).
- AdMob / RevenueCat / AppsFlyer / EAS / ASC IDs replaced with
  `REPLACE_WITH_*` placeholders to be filled in at soft-launch.

Commits: `a5e615d`, `11a3b36`, `d617852`, `97ee21c`.

## Phase 1 — Strip merge gameplay (RN era)

Removed all merge-game-specific code so only the production-tested
integration shell (ads, IAP, leaderboards, analytics, audio, nav)
remained.

- Deleted `app/game.tsx`, `app/themes.tsx`, `app/worlds.tsx`,
  `hooks/usePhysicsGame.ts`,
  `constants/{worlds,levels,playerImages,dailyQuests}.ts`,
  `components/DailyQuestsCard.tsx`, merge-specific `GameContext`
  state.
- Locked the app to landscape orientation in `app.json`.
- Stubbed `app/index.tsx` so the home screen still rendered after
  the merge UI was gone.

Commit: `172294f`.

## Phase 2 — JS physics canvas (RN era)

Wired a JS physics + render layer into the RN app.

- `lib/physics.ts` — wrapper around `planck.js` (Box2D port, JS).
- `components/PhysicsCanvas.tsx` — `@shopify/react-native-skia`
  canvas + JS-thread RAF loop.
- `app/smoketest.tsx` — perf canary: drops 50–100 dynamic bodies
  and shows an FPS overlay so we could check Galaxy A14 budget.

Commit: `d461797`. Cleanup of stale routes in `08b14c8`.

## Phase 3 — Minimum playable slingshot loop (RN era)

First end-to-end gameplay slice: aim, fire, knock, score.

- Slingshot drag-input + trajectory release.
- Single ball, single level, gravity + restitution, ground.
- Damage model on impact, basic results screen.

Commit: `0d4b098`. Layout fix `87f0855`.

## Phase 4 — Footballer roster + materials + abilities

- 6 footballers, each with an active ability triggered on tap
  mid-flight.
- Materials with damage thresholds (wood, stone, glass, ice, etc.).
- Combo tracker for chained destructions.

Commit: `5797af4`.

## Phase 5a–5c — World 1 content + art pass + polish (RN era)

- 12 levels for World 1 + boss arena.
- Level-select grid with star progression saved per-device.
- Vector sprite art (no rasters), scene background, particle
  effects on impact, screen-shake feedback.
- Tutorial overlay on first launch.
- Damage tracking deferred until first launch (so the tutorial
  doesn't poison the leaderboard).

Commits: `43ca333`, `1357c43`, `17cb82c`, `2604106`, `67bfc54`.

## Phase Unity 1 — Switch to Unity 6 LTS

The RN + Skia + planck stack hit perf walls on mid-range Android.
Decision: replatform on Unity 6 LTS with native 2D physics.

- Archived all RN gameplay code under `archive/rn-prototype/`.
  Production-RN integration shell (ads / IAP / etc.) untouched.
- New Unity project at `artifacts/slamgoal/` (Unity 6.0.32f1).
- Project layout: `Assets/_Project/{Scripts,Sprites,Audio,
  Resources,Editor}/` with a single asmdef.
- `Packages/manifest.json` minimal (URP removed because the 2D
  feature pack pulled an incompatible 2D Animation sub-package
  on this editor version).
- Broken `ProjectSettings/TagManager.asset` deleted (was failing
  YAML parse) — Unity regenerates it on next open.

Commits: `7f7e2a8`, `7321234`.

## Phase Unity 2a — Editor setup wizard

The Unity scene was a blank slate after replatform. Built a
one-click scene + prefab builder so the project can be torn down
and rebuilt deterministically.

- `Assets/_Project/Editor/SlamGoalSetupWizard.cs` —
  menu items under "Slam Goal":
  - **Build Everything** — full scene rebuild end-to-end.
  - Sub-steps for prefab building, scene assembly, ScriptableObject
    seeding (footballers + materials).
- Auto-creates the Game scene with: Main Camera, world bounds,
  slingshot rig, ball prefab, materials demo, GoalTrigger,
  ScoreSystem, particle emitter pool, Results canvas.

Bug fixes during stabilisation:
- `9e2611b` — Collider2D density write requires
  `Rigidbody2D.useAutoMass = true` first; otherwise Unity silently
  drops the assignment.
- `8e6f674` — `ParticleSystem.MainModule` configuration must
  happen with the system stopped, plus a safer `Shader.Find`
  fallback when URP shaders aren't present.

Commits: `762cfdf`, `9e2611b`, `8e6f674`.

## Phase Unity 2b — Juice pass

Added the "feel" layer that makes physics destruction satisfying.

- `Game/TrajectoryPreview.cs` — dotted aim line during drag,
  predicted via Physics2D simulation.
- `Game/SlowMoController.cs` — `Time.timeScale` ramp on critical
  hits / goal-line approach, restored on settle.
- `UI/ScoreFlair.cs` — pop-up score numbers at impact world
  position, animated up + fade out.
- `UI/GoalCallout.cs` — full-screen "GOAL!" stinger when the ball
  enters the goal trigger.
- Scene backdrop — flat 2D quads (Sky / SkyMid / Ground / Skyline)
  authored via `BuildBackdrop()` in the wizard.
- `Game/ScreenShake.cs` — additive camera offset on heavy impacts.

Commit: `472aceb`.

## Phase Unity 2c — 2.5D backdrop integration (planned, not yet shipped)

In-flight task: replace the flat 2D quad backdrop with the
**3D Free Modular Kit** by Barking Dog Studios that the user
imported to `Assets/Barking_Dog/`.

- Status: kit is sitting unextracted as `.unitypackage` files
  (10.4 MB URP, 17.7 MB HDRP). User must double-click the URP
  package in Unity to populate `Assets/Barking_Dog/3D Free
  Modular Kit/` with prefabs.
- Plan written at
  `/root/.claude/plans/can-you-read-docx-delegated-haven.md`.
- Approach: two-camera composite — perspective `BackdropCamera`
  on a dedicated `Backdrop` layer, orthographic `MainCamera`
  for everything else. Existing 2D gameplay code untouched.
- Requires re-adding URP to the package manifest (without the 2D
  feature pack to avoid the 2D Animation conflict).
- Awaiting user approval to implement.

---

## Current file inventory (Unity project)

**`Assets/_Project/Scripts/Game/`** (12 files)
- `Abilities.cs`, `Ball.cs`, `CameraController.cs`,
  `ComboTracker.cs`, `GameManager.cs`, `GoalTrigger.cs`,
  `LevelLoader.cs`, `MaterialBlock.cs`, `ParticleEmitter.cs`,
  `ScoreSystem.cs`, `ScreenShake.cs`, `Slingshot.cs`,
  `SlowMoController.cs`, `TrajectoryPreview.cs`

**`Assets/_Project/Scripts/Data/`** (4 ScriptableObject types)
- `AbilityId.cs`, `FootballerSO.cs`, `LevelData.cs`, `MaterialSO.cs`

**`Assets/_Project/Scripts/UI/`** (6 files)
- `GoalCallout.cs`, `LevelSelectController.cs`, `LevelTile.cs`,
  `MainMenuController.cs`, `ResultsCanvas.cs`, `ScoreFlair.cs`

**`Assets/_Project/Editor/`**
- `SlamGoalSetupWizard.cs` — single source of truth for scene
  construction.

**`Assets/_Project/Resources/Levels/`**
- `world1-level1.json` … `world1-level12.json` — 12 levels.

---

## Release workflow (unchanged from RN era)

- `main` is the integration trunk. Every TestFlight build / OTA
  comes from `main`.
- Side-branch dev → merge to `main` → ship.
- `pnpm build:production` and `pnpm update:production` enforce
  clean working tree + branch == `main` + HEAD == `origin/main`.
  Don't bypass — fix the underlying state instead.

---

## What's next

1. **Phase Unity 2c** — 2.5D backdrop (plan written, awaiting
   approval).
2. **Phase Unity 3** — ragdolls, audio (~150-sound library),
   final sprite art pass, integration plumbing reconnect (ads /
   IAP / leaderboards / analytics on the Unity side), soft-launch
   prep.
