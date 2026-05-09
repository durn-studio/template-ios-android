using System;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Score / combo bookkeeping. Owned by GameManager. Subscribers
    /// (HUD, particle flair, audio) hook OnScoreChanged + OnDestroyScored.
    /// </summary>
    public class ScoreSystem : MonoBehaviour
    {
        [SerializeField] private int goalBonus = 1000;

        public int Score { get; private set; }
        public ComboTracker Combo { get; } = new();

        public event Action<int> OnScoreChanged;
        /// <summary>(materialId, points, comboCount, worldPos)</summary>
        public event Action<string, int, int, Vector3> OnDestroyScored;

        public void Reset()
        {
            Score = 0;
            Combo.Reset();
            OnScoreChanged?.Invoke(Score);
        }

        public int RecordDestruction(string materialId, int basePoints, Vector3 worldPos)
        {
            var mult = Combo.RecordAndGetMultiplier(Time.time);
            var awarded = Mathf.RoundToInt(basePoints * mult);
            Score += awarded;
            OnDestroyScored?.Invoke(materialId, awarded, EstimateComboCount(mult), worldPos);
            OnScoreChanged?.Invoke(Score);
            return awarded;
        }

        public int RecordGoalBonus()
        {
            Score += goalBonus;
            OnScoreChanged?.Invoke(Score);
            return goalBonus;
        }

        // Reverse-engineer the timestamp count from the multiplier so
        // subscribers can flash "3-COMBO!" / "5-COMBO!" without the
        // ScoreSystem having to expose the internal list.
        private static int EstimateComboCount(float mult)
        {
            if (mult >= 2f) return 5;
            if (mult >= 1.5f) return 3;
            return 1;
        }
    }
}
