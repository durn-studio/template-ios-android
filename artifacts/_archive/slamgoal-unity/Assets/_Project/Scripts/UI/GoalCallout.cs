using System.Collections;
using TMPro;
using UnityEngine;

namespace SlamGoal.UI
{
    /// <summary>
    /// Animated "GOAL!" text overlay. Triggered when the ball crosses
    /// the goal sensor. Pop in (scale 0 → 1.2 → 1.0), hold for ~0.6s,
    /// fade out. Bowmasters-style announcer text without the
    /// announcer voice (Phase Unity 5b).
    /// </summary>
    public class GoalCallout : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI text;
        [SerializeField] private CanvasGroup group;
        [SerializeField] private float popInSeconds = 0.18f;
        [SerializeField] private float settleSeconds = 0.08f;
        [SerializeField] private float holdSeconds = 0.55f;
        [SerializeField] private float fadeOutSeconds = 0.3f;
        [SerializeField] private float overshoot = 1.25f;

        private Coroutine _active;

        private void Awake()
        {
            if (group == null) group = GetComponent<CanvasGroup>();
            if (group != null) group.alpha = 0f;
            transform.localScale = Vector3.zero;
        }

        public void Pop(string label = "GOAL!")
        {
            if (text != null) text.text = label;
            if (_active != null) StopCoroutine(_active);
            _active = StartCoroutine(PopRoutine());
        }

        private IEnumerator PopRoutine()
        {
            transform.localScale = Vector3.zero;
            if (group != null) group.alpha = 1f;

            // Pop in to overshoot scale.
            yield return ScaleTo(Vector3.one * overshoot, popInSeconds, EaseOutBack);
            // Settle to 1.
            yield return ScaleTo(Vector3.one, settleSeconds, EaseOutQuad);
            // Hold (unscaled time so slow-mo doesn't elongate the hold).
            var t = 0f;
            while (t < holdSeconds)
            {
                t += Time.unscaledDeltaTime;
                yield return null;
            }
            // Fade out.
            var startAlpha = group != null ? group.alpha : 1f;
            t = 0f;
            while (t < fadeOutSeconds)
            {
                t += Time.unscaledDeltaTime;
                if (group != null) group.alpha = Mathf.Lerp(startAlpha, 0f, t / fadeOutSeconds);
                yield return null;
            }
            if (group != null) group.alpha = 0f;
            transform.localScale = Vector3.zero;
            _active = null;
        }

        private IEnumerator ScaleTo(Vector3 target, float seconds, System.Func<float, float> ease)
        {
            var start = transform.localScale;
            var t = 0f;
            while (t < seconds)
            {
                t += Time.unscaledDeltaTime;
                var u = ease(Mathf.Clamp01(t / seconds));
                transform.localScale = Vector3.LerpUnclamped(start, target, u);
                yield return null;
            }
            transform.localScale = target;
        }

        private static float EaseOutQuad(float t) => 1f - (1f - t) * (1f - t);

        private static float EaseOutBack(float t)
        {
            const float c1 = 1.70158f;
            const float c3 = c1 + 1f;
            return 1f + c3 * Mathf.Pow(t - 1f, 3f) + c1 * Mathf.Pow(t - 1f, 2f);
        }
    }
}
