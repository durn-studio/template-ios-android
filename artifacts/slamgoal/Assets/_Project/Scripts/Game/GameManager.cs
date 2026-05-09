using System;
using System.Collections.Generic;
using SlamGoal.Data;
using SlamGoal.UI;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Per-level orchestrator. Boots the level via LevelLoader, owns
    /// the slingshot input + ball lifecycle + score system, drives the
    /// results screen on goal / out-of-shots, and handles retry / next
    /// level navigation.
    ///
    /// Lives in Game.unity scene. SaveSystem (PlayerPrefs) persists
    /// star totals across runs.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        [Header("Wiring")]
        [SerializeField] private LevelLoader levelLoader;
        [SerializeField] private Slingshot slingshot;
        [SerializeField] private Ball ballPrefab;
        [SerializeField] private ScoreSystem scoreSystem;
        [SerializeField] private ResultsCanvas resultsCanvas;
        [SerializeField] private CameraController cameraController;
        [SerializeField] private ScreenShake screenShake;
        [SerializeField] private ParticleEmitter particleEmitter;
        [SerializeField] private SlowMoController slowMo;
        [SerializeField] private GoalCallout goalCallout;

        [Header("Footballer + level resolution")]
        [SerializeField] private FootballerSO defaultFootballer;
        [SerializeField] private string defaultLevelId = "world1-level1";

        public LevelData CurrentLevel { get; private set; }
        public FootballerSO SelectedFootballer { get; private set; }

        public bool DamageEnabled { get; private set; }

        public int ShotsLeft { get; private set; }

        private readonly List<Ball> _activeBalls = new();
        private readonly Dictionary<string, MaterialSO> _materialCache = new();
        private bool _goalReached;
        private bool _resultsSubmitted;

        public event Action<FootballerSO> OnSelectedFootballerChanged;

        private void Start()
        {
            // Build the material cache from Resources/Materials/*.asset.
            // Each MaterialSO has its `id` field; we map id → SO so the
            // level loader can look up materials by string id.
            var allMaterials = Resources.LoadAll<MaterialSO>("Materials");
            foreach (var mat in allMaterials)
            {
                if (!string.IsNullOrEmpty(mat.id))
                {
                    _materialCache[mat.id] = mat;
                }
            }

            SelectedFootballer = defaultFootballer;
            BeginLevel(LevelToLoadOnStart());
            slingshot.OnLaunch += HandleLaunch;
            scoreSystem.OnDestroyScored += HandleDestroyScored;
        }

        private void OnDestroy()
        {
            if (slingshot != null) slingshot.OnLaunch -= HandleLaunch;
            if (scoreSystem != null) scoreSystem.OnDestroyScored -= HandleDestroyScored;
        }

        private string LevelToLoadOnStart()
        {
            // Pulled from a session-scoped static set by LevelSelectController
            // when the player taps a level tile.
            if (!string.IsNullOrEmpty(SessionState.PendingLevelId))
            {
                var id = SessionState.PendingLevelId;
                SessionState.PendingLevelId = null;
                return id;
            }
            return defaultLevelId;
        }

        public void BeginLevel(string levelId)
        {
            CurrentLevel = levelLoader.LoadFromResources(levelId);
            if (CurrentLevel == null)
            {
                Debug.LogError($"[GameManager] could not load {levelId}");
                return;
            }
            levelLoader.Clear();
            scoreSystem.Reset();
            _activeBalls.Clear();
            DamageEnabled = false;
            _goalReached = false;
            _resultsSubmitted = false;
            ShotsLeft = CurrentLevel.shotsAllowed;

            levelLoader.PopulateScene(CurrentLevel, this);

            // Place slingshot anchor in world.
            slingshot.transform.position = new Vector3(
                CurrentLevel.slingshot.x,
                -CurrentLevel.slingshot.y,
                0f);

            // Frame the camera around the level.
            cameraController.FrameLevel(CurrentLevel);

            resultsCanvas.Hide();
        }

        public void RetryCurrentLevel()
        {
            if (CurrentLevel == null) return;
            BeginLevel(CurrentLevel.id);
        }

        public void GoToNextLevel()
        {
            if (CurrentLevel == null) return;
            var nextId = LevelRegistry.NextLevelId(CurrentLevel.id);
            if (string.IsNullOrEmpty(nextId)) return;
            BeginLevel(nextId);
        }

        public MaterialSO LookupMaterial(string id)
        {
            return _materialCache.TryGetValue(id, out var mat) ? mat : null;
        }

        public void SetSelectedFootballer(FootballerSO f)
        {
            if (f == null) return;
            SelectedFootballer = f;
            OnSelectedFootballerChanged?.Invoke(f);
        }

        // ── Ball lifecycle ────────────────────────────────────────

        public Ball SpawnBall(FootballerSO footballer, Vector2 worldPos)
        {
            var ball = Instantiate(ballPrefab, worldPos, Quaternion.identity, transform);
            ball.Configure(footballer);
            _activeBalls.Add(ball);
            return ball;
        }

        public void DespawnBall(Ball ball)
        {
            _activeBalls.Remove(ball);
            if (ball != null) Destroy(ball.gameObject);
        }

        private void HandleLaunch(Vector2 velocity)
        {
            if (_resultsSubmitted) return;
            if (_activeBalls.Count > 0) return;
            if (ShotsLeft <= 0) return;
            var anchor = (Vector2)slingshot.transform.position;
            var ball = SpawnBall(SelectedFootballer, anchor);
            ball.Launch(velocity);
            ShotsLeft--;
            DamageEnabled = true; // settle period is over.
            if (slowMo != null) slowMo.TriggerLaunch();
        }

        // Called by Slingshot via UI button when an active ability is
        // available.
        public void TriggerAbility()
        {
            if (_resultsSubmitted) return;
            if (SelectedFootballer == null) return;
            if (!SelectedFootballer.ability.IsActive()) return;
            if (_activeBalls.Count == 0) return;
            var next = Abilities.Apply(SelectedFootballer, _activeBalls, this);
            _activeBalls.Clear();
            _activeBalls.AddRange(next);
        }

        public void OnBallEnteredGoal(Ball ball)
        {
            if (_resultsSubmitted) return;
            if (!_activeBalls.Contains(ball)) return;
            _goalReached = true;
            scoreSystem.RecordGoalBonus();
            screenShake.Trigger(magnitude: 0.32f, duration: 0.3f);
            if (slowMo != null) slowMo.TriggerHitStop(0.1f, 0.15f);
            if (goalCallout != null) goalCallout.Pop("GOAL!");
            FireGoalConfetti(ball.transform.position);
            FireResults(true);
        }

        public void OnBlockDestroyed(MaterialBlock block)
        {
            var mat = block.material;
            if (mat == null) return;
            scoreSystem.RecordDestruction(mat.id, mat.scoreOnDestroy, block.transform.position);
            particleEmitter.Burst(block.transform.position, mat.color, Mathf.Max(2, mat.fragments));
            screenShake.Trigger(0.1f, 0.12f);
            Destroy(block.gameObject);
        }

        // ── Per-frame ─────────────────────────────────────────────

        private void Update()
        {
            if (_resultsSubmitted) return;

            // Reap balls that have rested or fallen off-world.
            for (int i = _activeBalls.Count - 1; i >= 0; i--)
            {
                var ball = _activeBalls[i];
                if (ball == null)
                {
                    _activeBalls.RemoveAt(i);
                    continue;
                }
                if (ball.IsAtRest || IsOffWorld(ball.Position))
                {
                    _activeBalls.RemoveAt(i);
                    Destroy(ball.gameObject);
                }
            }

            // Out-of-shots check.
            if (!_goalReached && ShotsLeft <= 0 && _activeBalls.Count == 0)
            {
                FireResults(false);
            }
        }

        private bool IsOffWorld(Vector2 pos)
        {
            if (CurrentLevel == null) return false;
            return pos.y < -(CurrentLevel.height + 1f)
                || pos.x < -1f
                || pos.x > CurrentLevel.width + 1f;
        }

        private void FireResults(bool cleared)
        {
            if (_resultsSubmitted) return;
            _resultsSubmitted = true;
            var stars = cleared
                ? CurrentLevel.stars.StarsForScore(scoreSystem.Score)
                : 0;
            resultsCanvas.Show(cleared, scoreSystem.Score, stars);
            if (cleared)
            {
                SaveSystem.RecordLevelStars(CurrentLevel.id, stars);
            }
        }

        private void FireGoalConfetti(Vector3 worldPos)
        {
            // 24 confetti in a few different colors.
            var palette = new[]
            {
                new Color32(0xff, 0xd1, 0x66, 0xff),
                new Color32(0x06, 0xd6, 0xa0, 0xff),
                new Color32(0x4c, 0xc9, 0xf0, 0xff),
                new Color32(0xef, 0x47, 0x6f, 0xff),
            };
            for (int i = 0; i < 4; i++)
            {
                particleEmitter.Burst(worldPos, palette[i], 6);
            }
        }

        private void HandleDestroyScored(string materialId, int points, int comboCount, Vector3 worldPos)
        {
            // UI flair hook — Phase U2 will add a floating "+points"
            // tween here. For U1, the score readout in HUD is the
            // only feedback (animated by the score system itself).
        }
    }

    /// <summary>
    /// Session-scoped state — survives scene loads via static fields.
    /// LevelSelectController writes PendingLevelId before Scene.Load("Game").
    /// </summary>
    public static class SessionState
    {
        public static string PendingLevelId;
    }

    public static class LevelRegistry
    {
        // Mirrors the React-Native era's LEVEL_IDS array. Hard-coded
        // because there are only 12 levels in Phase Unity 1-4. When
        // Phase U6 adds more worlds, switch to a Resources-driven
        // discovery pass.
        public static readonly string[] All =
        {
            "world1-level1", "world1-level2", "world1-level3",
            "world1-level4", "world1-level5", "world1-level6",
            "world1-level7", "world1-level8", "world1-level9",
            "world1-level10", "world1-level11", "world1-level12",
        };

        public static readonly string[] BossIds = { "world1-level12" };

        public static string NextLevelId(string current)
        {
            for (int i = 0; i < All.Length - 1; i++)
            {
                if (All[i] == current) return All[i + 1];
            }
            return null;
        }
    }
}
