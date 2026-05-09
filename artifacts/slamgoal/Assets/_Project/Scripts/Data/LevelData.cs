using System;
using System.Collections.Generic;
using UnityEngine;

namespace SlamGoal.Data
{
    /// <summary>
    /// JSON-deserializable level shape — mirrors the React-Native
    /// era's lib/levelLoader.ts schema so the level JSON files port
    /// across engines without rewrites. Loaded via JsonUtility from
    /// Resources/Levels/&lt;id&gt;.json at runtime.
    /// </summary>
    [Serializable]
    public class LevelData
    {
        public string id;
        public string worldId;
        public string name;
        public float width;
        public float height;
        public Vec2 slingshot;
        public Rect goal;
        public StarThresholds stars;
        public int shotsAllowed = 3;
        public List<BlockSpec> blocks = new();
    }

    [Serializable]
    public class Vec2
    {
        public float x;
        public float y;

        public Vector2 ToUnity() => new Vector2(x, y);
    }

    [Serializable]
    public class Rect
    {
        public float x;
        public float y;
        public float width;
        public float height;
    }

    [Serializable]
    public class StarThresholds
    {
        public int one;
        public int two;
        public int three;

        public int StarsForScore(int score)
        {
            if (score >= three) return 3;
            if (score >= two) return 2;
            if (score >= one) return 1;
            return 0;
        }
    }

    [Serializable]
    public class BlockSpec
    {
        /// <summary>"box" or "circle".</summary>
        public string shape = "box";

        /// <summary>Material id (matches MaterialSO.id).</summary>
        public string material = "wood";

        public Vec2 position = new();

        // box-only
        public float halfW;
        public float halfH;
        public float angle;

        // circle-only
        public float radius;

        /// <summary>"dynamic" / "static" / "kinematic". Defaults to dynamic.</summary>
        public string type = "dynamic";

        public bool IsBox => shape == "box";
        public bool IsCircle => shape == "circle";
    }
}
