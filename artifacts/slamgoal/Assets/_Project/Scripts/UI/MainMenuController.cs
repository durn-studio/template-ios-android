using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;

namespace SlamGoal.UI
{
    /// <summary>
    /// Main scene entry point. Two buttons: Play (→ LevelSelect) and
    /// Quit (Application.Quit; no-ops in editor). Phase U2 adds
    /// Settings / Leaderboard / IAP top-up.
    /// </summary>
    public class MainMenuController : MonoBehaviour
    {
        [SerializeField] private Button playButton;
        [SerializeField] private Button quitButton;

        private void Awake()
        {
            if (playButton != null) playButton.onClick.AddListener(OnPlay);
            if (quitButton != null) quitButton.onClick.AddListener(OnQuit);
        }

        private void OnPlay()
        {
            SceneManager.LoadScene("LevelSelect");
        }

        private void OnQuit()
        {
            Application.Quit();
#if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
#endif
        }
    }
}
