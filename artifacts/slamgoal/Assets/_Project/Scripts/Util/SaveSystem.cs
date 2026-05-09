using UnityEngine;

namespace SlamGoal.UI
{
    /// <summary>
    /// PlayerPrefs-backed save system for star totals + simple settings.
    /// Mirrors the React-Native era's GameContext.recordLevelStars API
    /// — monotonic update (never downgrades a prior best).
    ///
    /// Phase U6 layers Apple Game Center / Google Play Games on top
    /// for cross-device leaderboard sync; the local cache stays here.
    /// </summary>
    public static class SaveSystem
    {
        private const string StarPrefix = "sg_level_stars_";
        private const string TutorialKey = "sg_seen_tutorial_v1";
        private const string SelectedFootballerKey = "sg_selected_footballer_id";

        public static int GetLevelStars(string levelId)
        {
            return PlayerPrefs.GetInt(StarPrefix + levelId, 0);
        }

        public static int RecordLevelStars(string levelId, int stars)
        {
            stars = Mathf.Clamp(stars, 0, 3);
            var existing = GetLevelStars(levelId);
            if (stars <= existing) return existing;
            PlayerPrefs.SetInt(StarPrefix + levelId, stars);
            PlayerPrefs.Save();
            return stars;
        }

        public static int TotalStars()
        {
            int total = 0;
            foreach (var id in SlamGoal.Game.LevelRegistry.All)
            {
                total += GetLevelStars(id);
            }
            return total;
        }

        public static bool HasSeenTutorial
        {
            get => PlayerPrefs.GetInt(TutorialKey, 0) == 1;
            set
            {
                PlayerPrefs.SetInt(TutorialKey, value ? 1 : 0);
                PlayerPrefs.Save();
            }
        }

        public static string SelectedFootballerId
        {
            get => PlayerPrefs.GetString(SelectedFootballerKey, "striker_sam");
            set
            {
                PlayerPrefs.SetString(SelectedFootballerKey, value);
                PlayerPrefs.Save();
            }
        }
    }
}
