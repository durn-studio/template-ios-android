import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

// Tutorial overlay — first-time onboarding card.
//
// Shown the first time the player enters /game. Persists a flag in
// AsyncStorage so subsequent visits skip it. Tap "GOT IT" or anywhere
// outside the card to dismiss.
//
// Phase 5a delivers a text-led version (instructions + animated hand
// pointer + "got it" button). Phase 5b's art pass will replace the
// placeholder graphic with an illustrated character + animated demo.

const STORAGE_KEY = "sg_seen_tutorial_v1";

interface Props {
  /** Caller controls visibility — typically `!seenTutorial && firstAttempt`. */
  visible: boolean;
  onDismiss: () => void;
}

/** Returns true if the player has seen the tutorial before, false
 *  on a fresh install / cleared storage. Caller decides whether to
 *  show the overlay. */
export async function getTutorialSeen(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

/** Persist the tutorial-seen flag. Fire-and-forget; UI doesn't
 *  await this. */
export function markTutorialSeen(): void {
  AsyncStorage.setItem(STORAGE_KEY, "1").catch(() => {});
}

export function TutorialOverlay({ visible, onDismiss }: Props) {
  const dragX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    // Loop a slow back-and-forth drag animation on the hand pointer
    // so the player can read what "drag" means at a glance.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dragX, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dragX, {
          toValue: 0,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [visible, dragX]);

  if (!visible) return null;

  const handleDismiss = () => {
    markTutorialSeen();
    onDismiss();
  };

  const translateX = dragX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -90],
  });
  const translateY = dragX.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 35],
  });
  const opacity = dragX.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Pressable style={styles.backdrop} onPress={handleDismiss}>
      {/* Stop propagation so taps on the card itself don't dismiss
          before the player reads it. */}
      <Pressable style={styles.card} onPress={() => {}}>
        <Text style={styles.title}>HOW TO PLAY</Text>

        {/* Demo strip — slingshot anchor on the right, animated
            hand drags away from it on the left, dotted arc traces
            the predicted shot. */}
        <View style={styles.demoStrip}>
          <View style={styles.demoTrack}>
            {/* Trajectory dots — static, just for vibe */}
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.demoDot,
                  {
                    left: 130 - i * 20,
                    top: 18 + i * 4,
                    opacity: 0.7 - i * 0.12,
                  },
                ]}
              />
            ))}
            {/* Slingshot anchor (the ball/footballer rests here) */}
            <View style={styles.demoAnchor} />
            {/* Animated hand pointer dragging away from the anchor */}
            <Animated.View
              style={[
                styles.demoHand,
                {
                  opacity,
                  transform: [{ translateX }, { translateY }],
                },
              ]}
            >
              <Feather name="navigation-2" size={24} color="#fff" />
            </Animated.View>
          </View>
        </View>

        <View style={styles.steps}>
          <Step n="1" text="Drag from anywhere to aim" />
          <Step n="2" text="Release to launch your footballer" />
          <Step n="3" text="Smash the blocks and score the goal" />
        </View>

        <Pressable style={styles.btn} onPress={handleDismiss} hitSlop={8}>
          <Text style={styles.btnText}>GOT IT</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    paddingVertical: 24,
    paddingHorizontal: 22,
    backgroundColor: "#1a2a3a",
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 14,
  },
  demoStrip: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  demoTrack: {
    width: 200,
    height: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  demoDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  demoAnchor: {
    position: "absolute",
    right: 14,
    top: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffd166",
  },
  demoHand: {
    position: "absolute",
    right: 16,
    top: 20,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  steps: {
    width: "100%",
    gap: 10,
    marginBottom: 18,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffd166",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    color: "#0d1b2a",
    fontSize: 12,
    fontWeight: "900",
  },
  stepText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    flex: 1,
  },
  btn: {
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#ffd166",
  },
  btnText: {
    color: "#0d1b2a",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
