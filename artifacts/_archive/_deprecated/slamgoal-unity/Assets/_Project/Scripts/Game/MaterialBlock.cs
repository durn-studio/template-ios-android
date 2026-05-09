using SlamGoal.Data;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Destructible (or static) block in a level. Carries a MaterialSO
    /// reference, accumulates impact damage on collisions, and notifies
    /// GameManager when its HP runs out.
    ///
    /// Expects:
    ///   • Rigidbody2D (dynamic / static / kinematic per level data)
    ///   • Collider2D (BoxCollider2D for boxes, CircleCollider2D for circles)
    ///   • SpriteRenderer (filled by LevelLoader from MaterialSO.sprite + color)
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    public class MaterialBlock : MonoBehaviour
    {
        public MaterialSO material;

        [Tooltip("Multiplier from contact impulse (kg·m/s) to damage. " +
                 "Typical 0.5; tune per playtest. Higher = more fragile.")]
        public float impactDamageScale = 0.5f;

        public float CurrentHp { get; private set; }
        public bool IsDestroyed { get; private set; }

        private GameManager _gameManager;

        public void Initialize(MaterialSO mat, GameManager manager)
        {
            material = mat;
            CurrentHp = mat.hp;
            _gameManager = manager;
        }

        private void OnCollisionEnter2D(Collision2D collision)
        {
            // Damage gating happens in GameManager (settle period
            // before first launch). Block stays oblivious until then.
            if (_gameManager == null || !_gameManager.DamageEnabled) return;

            float totalImpulse = 0f;
            foreach (var contact in collision.contacts)
            {
                totalImpulse += contact.normalImpulse;
            }
            if (totalImpulse <= 0f) return;

            ApplyDamage(totalImpulse * impactDamageScale);
        }

        private void OnCollisionStay2D(Collision2D collision)
        {
            // Re-fired by Box2D each fixed step the contact persists.
            // We let normal impacts damage on Enter; Stay would make
            // resting weight count as damage. Skip.
        }

        public void ApplyDamage(float amount)
        {
            if (IsDestroyed) return;
            CurrentHp -= amount;
            if (CurrentHp <= 0f)
            {
                IsDestroyed = true;
                _gameManager?.OnBlockDestroyed(this);
            }
        }
    }
}
