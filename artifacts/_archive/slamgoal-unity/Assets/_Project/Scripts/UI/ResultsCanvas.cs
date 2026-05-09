using SlamGoal.Game;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace SlamGoal.UI
{
    /// <summary>
    /// End-of-level overlay. Wired in the Game scene; GameManager calls
    /// Show() with cleared / score / stars and Hide() to dismiss.
    /// </summary>
    public class ResultsCanvas : MonoBehaviour
    {
        [SerializeField] private GameObject root;
        [SerializeField] private TextMeshProUGUI titleText;
        [SerializeField] private TextMeshProUGUI scoreText;
        [SerializeField] private Image[] starIcons;
        [SerializeField] private Button retryBtn;
        [SerializeField] private Button nextBtn;
        [SerializeField] private Button homeBtn;
        [SerializeField] private Color starOnColor = new Color32(0xff, 0xd1, 0x66, 0xff);
        [SerializeField] private Color starOffColor = new Color32(0x33, 0x33, 0x33, 0x80);

        [SerializeField] private GameManager gameManager;

        private void Awake()
        {
            if (retryBtn != null) retryBtn.onClick.AddListener(OnRetry);
            if (nextBtn != null) nextBtn.onClick.AddListener(OnNext);
            if (homeBtn != null) homeBtn.onClick.AddListener(OnHome);
            if (root != null) root.SetActive(false);
        }

        public void Show(bool cleared, int score, int stars)
        {
            if (root != null) root.SetActive(true);
            if (titleText != null) titleText.text = cleared ? "GOAL!" : "MISSED";
            if (scoreText != null) scoreText.text = score.ToString("N0");
            if (starIcons != null)
            {
                for (int i = 0; i < starIcons.Length; i++)
                {
                    starIcons[i].color = i < stars ? starOnColor : starOffColor;
                }
            }
            if (nextBtn != null) nextBtn.gameObject.SetActive(cleared);
        }

        public void Hide()
        {
            if (root != null) root.SetActive(false);
        }

        private void OnRetry()
        {
            if (gameManager != null) gameManager.RetryCurrentLevel();
        }

        private void OnNext()
        {
            if (gameManager != null) gameManager.GoToNextLevel();
        }

        private void OnHome()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene("Main");
        }
    }
}
