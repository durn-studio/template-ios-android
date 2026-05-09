import { router, Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhysicsCanvas } from "@/components/PhysicsCanvas";
import {
  addBody,
  addBoundary,
  createWorld,
  type World,
} from "@/lib/physics";

// Slam Goal — Phase 2 physics smoke test.
//
// Verifies the planck.js + Skia integration on a real device. Drops
// N random circles into a bounded world; PhysicsCanvas runs the
// step loop and renders. Tap "Reset" to repopulate; "Drop 25" adds
// a fresh batch on top of the existing pile to stress-test more
// bodies. Watch the FPS overlay — anything <55 on a mid-range phone
// at 100 bodies is the cue to switch to reanimated SharedValue +
// Skia worklet props (per the comments in PhysicsCanvas.tsx).
//
// This route is dev-only. Once Phase 3 lands the real game.tsx,
// this file stays as a perf canary — handy whenever we suspect the
// new physics work has regressed framerate.

const PIXELS_PER_METER = 60;

// Color palette — high-contrast circles so it's easy to eyeball
// motion. No semantic meaning yet; sprites land in Phase 4-5.
const COLORS = [
  "#ff6b6b",
  "#ffd166",
  "#06d6a0",
  "#4cc9f0",
  "#bb88ff",
  "#ff9f1c",
];

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}

function populate(world: World, count: number, widthM: number): void {
  for (let i = 0; i < count; i++) {
    addBody(world, {
      shape: "circle",
      radius: 0.25 + Math.random() * 0.25,
      position: {
        x: 0.5 + Math.random() * (widthM - 1),
        y: 0.5 + Math.random() * 2,
      },
      density: 1,
      friction: 0.3,
      restitution: 0.55,
      color: pick(COLORS),
    });
  }
}

export default function SmokeTestScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();

  const canvasW = winW - insets.left - insets.right;
  const canvasH = winH - insets.top - insets.bottom - 56; // top bar height
  const widthM = canvasW / PIXELS_PER_METER;
  const heightM = canvasH / PIXELS_PER_METER;

  const [worldKey, setWorldKey] = useState(0);
  const [count, setCount] = useState(50);

  const world = useMemo<World>(() => {
    const w = createWorld({ gravity: { x: 0, y: 12 } });
    addBoundary(w, 0, 0, widthM, heightM);
    populate(w, count, widthM);
    return w;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldKey, widthM, heightM]);

  const handleReset = useCallback(() => {
    setCount(50);
    setWorldKey((k) => k + 1);
  }, []);

  const handleAdd = useCallback(() => {
    populate(world, 25, widthM);
    setCount((c) => c + 25);
  }, [world, widthM]);

  // Recreate world if the device rotates / safe area changes
  // dimensions enough that the cached widthM/heightM is stale. This
  // is rare with landscape lock but covers split-screen on iPad.
  useEffect(() => {
    setWorldKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.round(canvasW), Math.round(canvasH)]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: "Physics Smoke Test", headerShown: false }} />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            paddingLeft: insets.left + 12,
            paddingRight: insets.right + 12,
          },
        ]}
      >
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Physics Test</Text>
        <View style={styles.spacer} />
        <Pressable style={styles.btn} onPress={handleAdd} hitSlop={8}>
          <Text style={styles.btnText}>+25</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={handleReset} hitSlop={8}>
          <Text style={styles.btnText}>Reset</Text>
        </Pressable>
      </View>

      <View style={[styles.canvasWrap, { paddingLeft: insets.left, paddingRight: insets.right }]}>
        <PhysicsCanvas
          world={world}
          pixelsPerMeter={PIXELS_PER_METER}
          width={canvasW}
          height={canvasH}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0d1b2a",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  spacer: { flex: 1 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  btnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  canvasWrap: {
    flex: 1,
  },
});
