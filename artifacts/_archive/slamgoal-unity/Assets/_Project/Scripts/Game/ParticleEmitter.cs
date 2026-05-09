using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Spawns a burst of debris particles at a world position with a
    /// supplied tint. Wraps a Unity ParticleSystem; the prefab itself
    /// is configured in the editor (or via DefaultBurstConfig if no
    /// prefab is referenced). Each call emits a self-cleaning burst.
    /// </summary>
    public class ParticleEmitter : MonoBehaviour
    {
        [SerializeField] private ParticleSystem burstPrefab;

        public void Burst(Vector3 worldPos, Color tint, int count = 6)
        {
            ParticleSystem ps;
            if (burstPrefab != null)
            {
                ps = Instantiate(burstPrefab, worldPos, Quaternion.identity, transform);
            }
            else
            {
                // Build a minimal default burst at runtime so the system
                // works before art lands. ParticleSystem auto-destroys
                // via the StopAction below.
                var go = new GameObject("DebrisBurst");
                go.transform.SetParent(transform, false);
                go.transform.position = worldPos;
                ps = go.AddComponent<ParticleSystem>();
                ConfigureDefault(ps, count);
            }

            // Stop before editing main module — Unity warns if you
            // change duration / loop while a system is "playing"
            // (which is the default state after AddComponent).
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);

            var main = ps.main;
            main.startColor = tint;

            ps.Play();
            ps.Emit(count);

            // Auto-destroy after the longest particle expires. Use a
            // generous fixed timeout instead of reading
            // main.startLifetime which can vary per-particle.
            Destroy(ps.gameObject, 2f);
        }

        private static void ConfigureDefault(ParticleSystem ps, int count)
        {
            // Always stop the system before mutating main settings; a
            // freshly-AddComponent'd particle system starts playing
            // immediately and Unity will warn if duration / loop /
            // simulationSpace change while it's playing.
            ps.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);

            var main = ps.main;
            main.duration = 1f;
            main.loop = false;
            main.startLifetime = new ParticleSystem.MinMaxCurve(0.4f, 0.9f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(2f, 6f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.06f, 0.14f);
            main.startColor = Color.white;
            main.gravityModifier = 0.6f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.stopAction = ParticleSystemStopAction.Destroy;
            main.maxParticles = Mathf.Max(8, count * 3);
            main.playOnAwake = false;

            var emission = ps.emission;
            emission.enabled = false; // explicit Emit() calls only

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.05f;

            // Default-material chain — Sprites/Default is the obvious
            // pick but isn't guaranteed in every render-pipeline
            // configuration. Fall through alternatives so we never
            // ship a magenta-shader-not-found material.
            var renderer = ps.GetComponent<ParticleSystemRenderer>();
            if (renderer != null)
            {
                renderer.renderMode = ParticleSystemRenderMode.Billboard;
                var shader = Shader.Find("Sprites/Default")
                    ?? Shader.Find("Unlit/Color")
                    ?? Shader.Find("Standard");
                if (shader != null)
                {
                    renderer.sharedMaterial = new Material(shader);
                }
            }
        }
    }
}
