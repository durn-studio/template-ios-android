import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, View } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

// ── 4 placed wallpaper bubbles ──────────────────────────────────────────────
//
// Coordinates are 0..1 fractions of the screen so the layout adapts to any
// device size. Each entry has its own animation periods + phase offset, so
// the four bubbles breathe and bob completely out of sync — gives the
// background life without ever feeling synchronized or busy.

interface PlacedSpec {
  x: number;
  y: number;
  size: number;
  phase: number;        // ms delay before this bubble's breath cycle begins
  bobAmplitude: number; // px the bubble drifts up/down around its anchor
  breathMs: number;     // full inhale + exhale cycle
  bobMs: number;        // full up + down cycle
  ringOpacity: number;  // gradient stroke alpha 0..1
}

const PLACED: PlacedSpec[] = [
  { x: 0.82, y: 0.07, size: 160, phase: 0,    bobAmplitude: 12, breathMs: 5200, bobMs: 7400, ringOpacity: 0.32 },
  { x: 0.12, y: 0.78, size: 120, phase: 1500, bobAmplitude: 14, breathMs: 6100, bobMs: 8200, ringOpacity: 0.28 },
  { x: 0.90, y: 0.55, size: 70,  phase: 800,  bobAmplitude: 9,  breathMs: 4800, bobMs: 6500, ringOpacity: 0.36 },
  { x: 0.08, y: 0.32, size: 56,  phase: 2200, bobAmplitude: 8,  breathMs: 5600, bobMs: 7000, ringOpacity: 0.34 },
];

function PlacedBubble({ spec }: { spec: PlacedSpec }) {
  const breath = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(spec.phase),
        Animated.timing(breath, {
          toValue: 1,
          duration: spec.breathMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: spec.breathMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: spec.bobMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: spec.bobMs / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breatheLoop.start();
    bobLoop.start();
    return () => {
      breatheLoop.stop();
      bobLoop.stop();
    };
  }, [breath, bob, spec]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });
  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [-spec.bobAmplitude, spec.bobAmplitude],
  });
  const ringWidth = Math.max(2, spec.size * 0.045);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: spec.x * SW - spec.size / 2,
        top: spec.y * SH - spec.size / 2,
        width: spec.size,
        height: spec.size,
        transform: [{ translateY }, { scale }],
        opacity: spec.ringOpacity,
      }}
    >
      <LinearGradient
        colors={["#22D3EE", "#6366F1", "#A855F7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: spec.size / 2,
          padding: ringWidth,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: (spec.size - ringWidth * 2) / 2,
            backgroundColor: "rgba(10,16,30,0.55)",
          }}
        />
      </LinearGradient>
    </Animated.View>
  );
}

// ── Auto-merge demo cycle ───────────────────────────────────────────────────
//
// Every ~10 seconds: two small ghost bubbles fade in to either side of the
// hero band, drift toward each other, flash, and disappear. Mimics the
// game mechanic without text or tutorial.

const MERGE_BAND_Y = 0.4;          // vertical anchor (fraction of screen)
const MERGE_BUBBLE_SIZE = 64;
const MERGE_TRAVEL = 80;           // px each bubble travels toward center
const MERGE_DELAY_MS = 10_000;     // wait between cycles
const MERGE_DRIFT_MS = 2200;
const MERGE_FADE_MS = 600;

function AutoMergeDemo() {
  const leftX = useRef(new Animated.Value(-MERGE_TRAVEL)).current;
  const rightX = useRef(new Animated.Value(MERGE_TRAVEL)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    const runCycle = () => {
      if (cancelled) return;
      // Reset before each cycle so the bubbles always start at the
      // outermost position, fully transparent.
      leftX.setValue(-MERGE_TRAVEL);
      rightX.setValue(MERGE_TRAVEL);
      flash.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(MERGE_DELAY_MS),
        // Fade in
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: MERGE_FADE_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Drift toward midpoint
        Animated.parallel([
          Animated.timing(leftX, {
            toValue: 0,
            duration: MERGE_DRIFT_MS,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rightX, {
            toValue: 0,
            duration: MERGE_DRIFT_MS,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Flash + fade out at the convergence point
        Animated.parallel([
          Animated.timing(flash, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 480,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(flash, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start(() => runCycle());
    };
    runCycle();
    return () => {
      cancelled = true;
    };
  }, [leftX, rightX, opacity, flash]);

  const flashScale = flash.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] });
  const ringWidth = Math.max(2, MERGE_BUBBLE_SIZE * 0.045);
  const centerX = SW / 2;
  const centerY = MERGE_BAND_Y * SH;

  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      {/* Left ghost bubble */}
      <Animated.View
        style={{
          position: "absolute",
          left: centerX - MERGE_BUBBLE_SIZE / 2,
          top: centerY - MERGE_BUBBLE_SIZE / 2,
          width: MERGE_BUBBLE_SIZE,
          height: MERGE_BUBBLE_SIZE,
          opacity,
          transform: [{ translateX: leftX }],
        }}
      >
        <LinearGradient
          colors={["#22D3EE", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: MERGE_BUBBLE_SIZE / 2,
            padding: ringWidth,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: (MERGE_BUBBLE_SIZE - ringWidth * 2) / 2,
              backgroundColor: "rgba(10,16,30,0.55)",
            }}
          />
        </LinearGradient>
      </Animated.View>

      {/* Right ghost bubble */}
      <Animated.View
        style={{
          position: "absolute",
          left: centerX - MERGE_BUBBLE_SIZE / 2,
          top: centerY - MERGE_BUBBLE_SIZE / 2,
          width: MERGE_BUBBLE_SIZE,
          height: MERGE_BUBBLE_SIZE,
          opacity,
          transform: [{ translateX: rightX }],
        }}
      >
        <LinearGradient
          colors={["#A855F7", "#22D3EE"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: MERGE_BUBBLE_SIZE / 2,
            padding: ringWidth,
          }}
        >
          <View
            style={{
              flex: 1,
              borderRadius: (MERGE_BUBBLE_SIZE - ringWidth * 2) / 2,
              backgroundColor: "rgba(10,16,30,0.55)",
            }}
          />
        </LinearGradient>
      </Animated.View>

      {/* Convergence flash */}
      <Animated.View
        style={{
          position: "absolute",
          left: centerX - MERGE_BUBBLE_SIZE / 2,
          top: centerY - MERGE_BUBBLE_SIZE / 2,
          width: MERGE_BUBBLE_SIZE,
          height: MERGE_BUBBLE_SIZE,
          borderRadius: MERGE_BUBBLE_SIZE / 2,
          backgroundColor: "rgba(255,255,255,0.45)",
          opacity: flash,
          transform: [{ scale: flashScale }],
        }}
      />
    </View>
  );
}

// ── Public component ────────────────────────────────────────────────────────
//
// Drop this absolutely behind the home screen content (after any ImageBackground
// or base gradient). All children are pointerEvents="none" so taps pass through
// to whatever sits on top.

export function HomeBackground() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
      {PLACED.map((spec, i) => (
        <PlacedBubble key={i} spec={spec} />
      ))}
      <AutoMergeDemo />
    </View>
  );
}
