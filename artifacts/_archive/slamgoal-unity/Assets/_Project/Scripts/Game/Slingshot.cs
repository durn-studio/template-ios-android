using System;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.EnhancedTouch;
using TouchPhase = UnityEngine.InputSystem.TouchPhase;

namespace SlamGoal.Game
{
    /// <summary>
    /// Touch / mouse drag-and-release slingshot input.
    ///
    /// Touch model (Angry-Birds-canonical):
    ///   • Anywhere on the canvas, touch-down to begin aiming.
    ///   • Drag: launch vector points from current finger position
    ///     back to the anchor — drag down-left to launch up-right.
    ///   • Power scales linearly with drag distance, capped at MaxPullM.
    ///   • Release: fires OnLaunch(velocity); resets state.
    ///   • Drag distance under DeadZoneM is treated as a tap and ignored.
    ///
    /// Trajectory preview (Phase U2): a LineRenderer drawing the
    /// projected parabola for the first ~0.6 s. Skipped in U1 to keep
    /// the wiring minimum; the ball still launches with the right
    /// velocity, the player just has to learn the feel without dots.
    /// </summary>
    public class Slingshot : MonoBehaviour
    {
        [SerializeField] private float maxPullMeters = 2.5f;
        [SerializeField] private float deadZoneMeters = 0.2f;
        [SerializeField] private float velocityPerMeter = 8f;
        [Tooltip("Optional trajectory preview; disabled if null.")]
        [SerializeField] private TrajectoryPreview trajectory;

        public event Action<Vector2> OnLaunch;

        public bool Disabled { get; set; }

        private Camera _cam;
        private bool _isDragging;
        private Vector2 _dragWorld;

        private void Awake()
        {
            _cam = Camera.main;
        }

        private void OnEnable()
        {
            EnhancedTouchSupport.Enable();
        }

        private void OnDisable()
        {
            EnhancedTouchSupport.Disable();
        }

        private void Update()
        {
            if (Disabled) return;

            // Prefer touch (mobile); fall back to mouse for editor.
            var touches = UnityEngine.InputSystem.EnhancedTouch.Touch.activeTouches;
            if (touches.Count > 0)
            {
                ProcessPointer(touches[0].screenPosition,
                               touches[0].phase == TouchPhase.Began,
                               touches[0].phase == TouchPhase.Moved
                                  || touches[0].phase == TouchPhase.Stationary,
                               touches[0].phase == TouchPhase.Ended
                                  || touches[0].phase == TouchPhase.Canceled);
                return;
            }

            var mouse = Mouse.current;
            if (mouse == null) return;
            ProcessPointer(mouse.position.ReadValue(),
                           mouse.leftButton.wasPressedThisFrame,
                           mouse.leftButton.isPressed,
                           mouse.leftButton.wasReleasedThisFrame);
        }

        private void ProcessPointer(Vector2 screenPos, bool down, bool held, bool up)
        {
            if (down)
            {
                _isDragging = true;
                _dragWorld = ScreenToWorld(screenPos);
            }
            else if (held && _isDragging)
            {
                var raw = ScreenToWorld(screenPos);
                var anchor = (Vector2)transform.position;
                var pull = anchor - raw;
                if (pull.magnitude > maxPullMeters)
                {
                    raw = anchor - pull.normalized * maxPullMeters;
                }
                _dragWorld = raw;
                if (trajectory != null)
                {
                    var pullVec = anchor - _dragWorld;
                    var velocity = pullVec * velocityPerMeter;
                    trajectory.Predict(anchor, velocity);
                }
            }
            else if (up && _isDragging)
            {
                _isDragging = false;
                if (trajectory != null) trajectory.Hide();
                var anchor = (Vector2)transform.position;
                var pull = anchor - _dragWorld;
                if (pull.magnitude < deadZoneMeters) return;
                var velocity = pull * velocityPerMeter;
                OnLaunch?.Invoke(velocity);
            }
        }

        private Vector2 ScreenToWorld(Vector2 screen)
        {
            if (_cam == null) _cam = Camera.main;
            var w = _cam.ScreenToWorldPoint(new Vector3(screen.x, screen.y, -_cam.transform.position.z));
            return new Vector2(w.x, w.y);
        }
    }
}
