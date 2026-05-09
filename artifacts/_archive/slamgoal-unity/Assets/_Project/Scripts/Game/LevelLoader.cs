using System.Collections.Generic;
using SlamGoal.Data;
using UnityEngine;

namespace SlamGoal.Game
{
    /// <summary>
    /// Loads a level JSON from Resources/Levels and instantiates its
    /// blocks + goal sensor + walls into the scene. The slingshot
    /// anchor + camera framing happen in GameManager off the returned
    /// LevelData.
    ///
    /// Material lookup: each MaterialSO is loaded from Resources/Materials/
    /// by id at runtime. SO files are configured in the editor.
    /// </summary>
    public class LevelLoader : MonoBehaviour
    {
        [Header("Prefab references")]
        [Tooltip("Block prefab — Rigidbody2D + BoxCollider2D + " +
                 "MaterialBlock + SpriteRenderer. Used for box-shaped " +
                 "blocks. Loaded from Resources/Prefabs/Block.")]
        [SerializeField] private MaterialBlock blockBoxPrefab;

        [Tooltip("Block prefab — Rigidbody2D + CircleCollider2D + " +
                 "MaterialBlock + SpriteRenderer. Used for circle " +
                 "blocks (most enemies / boss).")]
        [SerializeField] private MaterialBlock blockCirclePrefab;

        [Tooltip("Goal trigger prefab — BoxCollider2D as trigger + " +
                 "GoalTrigger script.")]
        [SerializeField] private GoalTrigger goalPrefab;

        public List<MaterialBlock> SpawnedBlocks { get; } = new();
        public GoalTrigger Goal { get; private set; }

        public LevelData LoadFromResources(string levelId)
        {
            var asset = Resources.Load<TextAsset>($"Levels/{levelId}");
            if (asset == null)
            {
                Debug.LogError($"[LevelLoader] level not found: {levelId}");
                return null;
            }
            var data = JsonUtility.FromJson<LevelData>(asset.text);
            if (data == null)
            {
                Debug.LogError($"[LevelLoader] failed to parse {levelId}");
                return null;
            }
            return data;
        }

        public void PopulateScene(LevelData data, GameManager manager)
        {
            // Walls — top, left, right, floor. Right wall is split
            // around the goal opening so the ball can enter.
            CreateEdgeWalls(data);
            // Blocks.
            foreach (var spec in data.blocks)
            {
                SpawnBlock(spec, manager);
            }
            // Goal sensor.
            var goalCenter = new Vector2(
                data.goal.x + data.goal.width / 2f,
                -(data.goal.y + data.goal.height / 2f));
            Goal = Instantiate(goalPrefab, goalCenter, Quaternion.identity, transform);
            var goalCol = Goal.GetComponent<BoxCollider2D>();
            goalCol.size = new Vector2(data.goal.width, data.goal.height);
            Goal.Initialize(manager);
        }

        public void Clear()
        {
            foreach (var b in SpawnedBlocks)
            {
                if (b != null) Destroy(b.gameObject);
            }
            SpawnedBlocks.Clear();
            if (Goal != null) Destroy(Goal.gameObject);
            // Walls are children of this loader; nuke them all.
            for (int i = transform.childCount - 1; i >= 0; i--)
            {
                Destroy(transform.GetChild(i).gameObject);
            }
        }

        // ── private helpers ──────────────────────────────────────

        private void CreateEdgeWalls(LevelData data)
        {
            // Unity 2D conventional: y goes UP. Level JSON uses y-down
            // (matching planck). We negate y when placing colliders.
            //
            // Box2D-style edges: thin static box colliders along each
            // wall. EdgeCollider2D is also an option but BoxCollider2D
            // is simpler to size.
            var w = data.width;
            var h = data.height;

            // Floor
            CreateWall(new Vector2(w / 2f, -h - 0.05f), new Vector2(w, 0.1f));
            // Ceiling
            CreateWall(new Vector2(w / 2f, 0.05f), new Vector2(w, 0.1f));
            // Left
            CreateWall(new Vector2(-0.05f, -h / 2f), new Vector2(0.1f, h));

            // Right wall — split around the goal opening if the goal is
            // flush against the right edge.
            var goalAtRight = data.goal.x + data.goal.width >= w - 0.01f;
            if (goalAtRight)
            {
                // Top piece: from y=0 down to goal top.
                var topH = data.goal.y;
                if (topH > 0.01f)
                    CreateWall(
                        new Vector2(w + 0.05f, -topH / 2f),
                        new Vector2(0.1f, topH));
                // Bottom piece: from goal bottom to floor.
                var botStart = data.goal.y + data.goal.height;
                var botH = h - botStart;
                if (botH > 0.01f)
                    CreateWall(
                        new Vector2(w + 0.05f, -(botStart + botH / 2f)),
                        new Vector2(0.1f, botH));
            }
            else
            {
                CreateWall(new Vector2(w + 0.05f, -h / 2f), new Vector2(0.1f, h));
            }
        }

        private void CreateWall(Vector2 center, Vector2 size)
        {
            var go = new GameObject("Wall");
            go.transform.SetParent(transform, false);
            go.transform.position = center;
            var rb = go.AddComponent<Rigidbody2D>();
            rb.bodyType = RigidbodyType2D.Static;
            var col = go.AddComponent<BoxCollider2D>();
            col.size = size;
        }

        private void SpawnBlock(BlockSpec spec, GameManager manager)
        {
            var mat = manager.LookupMaterial(spec.material);
            if (mat == null)
            {
                Debug.LogWarning($"[LevelLoader] unknown material {spec.material}; skipping block");
                return;
            }
            // y-flip: level JSON is y-down, Unity is y-up.
            var pos = new Vector2(spec.position.x, -spec.position.y);

            MaterialBlock block;
            if (spec.IsBox)
            {
                block = Instantiate(blockBoxPrefab, pos, Quaternion.AngleAxis(-spec.angle * Mathf.Rad2Deg, Vector3.forward), transform);
                var box = block.GetComponent<BoxCollider2D>();
                box.size = new Vector2(spec.halfW * 2f, spec.halfH * 2f);
                var sr = block.GetComponent<SpriteRenderer>();
                if (sr != null) sr.size = box.size;
            }
            else
            {
                block = Instantiate(blockCirclePrefab, pos, Quaternion.identity, transform);
                var circle = block.GetComponent<CircleCollider2D>();
                circle.radius = spec.radius;
                var sr = block.GetComponent<SpriteRenderer>();
                if (sr != null)
                {
                    sr.transform.localScale = new Vector3(spec.radius * 2f, spec.radius * 2f, 1f);
                }
            }

            // Body type per level data (default dynamic, "static" =
            // immovable architecture).
            var rb = block.GetComponent<Rigidbody2D>();
            rb.bodyType = spec.type == "static"
                ? RigidbodyType2D.Static
                : (spec.type == "kinematic" ? RigidbodyType2D.Kinematic : RigidbodyType2D.Dynamic);
            // Auto-mass MUST be set before density on the collider
            // (Unity warns otherwise: "Density cannot be set on the
            // collider unless it is attached to a dynamic rigid-body
            // that is using auto-mass.").
            rb.useAutoMass = rb.bodyType == RigidbodyType2D.Dynamic;

            // Visuals.
            var renderer = block.GetComponent<SpriteRenderer>();
            if (renderer != null)
            {
                renderer.color = mat.color;
                if (mat.sprite != null) renderer.sprite = mat.sprite;
            }
            // Configure damage tracking.
            block.Initialize(mat, manager);
            // Set physics material from the SO. Density only applies
            // to dynamic + auto-mass bodies; skip for static / kinematic.
            var anyCol = block.GetComponent<Collider2D>();
            if (anyCol != null)
            {
                anyCol.sharedMaterial = new PhysicsMaterial2D($"{mat.id}_phys")
                {
                    bounciness = mat.restitution,
                    friction = mat.friction,
                };
                if (rb.bodyType == RigidbodyType2D.Dynamic && rb.useAutoMass)
                {
                    anyCol.density = mat.density;
                }
            }
            SpawnedBlocks.Add(block);
        }
    }
}
