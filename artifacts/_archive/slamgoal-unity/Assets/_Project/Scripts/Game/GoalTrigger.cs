using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Sensor area that fires GameManager.OnGoalEntered when an active
    /// ball enters. Configured via LevelLoader from the level JSON's
    /// goal AABB. Expects a BoxCollider2D set as `isTrigger`.
    /// </summary>
    [RequireComponent(typeof(BoxCollider2D))]
    public class GoalTrigger : MonoBehaviour
    {
        private GameManager _gameManager;

        public void Initialize(GameManager manager)
        {
            _gameManager = manager;
            var col = GetComponent<BoxCollider2D>();
            col.isTrigger = true;
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (_gameManager == null) return;
            var ball = other.GetComponent<Ball>();
            if (ball == null) return;
            _gameManager.OnBallEnteredGoal(ball);
        }
    }
}
