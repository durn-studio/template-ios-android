using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

namespace SlamGoal.UI
{
    /// <summary>
    /// Single level tile in the level select grid. Configured at runtime
    /// by LevelSelectController.
    /// </summary>
    public class LevelTile : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI indexText;
        [SerializeField] private Image[] starIcons;
        [SerializeField] private GameObject lockOverlay;
        [SerializeField] private Button button;
        [SerializeField] private Color starOnColor = new Color32(0xff, 0xd1, 0x66, 0xff);
        [SerializeField] private Color starOffColor = new Color32(0x33, 0x33, 0x33, 0x80);
        [SerializeField] private Color bossTint = new Color32(0x7f, 0x00, 0x00, 0xff);

        public void Configure(
            int displayNumber,
            string levelId,
            int stars,
            bool unlocked,
            bool isBoss,
            Action<string> onTap)
        {
            if (indexText != null)
            {
                indexText.text = isBoss ? "BOSS" : displayNumber.ToString();
            }
            if (starIcons != null)
            {
                for (int i = 0; i < starIcons.Length; i++)
                {
                    starIcons[i].color = i < stars ? starOnColor : starOffColor;
                }
            }
            if (lockOverlay != null) lockOverlay.SetActive(!unlocked);
            if (button != null)
            {
                button.interactable = unlocked;
                button.onClick.RemoveAllListeners();
                button.onClick.AddListener(() => onTap?.Invoke(levelId));
            }
            if (isBoss)
            {
                var bg = GetComponent<Image>();
                if (bg != null) bg.color = bossTint;
            }
        }
    }
}
