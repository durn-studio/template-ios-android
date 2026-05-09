using UnityEngine;

namespace SlamGoal.Data
{
    /// <summary>
    /// Slam Goal — footballer roster entry.
    ///
    /// One ScriptableObject per character. Created in the editor via
    /// Assets → Create → Slam Goal → Footballer. The data parallels the
    /// React-Native version's constants/footballers.ts but moves the
    /// concrete Box2D parameters (radius, density, restitution) into
    /// inspector-editable fields so the designer can iterate without a
    /// code edit.
    ///
    /// Sprite + idle animator are optional pointers — leaving them null
    /// lets the launch path fall back to a placeholder circle. Phase 2
    /// of the Unity port wires real Spine / 2D Animation rigs here.
    /// </summary>
    [CreateAssetMenu(fileName = "Footballer", menuName = "Slam Goal/Footballer")]
    public class FootballerSO : ScriptableObject
    {
        [Header("Identity")]
        [Tooltip("Stable id used to look this footballer up at runtime " +
                 "(matches the React-Native era's `striker_sam` etc.).")]
        public string id = "striker_sam";

        public string displayName = "Striker Sam";

        [Header("Stats (1-5 per design doc §4.2)")]
        [Range(1, 5)] public int powerStat = 4;
        [Range(1, 5)] public int accuracyStat = 3;
        [Range(1, 5)] public int abilityStat = 3;
        [Range(1, 5)] public int durabilityStat = 3;

        [Header("Body parameters (Rigidbody2D / CircleCollider2D)")]
        [Tooltip("Body radius in world units (1 unit = 1 meter).")]
        public float radius = 0.28f;

        [Tooltip("Higher = heavier impact damage. Defaults sit between" +
                 " 3 and 8 across the roster.")]
        public float density = 4f;

        [Range(0f, 1f)] public float restitution = 0.35f;
        [Range(0f, 1f)] public float friction = 0.4f;

        [Header("Visuals")]
        [Tooltip("Color used as a fallback render when no sprite is " +
                 "assigned. Should match the React-Native era's body " +
                 "color so the picker dot + the in-world circle read " +
                 "as the same character.")]
        public Color color = new Color32(0xff, 0xd1, 0x66, 0xff);

        [Tooltip("Optional sprite atlas / sheet for the character. " +
                 "Phase 5b's art pass will populate.")]
        public Sprite sprite;

        [Header("Ability")]
        public AbilityId ability = AbilityId.PowerShot;

        [Tooltip("Launch-velocity multiplier applied at spawn. Power " +
                 "Shot = 1.3; the rest default to 1.0 unless tuned.")]
        public float launchVelocityMultiplier = 1.3f;

        [Tooltip("Active-ability impulse strength. Banana Kick scales " +
                 "the perpendicular impulse magnitude by this value.")]
        public float abilityStrength = 4.5f;
    }
}
