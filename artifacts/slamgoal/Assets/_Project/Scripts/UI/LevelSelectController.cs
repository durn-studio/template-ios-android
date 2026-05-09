using SlamGoal.Game;
using TMPro;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace SlamGoal.UI
{
    /// <summary>
    /// Level select scene controller. Iterates LevelRegistry.All and
    /// instantiates a LevelTilePrefab per entry into a grid container.
    /// Locked tiles (predecessor not cleared) are non-interactable.
    ///
    /// Tap → SessionState.PendingLevelId = id, then load Game scene.
    /// </summary>
    public class LevelSelectController : MonoBehaviour
    {
        [SerializeField] private RectTransform tileContainer;
        [SerializeField] private LevelTile tilePrefab;
        [SerializeField] private TextMeshProUGUI starsTotalText;
        [SerializeField] private Button backButton;

        private void Start()
        {
            if (backButton != null)
                backButton.onClick.AddListener(() => SceneManager.LoadScene("Main"));
            BuildGrid();
        }

        private void BuildGrid()
        {
            int totalStars = 0;
            int maxStars = LevelRegistry.All.Length * 3;
            for (int i = 0; i < LevelRegistry.All.Length; i++)
            {
                var id = LevelRegistry.All[i];
                var stars = SaveSystem.GetLevelStars(id);
                totalStars += stars;
                bool unlocked = i == 0
                    || SaveSystem.GetLevelStars(LevelRegistry.All[i - 1]) > 0;
                bool isBoss = System.Array.IndexOf(LevelRegistry.BossIds, id) >= 0;

                var tile = Instantiate(tilePrefab, tileContainer);
                tile.Configure(i + 1, id, stars, unlocked, isBoss, OnTileTap);
            }
            if (starsTotalText != null)
            {
                starsTotalText.text = $"{totalStars} / {maxStars}";
            }
        }

        private void OnTileTap(string levelId)
        {
            SessionState.PendingLevelId = levelId;
            SceneManager.LoadScene("Game");
        }
    }
}
