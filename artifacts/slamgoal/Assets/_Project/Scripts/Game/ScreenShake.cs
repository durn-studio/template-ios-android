using System.Collections;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Tween-driven screen shake. Attaches to a target Transform (a
    /// camera holder is conventional) and applies short XY translation
    /// jolts on demand. Replaces the React-Native era's Animated
    /// transforms; in Phase 2 of the Unity port we'll swap this for
    /// Cinemachine Impulse for proper camera framing on top of shake.
    /// </summary>
    public class ScreenShake : MonoBehaviour
    {
        [SerializeField] private Transform target;

        private Vector3 _basePosition;
        private Coroutine _activeShake;

        private void Awake()
        {
            if (target == null) target = transform;
            _basePosition = target.localPosition;
        }

        public void Trigger(float magnitude = 0.15f, float duration = 0.18f)
        {
            if (_activeShake != null) StopCoroutine(_activeShake);
            _activeShake = StartCoroutine(Shake(magnitude, duration));
        }

        private IEnumerator Shake(float magnitude, float duration)
        {
            var elapsed = 0f;
            while (elapsed < duration)
            {
                var t = elapsed / duration;
                var falloff = 1f - t * t;
                var dx = (Random.value * 2f - 1f) * magnitude * falloff;
                var dy = (Random.value * 2f - 1f) * magnitude * falloff * 0.6f;
                target.localPosition = _basePosition + new Vector3(dx, dy, 0f);
                elapsed += Time.deltaTime;
                yield return null;
            }
            target.localPosition = _basePosition;
            _activeShake = null;
        }
    }
}
