#if UNITY_EDITOR
using SlamGoal.Data;
using SlamGoal.Game;
using SlamGoal.UI;
using TMPro;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace SlamGoal.EditorTools
{
    /// <summary>
    /// One-click setup for the Slam Goal Unity project.
    ///
    /// Menu items under "Slam Goal" build the prefabs / scenes that
    /// would otherwise require ~45 minutes of Inspector drag-and-drop
    /// per the SETUP.md walkthrough. Idempotent — re-running rebuilds
    /// from scratch (existing scene contents are wiped first).
    ///
    /// Run "Slam Goal → Build Everything" once after the project
    /// imports cleanly. Then open Assets/Scenes/Game.unity and press
    /// Play to verify the slingshot loop works end-to-end.
    ///
    /// What it builds:
    ///   • 4 prefabs: Ball, BlockBox, BlockCircle, GoalTrigger
    ///   • Game scene: GameManager hierarchy + ResultsCanvas
    ///   • Main scene: title text + Play button + Quit button
    ///   • LevelSelect scene: scrollable grid populated at runtime
    /// </summary>
    public static class SlamGoalSetupWizard
    {
        private const string PrefabsFolder = "Assets/_Project/Resources/Prefabs";
        private const string GameScenePath = "Assets/Scenes/Game.unity";
        private const string MainScenePath = "Assets/Scenes/Main.unity";
        private const string LevelSelectScenePath = "Assets/Scenes/LevelSelect.unity";

        [MenuItem("Slam Goal/Build Everything")]
        public static void BuildEverything()
        {
            EnsureFolders();
            BuildPrefabs();
            BuildGameScene();
            BuildMainScene();
            BuildLevelSelectScene();
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            EditorUtility.DisplayDialog(
                "Slam Goal — Setup Complete",
                "Prefabs and 3 scenes built.\n\n" +
                "Open Assets/Scenes/Game.unity and press Play to test.",
                "OK");
        }

        // ── Folder scaffolding ─────────────────────────────────────

        [MenuItem("Slam Goal/Build/Folders only")]
        public static void EnsureFolders()
        {
            EnsureFolder("Assets/_Project");
            EnsureFolder("Assets/_Project/Resources");
            EnsureFolder("Assets/_Project/Resources/Prefabs");
            EnsureFolder("Assets/Scenes");
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            var parent = System.IO.Path.GetDirectoryName(path)?.Replace('\\', '/');
            var leaf = System.IO.Path.GetFileName(path);
            if (!string.IsNullOrEmpty(parent) && !AssetDatabase.IsValidFolder(parent))
            {
                EnsureFolder(parent);
            }
            AssetDatabase.CreateFolder(parent, leaf);
        }

        // ── Prefabs ────────────────────────────────────────────────

        [MenuItem("Slam Goal/Build/Prefabs only")]
        public static void BuildPrefabs()
        {
            EnsureFolders();
            BuildBallPrefab();
            BuildBlockBoxPrefab();
            BuildBlockCirclePrefab();
            BuildGoalPrefab();
            AssetDatabase.SaveAssets();
        }

        private static GameObject BuildBallPrefab()
        {
            var go = new GameObject("Ball");
            // Sprite renderer with Unity's built-in white circle.
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                "UI/Skin/Knob.psd");
            sr.color = new Color(1, 0.819f, 0.4f, 1);
            sr.sortingLayerName = "Default";
            sr.sortingOrder = 10;
            // Physics.
            var rb = go.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Dynamic;
            rb.gravityScale = 1f;
            rb.useAutoMass = true;
            var col = go.AddComponent<CircleCollider2D>();
            col.radius = 0.5f;
            col.density = 4f;
            // Game logic.
            go.AddComponent<Ball>();

            var prefab = SaveAsPrefab(go, $"{PrefabsFolder}/Ball.prefab");
            Object.DestroyImmediate(go);
            return prefab;
        }

        private static GameObject BuildBlockBoxPrefab()
        {
            var go = new GameObject("BlockBox");
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                "UI/Skin/UISprite.psd");
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.size = Vector2.one;
            sr.sortingLayerName = "Default";
            sr.sortingOrder = 5;
            var rb = go.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Dynamic;
            var col = go.AddComponent<BoxCollider2D>();
            col.size = Vector2.one;
            go.AddComponent<MaterialBlock>();

            var prefab = SaveAsPrefab(go, $"{PrefabsFolder}/BlockBox.prefab");
            Object.DestroyImmediate(go);
            return prefab;
        }

        private static GameObject BuildBlockCirclePrefab()
        {
            var go = new GameObject("BlockCircle");
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                "UI/Skin/Knob.psd");
            sr.sortingLayerName = "Default";
            sr.sortingOrder = 5;
            var rb = go.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Dynamic;
            var col = go.AddComponent<CircleCollider2D>();
            col.radius = 0.5f;
            go.AddComponent<MaterialBlock>();

            var prefab = SaveAsPrefab(go, $"{PrefabsFolder}/BlockCircle.prefab");
            Object.DestroyImmediate(go);
            return prefab;
        }

        private static GameObject BuildGoalPrefab()
        {
            var go = new GameObject("GoalTrigger");
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                "UI/Skin/UISprite.psd");
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.color = new Color(1f, 0.82f, 0.4f, 0.18f);
            sr.size = Vector2.one;
            sr.sortingLayerName = "Default";
            sr.sortingOrder = 1;
            var col = go.AddComponent<BoxCollider2D>();
            col.isTrigger = true;
            col.size = Vector2.one;
            go.AddComponent<GoalTrigger>();

            var prefab = SaveAsPrefab(go, $"{PrefabsFolder}/GoalTrigger.prefab");
            Object.DestroyImmediate(go);
            return prefab;
        }

        // ── Game scene ─────────────────────────────────────────────

        [MenuItem("Slam Goal/Build/Game scene only")]
        public static void BuildGameScene()
        {
            EnsureFolders();
            var scene = EditorSceneManager.OpenScene(GameScenePath, OpenSceneMode.Single);
            // Wipe everything except essential bootstrap.
            foreach (var go in scene.GetRootGameObjects())
            {
                Object.DestroyImmediate(go);
            }

            // Camera.
            var camGO = new GameObject("Main Camera");
            camGO.transform.position = new Vector3(0, 0, -10);
            camGO.tag = "MainCamera";
            var cam = camGO.AddComponent<Camera>();
            cam.orthographic = true;
            cam.orthographicSize = 5f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.05f, 0.106f, 0.165f, 1f);
            camGO.AddComponent<AudioListener>();
            var camController = camGO.AddComponent<CameraController>();

            // Scene backdrop — sky band + ground band as flat sprites
            // far behind the action. SortingOrder negative so they
            // never overlap bodies. Hard-coded for the typical 16x9
            // level dimensions; CameraController frames level so
            // these stay in view.
            BuildBackdrop();

            // Bootstrap GameObjects.
            var loaderGO = new GameObject("LevelLoader");
            var loader = loaderGO.AddComponent<LevelLoader>();

            var slingGO = new GameObject("Slingshot");
            slingGO.transform.position = new Vector3(2, -7, 0);
            var sling = slingGO.AddComponent<Slingshot>();
            // Slingshot rig visual + trajectory preview (children).
            BuildSlingshotRig(slingGO.transform);
            var trajectory = BuildTrajectoryPreview(slingGO.transform);
            SetSerialized(sling, "trajectory", trajectory);

            var shakeGO = new GameObject("ScreenShake");
            var shake = shakeGO.AddComponent<ScreenShake>();
            // Wire shake target = camera.
            SetSerialized(shake, "target", camGO.transform);

            var partGO = new GameObject("ParticleEmitter");
            var part = partGO.AddComponent<ParticleEmitter>();

            var slowMoGO = new GameObject("SlowMoController");
            var slowMo = slowMoGO.AddComponent<SlowMoController>();

            var managerGO = new GameObject("GameManager");
            var score = managerGO.AddComponent<ScoreSystem>();
            var gm = managerGO.AddComponent<GameManager>();

            // Build the Results Canvas.
            var canvasObj = BuildResultsCanvas();
            var resultsCanvas = canvasObj.GetComponentInChildren<ResultsCanvas>(true);

            // ScoreFlair — world-space canvas that hosts floating
            // "+points" labels. Subscribes to ScoreSystem.OnDestroyScored.
            var scoreFlairCanvas = BuildScoreFlairCanvas();
            var scoreFlair = scoreFlairCanvas.AddComponent<ScoreFlair>();
            SetSerialized(scoreFlair, "scoreSystem", score);
            SetSerialized(scoreFlair, "worldCanvas", scoreFlairCanvas.GetComponent<Canvas>());

            // GoalCallout — screen-space animated GOAL! text.
            var calloutCanvas = BuildGoalCalloutCanvas(out var goalCallout);

            // Wire LevelLoader prefab references.
            var ballPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                $"{PrefabsFolder}/Ball.prefab");
            var blockBoxPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                $"{PrefabsFolder}/BlockBox.prefab");
            var blockCirclePrefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                $"{PrefabsFolder}/BlockCircle.prefab");
            var goalPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(
                $"{PrefabsFolder}/GoalTrigger.prefab");
            SetSerialized(loader, "blockBoxPrefab",
                blockBoxPrefab != null ? blockBoxPrefab.GetComponent<MaterialBlock>() : null);
            SetSerialized(loader, "blockCirclePrefab",
                blockCirclePrefab != null ? blockCirclePrefab.GetComponent<MaterialBlock>() : null);
            SetSerialized(loader, "goalPrefab",
                goalPrefab != null ? goalPrefab.GetComponent<GoalTrigger>() : null);

            // Wire GameManager fields.
            SetSerialized(gm, "levelLoader", loader);
            SetSerialized(gm, "slingshot", sling);
            SetSerialized(gm, "ballPrefab",
                ballPrefab != null ? ballPrefab.GetComponent<Ball>() : null);
            SetSerialized(gm, "scoreSystem", score);
            SetSerialized(gm, "resultsCanvas", resultsCanvas);
            SetSerialized(gm, "cameraController", camController);
            SetSerialized(gm, "screenShake", shake);
            SetSerialized(gm, "particleEmitter", part);
            SetSerialized(gm, "slowMo", slowMo);
            SetSerialized(gm, "goalCallout", goalCallout);

            // Default footballer.
            var striker = AssetDatabase.LoadAssetAtPath<FootballerSO>(
                "Assets/_Project/Resources/Footballers/StrikerSam.asset");
            SetSerialized(gm, "defaultFootballer", striker);

            // Wire ResultsCanvas → GameManager.
            SetSerialized(resultsCanvas, "gameManager", gm);

            EditorSceneManager.SaveScene(scene, GameScenePath);
        }

        private static GameObject BuildResultsCanvas()
        {
            var canvasGO = new GameObject("ResultsCanvas");
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<CanvasScaler>().uiScaleMode =
                CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGO.AddComponent<GraphicRaycaster>();

            // Root panel — toggled by ResultsCanvas.Show/Hide.
            var rootGO = new GameObject("Root");
            rootGO.transform.SetParent(canvasGO.transform, false);
            var rootRT = rootGO.AddComponent<RectTransform>();
            rootRT.anchorMin = Vector2.zero;
            rootRT.anchorMax = Vector2.one;
            rootRT.offsetMin = Vector2.zero;
            rootRT.offsetMax = Vector2.zero;
            var rootBg = rootGO.AddComponent<Image>();
            rootBg.color = new Color(0, 0, 0, 0.7f);

            // Card.
            var cardGO = new GameObject("Card");
            cardGO.transform.SetParent(rootGO.transform, false);
            var cardRT = cardGO.AddComponent<RectTransform>();
            cardRT.anchorMin = new Vector2(0.5f, 0.5f);
            cardRT.anchorMax = new Vector2(0.5f, 0.5f);
            cardRT.sizeDelta = new Vector2(560, 420);
            cardRT.anchoredPosition = Vector2.zero;
            var cardBg = cardGO.AddComponent<Image>();
            cardBg.color = new Color(0.10f, 0.16f, 0.23f, 1f);

            var titleText = MakeText("TitleText", cardGO.transform, "GOAL!", 48,
                new Vector2(0, 140));
            var scoreText = MakeText("ScoreText", cardGO.transform, "0", 64,
                new Vector2(0, 0));

            // 3 stars.
            var starParent = new GameObject("StarsRow");
            starParent.transform.SetParent(cardGO.transform, false);
            var starRT = starParent.AddComponent<RectTransform>();
            starRT.anchoredPosition = new Vector2(0, 70);
            starRT.sizeDelta = new Vector2(300, 60);
            var starHL = starParent.AddComponent<HorizontalLayoutGroup>();
            starHL.spacing = 12;
            starHL.childAlignment = TextAnchor.MiddleCenter;
            starHL.childControlWidth = false;
            starHL.childControlHeight = false;
            var starImages = new Image[3];
            for (int i = 0; i < 3; i++)
            {
                var s = new GameObject($"Star{i + 1}");
                s.transform.SetParent(starParent.transform, false);
                var img = s.AddComponent<Image>();
                img.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                    "UI/Skin/Knob.psd");
                img.color = new Color(0.2f, 0.2f, 0.2f, 0.5f);
                var rt = s.GetComponent<RectTransform>();
                rt.sizeDelta = new Vector2(48, 48);
                starImages[i] = img;
            }

            // Buttons row.
            var btnsGO = new GameObject("Buttons");
            btnsGO.transform.SetParent(cardGO.transform, false);
            var btnsRT = btnsGO.AddComponent<RectTransform>();
            btnsRT.anchoredPosition = new Vector2(0, -140);
            btnsRT.sizeDelta = new Vector2(500, 60);
            var btnsHL = btnsGO.AddComponent<HorizontalLayoutGroup>();
            btnsHL.spacing = 16;
            btnsHL.childAlignment = TextAnchor.MiddleCenter;
            btnsHL.childControlWidth = false;
            btnsHL.childControlHeight = false;
            var homeBtn = MakeButton("HomeBtn", btnsGO.transform, "HOME");
            var retryBtn = MakeButton("RetryBtn", btnsGO.transform, "RETRY");
            var nextBtn = MakeButton("NextBtn", btnsGO.transform, "NEXT");

            // Wire ResultsCanvas component.
            var rc = canvasGO.AddComponent<ResultsCanvas>();
            SetSerialized(rc, "root", rootGO);
            SetSerialized(rc, "titleText", titleText);
            SetSerialized(rc, "scoreText", scoreText);
            SetSerialized(rc, "starIcons", starImages);
            SetSerialized(rc, "retryBtn", retryBtn);
            SetSerialized(rc, "nextBtn", nextBtn);
            SetSerialized(rc, "homeBtn", homeBtn);
            // Hide initially.
            rootGO.SetActive(false);

            // EventSystem (required for any UI input).
            EnsureEventSystem();

            return canvasGO;
        }

        // ── Main scene ─────────────────────────────────────────────

        [MenuItem("Slam Goal/Build/Main scene only")]
        public static void BuildMainScene()
        {
            EnsureFolders();
            var scene = EditorSceneManager.OpenScene(MainScenePath, OpenSceneMode.Single);
            foreach (var go in scene.GetRootGameObjects())
            {
                Object.DestroyImmediate(go);
            }

            // Camera.
            var camGO = new GameObject("Main Camera");
            camGO.tag = "MainCamera";
            var cam = camGO.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.05f, 0.106f, 0.165f, 1f);
            cam.orthographic = true;
            camGO.AddComponent<AudioListener>();

            // Canvas.
            var canvasGO = new GameObject("Canvas");
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<CanvasScaler>().uiScaleMode =
                CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGO.AddComponent<GraphicRaycaster>();

            MakeText("Title", canvasGO.transform, "SLAM GOAL", 80,
                new Vector2(0, 180));

            // Buttons.
            var playBtn = MakeButton("PlayButton", canvasGO.transform, "PLAY");
            var playRT = ((Component)playBtn).GetComponent<RectTransform>();
            playRT.anchoredPosition = new Vector2(0, 0);
            playRT.sizeDelta = new Vector2(280, 80);

            var quitBtn = MakeButton("QuitButton", canvasGO.transform, "QUIT");
            var quitRT = ((Component)quitBtn).GetComponent<RectTransform>();
            quitRT.anchoredPosition = new Vector2(0, -120);
            quitRT.sizeDelta = new Vector2(220, 60);

            // Controller.
            var ctrlGO = new GameObject("MainMenu");
            var ctrl = ctrlGO.AddComponent<MainMenuController>();
            SetSerialized(ctrl, "playButton", playBtn);
            SetSerialized(ctrl, "quitButton", quitBtn);

            EnsureEventSystem();
            EditorSceneManager.SaveScene(scene, MainScenePath);

            // Add to Build Settings if missing.
            AddSceneToBuildSettings(MainScenePath, 0);
        }

        // ── LevelSelect scene ──────────────────────────────────────

        [MenuItem("Slam Goal/Build/LevelSelect scene only")]
        public static void BuildLevelSelectScene()
        {
            EnsureFolders();
            var scene = EditorSceneManager.OpenScene(
                LevelSelectScenePath, OpenSceneMode.Single);
            foreach (var go in scene.GetRootGameObjects())
            {
                Object.DestroyImmediate(go);
            }

            // Camera.
            var camGO = new GameObject("Main Camera");
            camGO.tag = "MainCamera";
            var cam = camGO.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.05f, 0.106f, 0.165f, 1f);
            cam.orthographic = true;
            camGO.AddComponent<AudioListener>();

            // Canvas.
            var canvasGO = new GameObject("Canvas");
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGO.AddComponent<CanvasScaler>().uiScaleMode =
                CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGO.AddComponent<GraphicRaycaster>();

            // Title.
            MakeText("Title", canvasGO.transform, "STREET PITCH", 56,
                new Vector2(0, 240));
            var starsTotal = MakeText("StarsTotal", canvasGO.transform,
                "0 / 36", 32, new Vector2(0, 180));

            // Tile grid container.
            var gridGO = new GameObject("GridContainer");
            gridGO.transform.SetParent(canvasGO.transform, false);
            var gridRT = gridGO.AddComponent<RectTransform>();
            gridRT.anchoredPosition = new Vector2(0, -40);
            gridRT.sizeDelta = new Vector2(900, 360);
            var grid = gridGO.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(140, 110);
            grid.spacing = new Vector2(12, 12);
            grid.childAlignment = TextAnchor.MiddleCenter;

            // Build a simple LevelTile prefab.
            var tilePrefab = BuildLevelTilePrefab();

            // Back button.
            var backBtn = MakeButton("BackButton", canvasGO.transform, "BACK");
            var backRT = ((Component)backBtn).GetComponent<RectTransform>();
            backRT.anchoredPosition = new Vector2(-540, 280);
            backRT.sizeDelta = new Vector2(140, 50);

            // Controller.
            var ctrlGO = new GameObject("LevelSelect");
            var ctrl = ctrlGO.AddComponent<LevelSelectController>();
            SetSerialized(ctrl, "tileContainer", gridRT);
            SetSerialized(ctrl, "tilePrefab",
                tilePrefab.GetComponent<LevelTile>());
            SetSerialized(ctrl, "starsTotalText", starsTotal);
            SetSerialized(ctrl, "backButton", backBtn);

            EnsureEventSystem();
            EditorSceneManager.SaveScene(scene, LevelSelectScenePath);

            AddSceneToBuildSettings(LevelSelectScenePath, 1);
            AddSceneToBuildSettings(GameScenePath, 2);
        }

        private static GameObject BuildLevelTilePrefab()
        {
            var go = new GameObject("LevelTile");
            var rt = go.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(140, 110);
            var bg = go.AddComponent<Image>();
            bg.color = new Color(1f, 1f, 1f, 0.08f);
            var btn = go.AddComponent<Button>();

            var indexText = MakeText("Index", go.transform, "1", 32,
                new Vector2(0, 24));
            var indexRT = ((Component)indexText).GetComponent<RectTransform>();
            indexRT.sizeDelta = new Vector2(140, 40);

            // 3 stars.
            var starsGO = new GameObject("Stars");
            starsGO.transform.SetParent(go.transform, false);
            var starsRT = starsGO.AddComponent<RectTransform>();
            starsRT.anchoredPosition = new Vector2(0, -24);
            starsRT.sizeDelta = new Vector2(120, 24);
            var hl = starsGO.AddComponent<HorizontalLayoutGroup>();
            hl.spacing = 4;
            hl.childAlignment = TextAnchor.MiddleCenter;
            hl.childControlWidth = false;
            hl.childControlHeight = false;
            var starIcons = new Image[3];
            for (int i = 0; i < 3; i++)
            {
                var s = new GameObject($"Star{i + 1}");
                s.transform.SetParent(starsGO.transform, false);
                var img = s.AddComponent<Image>();
                img.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                    "UI/Skin/Knob.psd");
                img.color = new Color(0.2f, 0.2f, 0.2f, 0.5f);
                var srt = s.GetComponent<RectTransform>();
                srt.sizeDelta = new Vector2(20, 20);
                starIcons[i] = img;
            }

            // Lock overlay (hidden by default).
            var lockGO = new GameObject("LockOverlay");
            lockGO.transform.SetParent(go.transform, false);
            var lockRT = lockGO.AddComponent<RectTransform>();
            lockRT.anchorMin = Vector2.zero;
            lockRT.anchorMax = Vector2.one;
            lockRT.offsetMin = Vector2.zero;
            lockRT.offsetMax = Vector2.zero;
            var lockImg = lockGO.AddComponent<Image>();
            lockImg.color = new Color(0, 0, 0, 0.6f);
            lockGO.SetActive(false);

            var tile = go.AddComponent<LevelTile>();
            SetSerialized(tile, "indexText", indexText);
            SetSerialized(tile, "starIcons", starIcons);
            SetSerialized(tile, "lockOverlay", lockGO);
            SetSerialized(tile, "button", btn);

            var prefab = SaveAsPrefab(go, $"{PrefabsFolder}/LevelTile.prefab");
            Object.DestroyImmediate(go);
            return prefab;
        }

        // ── Helpers ────────────────────────────────────────────────

        private static GameObject SaveAsPrefab(GameObject go, string path)
        {
            return PrefabUtility.SaveAsPrefabAsset(go, path);
        }

        /// <summary>Set a private serialized field on a Unity Object via
        /// SerializedObject. Used for one-shot wiring during scene build.</summary>
        private static void SetSerialized(Object obj, string fieldName, Object value)
        {
            if (obj == null) return;
            var so = new SerializedObject(obj);
            var prop = so.FindProperty(fieldName);
            if (prop == null)
            {
                Debug.LogWarning($"[Setup] field '{fieldName}' not found on {obj.GetType().Name}");
                return;
            }
            prop.objectReferenceValue = value;
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetSerialized(Object obj, string fieldName, Image[] arr)
        {
            if (obj == null) return;
            var so = new SerializedObject(obj);
            var prop = so.FindProperty(fieldName);
            if (prop == null) return;
            prop.arraySize = arr.Length;
            for (int i = 0; i < arr.Length; i++)
            {
                prop.GetArrayElementAtIndex(i).objectReferenceValue = arr[i];
            }
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void SetSerialized(Object obj, string fieldName, Transform t)
        {
            SetSerialized(obj, fieldName, (Object)t);
        }

        private static TextMeshProUGUI MakeText(
            string name, Transform parent, string text, int fontSize, Vector2 anchored)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.anchoredPosition = anchored;
            rt.sizeDelta = new Vector2(800, 80);
            var tmp = go.AddComponent<TextMeshProUGUI>();
            tmp.text = text;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.fontSize = fontSize;
            tmp.color = Color.white;
            return tmp;
        }

        private static Button MakeButton(string name, Transform parent, string label)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            var rt = go.AddComponent<RectTransform>();
            rt.sizeDelta = new Vector2(220, 60);
            var bg = go.AddComponent<Image>();
            bg.color = new Color(1f, 0.82f, 0.4f, 1f);
            var btn = go.AddComponent<Button>();

            var label_go = new GameObject("Label");
            label_go.transform.SetParent(go.transform, false);
            var lrt = label_go.AddComponent<RectTransform>();
            lrt.anchorMin = Vector2.zero;
            lrt.anchorMax = Vector2.one;
            lrt.offsetMin = Vector2.zero;
            lrt.offsetMax = Vector2.zero;
            var ltmp = label_go.AddComponent<TextMeshProUGUI>();
            ltmp.text = label;
            ltmp.alignment = TextAlignmentOptions.Center;
            ltmp.fontSize = 28;
            ltmp.color = new Color(0.05f, 0.10f, 0.16f, 1f);

            return btn;
        }

        private static void EnsureEventSystem()
        {
            var existing = Object.FindFirstObjectByType<UnityEngine.EventSystems.EventSystem>();
            if (existing != null) return;
            var go = new GameObject("EventSystem");
            go.AddComponent<UnityEngine.EventSystems.EventSystem>();
            go.AddComponent<UnityEngine.InputSystem.UI.InputSystemUIInputModule>();
        }

        private static void AddSceneToBuildSettings(string scenePath, int desiredIndex)
        {
            var current = EditorBuildSettings.scenes;
            // Already present?
            for (int i = 0; i < current.Length; i++)
            {
                if (current[i].path == scenePath) return;
            }
            var next = new EditorBuildSettingsScene[current.Length + 1];
            current.CopyTo(next, 0);
            next[current.Length] = new EditorBuildSettingsScene(scenePath, true);
            EditorBuildSettings.scenes = next;
        }

        // ── Scene visuals (Phase Unity 2b) ─────────────────────────

        /// <summary>Sky band + ground band placed far behind bodies. Hard-
        /// coded for the canonical 16x9 level dimensions; CameraController
        /// frames the level so these stay in view at any device aspect.</summary>
        private static void BuildBackdrop()
        {
            // Sky — top half, gradient via two stacked rects (cheap).
            var sky = MakeColoredQuad(
                "Sky",
                center: new Vector3(8, -3, 5),
                size: new Vector2(40, 14),
                color: new Color(0.11f, 0.16f, 0.29f, 1f),
                sortingOrder: -100);
            var skyMid = MakeColoredQuad(
                "SkyMid",
                center: new Vector3(8, -7, 4.9f),
                size: new Vector2(40, 6),
                color: new Color(0.23f, 0.23f, 0.37f, 1f),
                sortingOrder: -99);
            // Ground — under the floor.
            var ground = MakeColoredQuad(
                "Ground",
                center: new Vector3(8, -10.5f, 4.8f),
                size: new Vector2(40, 4),
                color: new Color(0.13f, 0.10f, 0.07f, 1f),
                sortingOrder: -98);
            // Distant building silhouette strip.
            var skyline = MakeColoredQuad(
                "Skyline",
                center: new Vector3(8, -8.5f, 4.7f),
                size: new Vector2(40, 1.4f),
                color: new Color(0.10f, 0.12f, 0.18f, 1f),
                sortingOrder: -97);
            // Group them.
            var parent = new GameObject("Backdrop");
            sky.transform.SetParent(parent.transform);
            skyMid.transform.SetParent(parent.transform);
            ground.transform.SetParent(parent.transform);
            skyline.transform.SetParent(parent.transform);
        }

        /// <summary>Y-shaped wooden post with elastic. Drawn from 3
        /// thin colored quads parented to the slingshot anchor.</summary>
        private static void BuildSlingshotRig(Transform parent)
        {
            // Trunk (vertical brown rect).
            var trunk = MakeColoredQuad(
                "Trunk",
                center: new Vector3(0, -0.45f, 1),
                size: new Vector2(0.18f, 0.9f),
                color: new Color(0.43f, 0.28f, 0.13f, 1f),
                sortingOrder: -10);
            trunk.transform.SetParent(parent, false);
            trunk.transform.localPosition = new Vector3(0, -0.45f, 1);

            // Left fork (angled).
            var leftFork = MakeColoredQuad(
                "ForkLeft",
                center: Vector3.zero,
                size: new Vector2(0.12f, 0.8f),
                color: new Color(0.49f, 0.35f, 0.18f, 1f),
                sortingOrder: -10);
            leftFork.transform.SetParent(parent, false);
            leftFork.transform.localPosition = new Vector3(-0.22f, 0.4f, 1);
            leftFork.transform.localRotation = Quaternion.AngleAxis(20, Vector3.forward);

            // Right fork.
            var rightFork = MakeColoredQuad(
                "ForkRight",
                center: Vector3.zero,
                size: new Vector2(0.12f, 0.8f),
                color: new Color(0.49f, 0.35f, 0.18f, 1f),
                sortingOrder: -10);
            rightFork.transform.SetParent(parent, false);
            rightFork.transform.localPosition = new Vector3(0.22f, 0.4f, 1);
            rightFork.transform.localRotation = Quaternion.AngleAxis(-20, Vector3.forward);

            // Elastic band (red horizontal line at top of forks).
            var band = MakeColoredQuad(
                "Elastic",
                center: Vector3.zero,
                size: new Vector2(0.7f, 0.06f),
                color: new Color(0.94f, 0.28f, 0.43f, 1f),
                sortingOrder: -9);
            band.transform.SetParent(parent, false);
            band.transform.localPosition = new Vector3(0, 0.78f, 0.9f);
        }

        private static TrajectoryPreview BuildTrajectoryPreview(Transform parent)
        {
            var go = new GameObject("TrajectoryPreview");
            go.transform.SetParent(parent, false);
            var line = go.AddComponent<LineRenderer>();
            line.startWidth = 0.08f;
            line.endWidth = 0.05f;
            line.useWorldSpace = true;
            line.numCapVertices = 4;
            line.numCornerVertices = 4;
            line.sortingOrder = 5;
            // Gradient white → fading transparent so the start of the
            // arc reads stronger than the end.
            var grad = new Gradient();
            grad.SetKeys(
                new[]
                {
                    new GradientColorKey(Color.white, 0f),
                    new GradientColorKey(Color.white, 1f),
                },
                new[]
                {
                    new GradientAlphaKey(1f, 0f),
                    new GradientAlphaKey(0.0f, 1f),
                });
            line.colorGradient = grad;
            // Material — Sprites/Default with fallback chain like the
            // particle emitter does.
            var shader = Shader.Find("Sprites/Default") ?? Shader.Find("Unlit/Color");
            if (shader != null)
            {
                line.material = new Material(shader);
            }
            return go.AddComponent<TrajectoryPreview>();
        }

        private static GameObject BuildScoreFlairCanvas()
        {
            var go = new GameObject("ScoreFlairCanvas");
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.WorldSpace;
            canvas.sortingOrder = 100;
            var rt = go.GetComponent<RectTransform>();
            rt.sizeDelta = new Vector2(20, 20);
            rt.position = Vector3.zero;
            return go;
        }

        private static GameObject BuildGoalCalloutCanvas(out GoalCallout callout)
        {
            var canvasGO = new GameObject("GoalCalloutCanvas");
            var canvas = canvasGO.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvas.sortingOrder = 90;
            canvasGO.AddComponent<CanvasScaler>().uiScaleMode =
                CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGO.AddComponent<GraphicRaycaster>();

            var calloutGO = new GameObject("GoalCallout");
            calloutGO.transform.SetParent(canvasGO.transform, false);
            var crt = calloutGO.AddComponent<RectTransform>();
            crt.anchorMin = new Vector2(0.5f, 0.5f);
            crt.anchorMax = new Vector2(0.5f, 0.5f);
            crt.sizeDelta = new Vector2(800, 200);
            crt.anchoredPosition = Vector2.zero;

            var group = calloutGO.AddComponent<CanvasGroup>();
            group.alpha = 0;

            var tmp = calloutGO.AddComponent<TextMeshProUGUI>();
            tmp.text = "GOAL!";
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.fontSize = 140;
            tmp.fontStyle = FontStyles.Bold;
            tmp.color = new Color(1f, 0.82f, 0.4f, 1f);
            tmp.outlineColor = Color.black;
            tmp.outlineWidth = 0.3f;

            callout = calloutGO.AddComponent<GoalCallout>();
            SetSerialized(callout, "text", tmp);
            SetSerialized(callout, "group", group);
            return canvasGO;
        }

        /// <summary>Generic colored quad — SpriteRenderer with a built-in
        /// 1×1 white sprite stretched to size and tinted. Avoids needing
        /// a runtime mesh / material.</summary>
        private static GameObject MakeColoredQuad(
            string name,
            Vector3 center,
            Vector2 size,
            Color color,
            int sortingOrder)
        {
            var go = new GameObject(name);
            go.transform.position = center;
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = AssetDatabase.GetBuiltinExtraResource<Sprite>(
                "UI/Skin/UISprite.psd");
            sr.drawMode = SpriteDrawMode.Sliced;
            sr.size = size;
            sr.color = color;
            sr.sortingOrder = sortingOrder;
            return go;
        }
    }
}
#endif
