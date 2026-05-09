# Slam Goal — Unity project

Unity 6 LTS / 2D URP / C#. Targets iOS + Android, landscape lock.

This project replaces the React-Native + planck.js prototype that
lived here through Phase 5c. The previous codebase is preserved at
`../slamgoal-rn-archive/` for reference; the Unity tree is now the
active build target.

## Status

**Phase Unity 1 — project skeleton + core systems.** What's in:

- Project skeleton: ProjectSettings, packages manifest, .gitignore.
- Core gameplay scripts: GameManager, Slingshot, Ball, MaterialBlock,
  GoalTrigger, LevelLoader, ScoreSystem, ComboTracker, Abilities,
  ScreenShake, ParticleEmitter, CameraController.
- UI scripts: ResultsCanvas, MainMenuController, LevelSelectController,
  LevelTile, SaveSystem.
- ScriptableObject data: 5 footballers (Striker / Banana / Split /
  Header / Goalie) + 6 materials (wood / cardboard / tin / container /
  enemy / boss_captain).
- All 12 level JSONs ported from the RN era, in
  `Assets/_Project/Resources/Levels/`.
- 3 minimal scene files (Main / LevelSelect / Game) — camera only.

What's NOT in (to be done after first successful project open):

- **Prefabs** — block, ball, goal, level tile. The user creates these
  visually in the editor following SETUP.md.
- **Scene wiring** — adding the GameManager / Slingshot GameObjects
  with component references inside Game.unity, and Canvas+UI in Main /
  LevelSelect.
- **Sprites** — placeholder primitives only. Phase Unity 2 commissions
  art (Asset Store packs are the fastest path to "looks like a game").
- **Audio** — no SFX or music yet. Phase Unity 2.
- **Animations** — no Animator controllers. Phase Unity 2.
- **Mobile integrations** — Unity Ads, IAP, GameKit, Play Games,
  AppsFlyer SDKs. Phase Unity 6.

See `SETUP.md` for first-open instructions.

## Layout

```
Assets/
  Scenes/                Main.unity, LevelSelect.unity, Game.unity
  _Project/
    Audio/               (empty until Phase U2)
    Resources/
      Footballers/       *.asset — 5 ScriptableObjects (auto-discovered)
      Materials/         *.asset — 6 ScriptableObjects
      Levels/            *.json — 12 levels named world1-level{1..12}
      Prefabs/           (empty until you create them)
    Scripts/
      Data/              SO definitions + JSON DTO
      Game/              MonoBehaviours for gameplay loop
      UI/                MonoBehaviours for UI screens
      Util/              SaveSystem
    Sprites/             (empty)
ProjectSettings/         Unity per-project config
Packages/                manifest.json
```

## Conventions

- **Y-axis flip:** Unity is y-up; level JSON (ported from planck) is
  y-down. `LevelLoader` negates y when placing colliders so the JSON
  numbers don't have to be rewritten.
- **World units:** 1 unit = 1 meter. Sprite import PPU is 100.
- **Namespace root:** `SlamGoal`, with sub-namespaces `Game`, `UI`, `Data`.
- **Save persistence:** PlayerPrefs via `SaveSystem`. Phase U6 layers
  Apple Game Center / Google Play Games on top for cross-device sync.
- **Camera:** orthographic, framed per-level by `CameraController`.

## Branding placeholders

Same `REPLACE_WITH_*` convention from the RN era — search the codebase
for `REPLACE_WITH_` to find external IDs that need filling in once
you've reserved them with Apple / Google / Unity Cloud.

## Phase plan

| Phase | Scope |
|---|---|
| U1 (this commit) | Project skeleton + core systems + all data ported |
| U2 | Prefabs + scene wiring + first playable level loop |
| U3 | All 12 levels playable + level select + lock progression |
| U4 | Juice (particles, screen shake, hit-stop, score flair) |
| U5 | Audio + animations + sprite art (commissioned or Asset Store) |
| U6 | Integrations (Ads, IAP, leaderboards, AppsFlyer) |
| U7 | Soft-launch readiness |
