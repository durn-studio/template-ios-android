using System.Collections.Generic;
using SlamGoal.Data;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Mid-flight active abilities. Caller passes the current ball set,
    /// receives the next ball set (split-shot fans the parent into 3
    /// children). Passive abilities (PowerShot, Header, Goalie) are
    /// handled at launch time / via stat tuning, not here.
    /// </summary>
    public static class Abilities
    {
        public const float SplitAngleRad = 0.32f; // ~18°

        public static List<Ball> Apply(
            FootballerSO footballer,
            List<Ball> balls,
            GameManager gameManager)
        {
            return footballer.ability switch
            {
                AbilityId.BananaKick => ApplyBananaKick(footballer, balls),
                AbilityId.SplitShot => ApplySplitShot(footballer, balls, gameManager),
                _ => balls, // passive: no-op
            };
        }

        private static List<Ball> ApplyBananaKick(FootballerSO footballer, List<Ball> balls)
        {
            foreach (var ball in balls)
            {
                if (ball == null) continue;
                var v = ball.LinearVelocity;
                var speed = v.magnitude;
                if (speed < 0.01f) continue;
                // Perpendicular impulse: rotate v by +90°, normalise,
                // scale by ABL stat. Adds a downward curve (topspin feel).
                var perp = new Vector2(-v.y, v.x).normalized;
                var rb = ball.GetComponent<Rigidbody2D>();
                rb.AddForce(perp * footballer.abilityStrength * rb.mass,
                            ForceMode2D.Impulse);
            }
            return balls;
        }

        private static List<Ball> ApplySplitShot(
            FootballerSO footballer,
            List<Ball> balls,
            GameManager gameManager)
        {
            var next = new List<Ball>();
            foreach (var parent in balls)
            {
                if (parent == null) continue;
                var v = parent.LinearVelocity;
                var pos = parent.Position;
                if (v.magnitude < 0.01f)
                {
                    next.Add(parent);
                    continue;
                }
                // Tear down parent first so children don't immediately
                // collide with it.
                var rotations = new[] { -SplitAngleRad, 0f, +SplitAngleRad };
                gameManager.DespawnBall(parent);
                foreach (var ang in rotations)
                {
                    var c = Mathf.Cos(ang);
                    var s = Mathf.Sin(ang);
                    var childV = new Vector2(v.x * c - v.y * s, v.x * s + v.y * c);
                    var childPos = pos + new Vector2(c, s) * 0.05f;
                    var child = gameManager.SpawnBall(footballer, childPos);
                    child.Launch(childV);
                    next.Add(child);
                }
            }
            return next;
        }
    }
}
