using System.Collections;
using SlamGoal.Game;
using TMPro;
using UnityEngine;

namespace SlamGoal.UI
{
    /// <summary>
    /// Spawns a floating "+points" label at the world position of
    /// each destruction. Subscribes to ScoreSystem.OnDestroyScored
    /// and animates a TextMeshPro instance up + fade-out.
    ///
    /// Combo flair: when the multiplier kicks in (3+ in window), the
    /// label colors brighter and shows "x3 COMBO!" as a secondary line.
    /// </summary>
    public class ScoreFlair : MonoBehaviour
    {
        [SerializeField] private ScoreSystem scoreSystem;
        [Tooltip("Canvas (World Space) under which floating labels spawn.")]
        [SerializeField] private Canvas worldCanvas;
        [Tooltip("Optional prefab override; if null, a default TMP is " +
                 "built at runtime.")]
        [SerializeField] private TextMeshProUGUI labelPrefab;

        [SerializeField] private float floatDistance = 1.2f;
        [SerializeField] private float lifetime = 0.9f;
        [SerializeField] private Color normalColor = new Color(1f, 1f, 1f, 1f);
        [SerializeField] private Color comboColor = new Color(1f, 0.819f, 0.4f, 1f);

        private void OnEnable()
        {
            if (scoreSystem != null)
            {
                scoreSystem.OnDestroyScored += HandleDestroy;
            }
        }

        private void OnDisable()
        {
            if (scoreSystem != null)
            {
                scoreSystem.OnDestroyScored -= HandleDestroy;
            }
        }

        private void HandleDestroy(string materialId, int points, int comboCount, Vector3 worldPos)
        {
            SpawnLabel(worldPos, points, comboCount);
        }

        private void SpawnLabel(Vector3 worldPos, int points, int comboCount)
        {
            if (worldCanvas == null) return;
            TextMeshProUGUI tmp;
            if (labelPrefab != null)
            {
                tmp = Instantiate(labelPrefab, worldCanvas.transform);
            }
            else
            {
                var go = new GameObject("ScoreFlairLabel");
                go.transform.SetParent(worldCanvas.transform, false);
                var rt = go.AddComponent<RectTransform>();
                rt.sizeDelta = new Vector2(3, 1);
                tmp = go.AddComponent<TextMeshProUGUI>();
                tmp.alignment = TextAlignmentOptions.Center;
                tmp.fontSize = 0.5f;
                tmp.fontStyle = FontStyles.Bold;
                tmp.outlineColor = Color.black;
                tmp.outlineWidth = 0.25f;
            }
            var prefix = comboCount >= 3 ? $"+{points}\nx{comboCount} COMBO!" : $"+{points}";
            tmp.text = prefix;
            tmp.color = comboCount >= 3 ? comboColor : normalColor;
            var label = tmp.GetComponent<RectTransform>();
            label.position = worldPos;

            StartCoroutine(AnimateAndDestroy(tmp));
        }

        private IEnumerator AnimateAndDestroy(TextMeshProUGUI tmp)
        {
            var rt = tmp.GetComponent<RectTransform>();
            var startPos = rt.position;
            var endPos = startPos + new Vector3(0, floatDistance, 0);
            var startColor = tmp.color;
            var t = 0f;
            while (t < lifetime)
            {
                t += Time.deltaTime;
                var u = t / lifetime;
                rt.position = Vector3.Lerp(startPos, endPos, EaseOutQuad(u));
                var c = startColor;
                c.a = Mathf.Lerp(1f, 0f, u);
                tmp.color = c;
                yield return null;
            }
            Destroy(tmp.gameObject);
        }

        private static float EaseOutQuad(float t) => 1f - (1f - t) * (1f - t);
    }
}
