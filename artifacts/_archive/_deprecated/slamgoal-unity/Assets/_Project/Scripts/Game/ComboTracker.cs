using System.Collections.Generic;

namespace SlamGoal.Game
{
    /// <summary>
    /// Tracks recent destruction timestamps and surfaces a multiplier
    /// based on how many destructions land inside a rolling window.
    ///
    /// Same model as the React-Native era's lib/levelLoader.ts pruning
    /// logic. Three destroys within 500 ms = ×1.5; five = ×2.
    /// </summary>
    public class ComboTracker
    {
        public const float WindowSeconds = 0.5f;

        private readonly List<float> _timestamps = new();

        /// <summary>Adds a destruction event and returns the multiplier
        /// that applies to its score award (which factors the new
        /// event itself into the count).</summary>
        public float RecordAndGetMultiplier(float timeSeconds)
        {
            _timestamps.Add(timeSeconds);
            // Prune events older than the window.
            while (_timestamps.Count > 0 &&
                   timeSeconds - _timestamps[0] > WindowSeconds)
            {
                _timestamps.RemoveAt(0);
            }
            return MultiplierFor(_timestamps.Count);
        }

        public void Reset()
        {
            _timestamps.Clear();
        }

        public static float MultiplierFor(int destroysInWindow)
        {
            if (destroysInWindow >= 5) return 2f;
            if (destroysInWindow >= 3) return 1.5f;
            return 1f;
        }
    }
}
