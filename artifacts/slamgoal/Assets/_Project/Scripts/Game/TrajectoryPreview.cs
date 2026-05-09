using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Trajectory preview — projects a parabolic arc from the slingshot
    /// anchor in the player's pull direction, drawn via LineRenderer
    /// while the player is dragging. Mirrors the React-Native era's
    /// 6-dot preview but with a continuous line for crisper feel.
    ///
    /// Usage: Slingshot.cs calls Predict(launchVelocity) every frame
    /// during a drag, and Hide() on launch / cancel.
    /// </summary>
    [RequireComponent(typeof(LineRenderer))]
    public class TrajectoryPreview : MonoBehaviour
    {
        [Tooltip("Number of sample points along the arc.")]
        [SerializeField] private int segments = 24;

        [Tooltip("Total predicted flight time in seconds.")]
        [SerializeField] private float horizonSeconds = 0.8f;

        [Tooltip("Gravity Y in m/s² for the prediction. Should match " +
                 "Physics2D.gravity.y for accuracy.")]
        [SerializeField] private float gravityY = -12f;

        private LineRenderer _line;

        private void Awake()
        {
            _line = GetComponent<LineRenderer>();
            _line.positionCount = 0;
            _line.useWorldSpace = true;
        }

        public void Hide()
        {
            if (_line != null) _line.positionCount = 0;
        }

        public void Predict(Vector2 origin, Vector2 velocity)
        {
            if (_line == null) _line = GetComponent<LineRenderer>();
            _line.positionCount = segments;
            for (int i = 0; i < segments; i++)
            {
                var t = (i / (float)(segments - 1)) * horizonSeconds;
                var x = origin.x + velocity.x * t;
                var y = origin.y + velocity.y * t + 0.5f * gravityY * t * t;
                _line.SetPosition(i, new Vector3(x, y, 0));
            }
        }
    }
}
