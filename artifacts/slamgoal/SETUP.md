# Slam Goal Unity — First-Open Setup

Step-by-step instructions for opening the Unity project for the first
time and getting a level playable in the editor. Plan ~45 minutes;
most of it is creating prefabs that automate themselves once made.

## 0. Install prerequisites

1. **Unity Hub** — https://unity.com/download
2. From Unity Hub → **Installs** → **Install Editor** → pick
   **6000.0.32f1** (or any 6000.0.x LTS release).
   - Modules: include **iOS Build Support** + **Android Build Support**
     + **Android SDK & NDK Tools** + **OpenJDK** for mobile builds.
3. **Xcode** (Mac App Store) for iOS builds.
4. **Android Studio** (https://developer.android.com/studio) for
   Android builds — only the SDK platform tools are required, but a
   full install is easier.

## 1. Open the project

1. Unity Hub → **Projects** → **Add** → navigate to
   `~/slamgoal/artifacts/slamgoal/` → **Add Project**.
2. Click the project entry to open. First import takes 5-10 minutes
   while Unity rebuilds `Library/`.
3. If Unity prompts about a project version mismatch, choose **Continue**
   (the project version pin in `ProjectSettings/ProjectVersion.txt` is
   close to whatever 6000.0.x release you have).
4. After import, open the **Console** window (Window → General → Console).
   Expected: zero errors. If there are red script errors, paste them
   into chat and I'll fix.

## 2. Verify scripts compiled

In the Project window, navigate to `Assets/_Project/Scripts/` and pick
any `.cs` file. The Inspector should show a script icon, no error.

## 3. Build the Game scene (the most important one)

The Game scene is where gameplay happens. We'll add the GameManager
hierarchy + supporting GameObjects.

### 3a. Open Game.unity

`Assets/Scenes/Game.unity` → double-click in Project window.

### 3b. Set up the GameManager hierarchy

Create the following GameObjects (right-click Hierarchy → Create Empty):

```
[Bootstrap]                ← empty GameObject
├── GameManager            ← attach: GameManager.cs, ScoreSystem.cs
├── LevelLoader            ← attach: LevelLoader.cs
├── Slingshot              ← attach: Slingshot.cs (start at world (2, -7, 0))
├── ScreenShake            ← attach: ScreenShake.cs (set Target = Main Camera)
├── ParticleEmitter        ← attach: ParticleEmitter.cs
└── CameraController       ← parent of Main Camera; attach CameraController.cs
                             on Main Camera (or move Main Camera under here
                             and set its component)
```

### 3c. Wire GameManager fields

Select **GameManager** GameObject. In the Inspector, drag these
references into its serialized fields:

| Field | Drag |
|---|---|
| Level Loader | LevelLoader GameObject |
| Slingshot | Slingshot GameObject |
| Ball Prefab | (we'll create this in step 4) |
| Score System | ScoreSystem (same GameObject) |
| Results Canvas | (we'll create this in step 5) |
| Camera Controller | Main Camera |
| Screen Shake | ScreenShake GameObject |
| Particle Emitter | ParticleEmitter GameObject |
| Default Footballer | drag `Assets/_Project/Resources/Footballers/StrikerSam` |
| Default Level Id | leave as `world1-level1` |

### 3d. Wire LevelLoader fields

| Field | Drag |
|---|---|
| Block Box Prefab | (step 4) |
| Block Circle Prefab | (step 4) |
| Goal Prefab | (step 4) |

## 4. Create the prefabs

These are the runtime templates the level loader stamps out. Create
each in a new GameObject, configure components, then drag to
`Assets/_Project/Resources/Prefabs/` to make a prefab.

### 4a. Ball.prefab

1. GameObject → 2D Object → Sprites → Square (renames to "Ball")
2. Add components: **Rigidbody2D**, **CircleCollider2D**, **Ball.cs**
3. Rigidbody2D: Body Type = Dynamic, Gravity Scale = 1
4. SpriteRenderer: leave default sprite (Square / Knob)
5. Drag GameObject → `Assets/_Project/Resources/Prefabs/Ball.prefab`
6. Delete the scene instance.
7. In GameManager Inspector, drag the prefab to **Ball Prefab**.

### 4b. BlockBox.prefab

1. GameObject → 2D Object → Sprites → Square
2. Components: **Rigidbody2D**, **BoxCollider2D**, **MaterialBlock.cs**, **SpriteRenderer**
3. Rigidbody2D: Body Type = Dynamic
4. SpriteRenderer: Draw Mode = Sliced (so size scales nicely)
5. Save as `Assets/_Project/Resources/Prefabs/BlockBox.prefab`
6. Delete from scene.
7. Drag prefab to **LevelLoader → Block Box Prefab**.

### 4c. BlockCircle.prefab

1. GameObject → 2D Object → Sprites → Circle
2. Components: **Rigidbody2D**, **CircleCollider2D**, **MaterialBlock.cs**, **SpriteRenderer**
3. Save → drag to **LevelLoader → Block Circle Prefab**.

### 4d. GoalTrigger.prefab

1. Empty GameObject → "GoalTrigger"
2. Components: **BoxCollider2D** (Is Trigger = ON), **GoalTrigger.cs**, **SpriteRenderer** (optional, with semi-transparent yellow fill for the visible goal area)
3. Save → drag to **LevelLoader → Goal Prefab**.

## 5. Build the ResultsCanvas

In Game scene:

1. GameObject → UI → Canvas (rename "ResultsCanvas")
2. Inside the Canvas, create:
   - **Panel** (semi-transparent black background; full-screen rect)
   - **Card** (centered group)
     - **Title** TextMeshPro (text: "GOAL!")
     - **StarsRow** with 3 child Image GameObjects (the 3 star icons)
     - **Score** TextMeshPro
     - **Buttons** row: Retry / Next / Home
3. Add `ResultsCanvas.cs` to the Canvas GameObject. Drag references:
   - Root → Panel
   - Title Text → the Title TMP
   - Score Text → Score TMP
   - Star Icons → drag the 3 Image GameObjects (in order)
   - Retry Btn / Next Btn / Home Btn → respective Button components
   - Game Manager → Bootstrap/GameManager
4. Set the Panel's `SetActive(false)` initially.
5. Drag the Canvas to **GameManager → Results Canvas**.

## 6. Build the Main scene

`Assets/Scenes/Main.unity`:

1. UI → Canvas → add big "PLAY" button + "QUIT" button
2. Empty GameObject → "MainMenu" → attach `MainMenuController.cs`
3. Drag Buttons into MainMenuController fields.
4. Save scene.

## 7. Build the LevelSelect scene

`Assets/Scenes/LevelSelect.unity`:

1. UI → Canvas with a ScrollView containing a Grid Layout group
2. Create a **LevelTile.prefab** with:
   - Background Image
   - Index TextMeshPro (centered)
   - Stars row (3 Images)
   - Lock overlay (Image, hidden by default)
   - Button component (full tile)
   - Attach `LevelTile.cs` and wire its serialized fields.
3. Empty GameObject → "LevelSelectController" → attach `LevelSelectController.cs`
4. Drag the LevelTile prefab to **Tile Prefab**, the Grid container to **Tile Container**, the back button to **Back Button**.

## 8. Add scenes to Build Settings

File → Build Settings → drag Main, LevelSelect, Game from the Project
window into the Scenes In Build list, in that order. Main = index 0.

## 9. Press Play

In the Game scene, hit Play. Expected:

- Camera frames the level (Warm-up by default)
- Slingshot anchor visible at world (2, -7)
- 3 wood blocks + 1 enemy spawned
- Goal sensor on the right
- Drag from anywhere with the mouse → drag-line preview (Phase U2 adds the visual)
- Release → ball flies, breaks blocks, score increments
- Reach goal → ResultsCanvas shows

If something doesn't work, paste the Console errors into chat.

## 10. Build to device (later)

When you want to test on phone:

- iOS: File → Build Settings → iOS → Build → opens Xcode → Run on Device.
- Android: File → Build Settings → Android → Build And Run with phone in dev mode.

The bundle id is set to `com.durnstudio.slamgoal` (in
ProjectSettings.asset). Replace via Edit → Project Settings → Player.

---

## Troubleshooting

**"Missing script" warnings on prefabs:** GUID mismatch. The script's
`.meta` file in `Assets/_Project/Scripts/...` should have a stable
GUID; if it got regenerated, find the correct one and update the
prefab's script reference.

**Levels won't load:** check `Assets/_Project/Resources/Levels/` —
files must be `world1-level{N}.json` exactly. Resources.Load is
case-sensitive.

**Materials show as null in level loader:** check
`Assets/_Project/Resources/Materials/` — each `.asset` file's `id`
field must match the `material` string in level JSON.
