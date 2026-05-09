using SlamGoal.Data;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Orthographic camera framing for a level. Sizes the camera so the
    /// level's full width × height fits inside the visible area with
    /// letterbox bars on the constrained axis.
    ///
    /// Phase U2 will extend with smooth follow during ball flight via
    /// Cinemachine. Phase U1 keeps the camera static.
    /// </summary>
    [RequireComponent(typeof(Camera))]
    public class CameraController : MonoBehaviour
    {
        private Camera _cam;

        private void Awake()
        {
            _cam = GetComponent<Camera>();
            _cam.orthographic = true;
        }

        public void FrameLevel(LevelData level)
        {
            if (_cam == null) _cam = GetComponent<Camera>();

            // Camera centre = level centre (with y-flip; Unity is y-up).
            transform.position = new Vector3(
                level.width / 2f,
                -level.height / 2f,
                -10f);

            // Choose orthographicSize so both axes fit. Camera height
            // in world units = orthographicSize * 2; camera width =
            // height * aspect. Pick the larger of the two needed sizes.
            var aspect = (float)Screen.width / Mathf.Max(1, Screen.height);
            var heightFit = level.height / 2f;
            var widthFit = (level.width / aspect) / 2f;
            _cam.orthographicSize = Mathf.Max(heightFit, widthFit);
        }
    }
}
