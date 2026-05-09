using SlamGoal.Data;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Footballer projectile. Spawned by Slingshot on launch, removed
    /// by GameManager once at rest or off-screen.
    ///
    /// Expects:
    ///   • Rigidbody2D (dynamic, gravity scale 1)
    ///   • CircleCollider2D
    ///   • SpriteRenderer (placeholder until art lands)
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(CircleCollider2D))]
    public class Ball : MonoBehaviour
    {
        [Tooltip("Below this linear velocity (m/s), the ball is " +
                 "considered at rest and the shot ends.")]
        public float restVelocityThreshold = 0.4f;

        [Tooltip("Frames of sub-threshold velocity before the ball " +
                 "is officially at rest (guards against the apex of " +
                 "a high arc registering as resting).")]
        public int restFramesRequired = 30;

        public FootballerSO Footballer { get; private set; }

        private Rigidbody2D _rb;
        private CircleCollider2D _circle;
        private int _restFrames;

        public bool IsAtRest { get; private set; }

        private void Awake()
        {
            _rb = GetComponent<Rigidbody2D>();
            _circle = GetComponent<CircleCollider2D>();
        }

        public void Configure(FootballerSO footballer)
        {
            Footballer = footballer;
            _circle.radius = footballer.radius;
            _rb.linearDamping = 0.15f;
            _rb.angularDamping = 0.5f;
            _rb.gravityScale = 1f;
            // Density on the collider drives Rigidbody2D mass with
            // useAutoMass enabled (preferred for 2D physics balance).
            _rb.useAutoMass = true;
            _circle.density = footballer.density;
            _circle.sharedMaterial = CreatePhysicsMaterial(footballer);
            // Apply visuals.
            var sr = GetComponent<SpriteRenderer>();
            if (sr != null)
            {
                sr.color = footballer.color;
                if (footballer.sprite != null) sr.sprite = footballer.sprite;
            }
        }

        public void Launch(Vector2 velocity)
        {
            var mult = Footballer != null ? Footballer.launchVelocityMultiplier : 1f;
            _rb.linearVelocity = velocity * mult;
            _restFrames = 0;
            IsAtRest = false;
        }

        public Vector2 LinearVelocity => _rb.linearVelocity;
        public Vector2 Position => _rb.position;

        private void FixedUpdate()
        {
            if (IsAtRest) return;
            var speed = _rb.linearVelocity.magnitude;
            if (speed < restVelocityThreshold) _restFrames++;
            else _restFrames = 0;
            if (_restFrames >= restFramesRequired)
            {
                IsAtRest = true;
            }
        }

        private static PhysicsMaterial2D CreatePhysicsMaterial(FootballerSO footballer)
        {
            var mat = new PhysicsMaterial2D($"{footballer.id}_phys")
            {
                bounciness = footballer.restitution,
                friction = footballer.friction,
            };
            return mat;
        }
    }
}
