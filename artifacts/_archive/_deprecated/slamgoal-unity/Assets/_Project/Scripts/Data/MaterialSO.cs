using UnityEngine;

namespace SlamGoal.Data
{
    /// <summary>
    /// Slam Goal — destructible material definition.
    ///
    /// One ScriptableObject per material kind (wood, cardboard, tin,
    /// container, enemy, boss_captain). Used by the level loader when
    /// instantiating block prefabs.
    /// </summary>
    [CreateAssetMenu(fileName = "Material", menuName = "Slam Goal/Material")]
    public class MaterialSO : ScriptableObject
    {
        [Header("Identity")]
        [Tooltip("Stable id matching the level JSON's `material` field.")]
        public string id = "wood";

        [Header("Damage model")]
        [Tooltip("Cumulative impact damage above which the body breaks. " +
                 "Container is 9999 (effectively indestructible).")]
        public float hp = 80f;

        [Tooltip("Score awarded on destruction. Combo multiplier is " +
                 "applied on top by ScoreSystem.")]
        public int scoreOnDestroy = 100;

        [Tooltip("Particle count to spawn on destruction.")]
        public int fragments = 3;

        [Header("Body parameters")]
        public float density = 1.5f;

        [Range(0f, 1f)] public float friction = 0.5f;
        [Range(0f, 1f)] public float restitution = 0.2f;

        [Header("Visuals")]
        public Color color = new Color32(0xa4, 0x71, 0x48, 0xff);

        [Tooltip("Optional texture sprite. Falls back to colored sprite.")]
        public Sprite sprite;

        [Tooltip("If true, the level loader spawns this body as static " +
                 "(non-rigidbody architecture / immovable boundary).")]
        public bool defaultStatic;
    }
}
