using System.Collections;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Lightweight Time.timeScale controller. Triggers a brief slow-mo
    /// at scripted moments — primarily on launch (so the player feels
    /// the impact of releasing the slingshot) and on big hits.
    ///
    /// Standalone so any system can call into it without depending on
    /// the GameManager's lifecycle.
    /// </summary>
    public class SlowMoController : MonoBehaviour
    {
        [SerializeField] private float launchTimescale = 0.35f;
        [SerializeField] private float launchHoldSeconds = 0.18f;
        [SerializeField] private float rampOutSeconds = 0.25f;

        private Coroutine _active;

        public void TriggerLaunch()
        {
            if (_active != null) StopCoroutine(_active);
            _active = StartCoroutine(SlowMoRoutine(launchTimescale, launchHoldSeconds, rampOutSeconds));
        }

        public void TriggerHitStop(float magnitude = 0.05f, float seconds = 0.06f)
        {
            if (_active != null) StopCoroutine(_active);
            _active = StartCoroutine(SlowMoRoutine(magnitude, seconds, 0.05f));
        }

        private IEnumerator SlowMoRoutine(float scale, float hold, float rampOut)
        {
            // Use unscaled time so the routine's own waits aren't
            // affected by the scale we're setting.
            Time.timeScale = scale;
            yield return new WaitForSecondsRealtime(hold);
            var t = 0f;
            while (t < rampOut)
            {
                t += Time.unscaledDeltaTime;
                Time.timeScale = Mathf.Lerp(scale, 1f, t / rampOut);
                yield return null;
            }
            Time.timeScale = 1f;
            _active = null;
        }

        private void OnDisable()
        {
            // Always restore on scene unload / disable.
            Time.timeScale = 1f;
        }
    }
}
