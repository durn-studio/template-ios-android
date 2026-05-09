import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

// End-of-level results screen.
//
// Phase 3 — minimal: 3 stars (filled / hollow), score number, retry
// + next-level + back-to-home buttons. Phase 4 will add the
// per-line score breakdown (destruction + knockouts + goal bonus +
// combo bonus) per the design doc §2.3, plus the "+ Manager XP"
// reward popper for meta-progression.

export type ResultStars = 0 | 1 | 2 | 3;

interface Props {
  visible: boolean;
  cleared: boolean;
  score: number;
  stars: ResultStars;
  /** Whether there's a next level to advance to. The home screen
   *  passes false on the last level so the next-level button is
   *  hidden. */
  hasNext: boolean;
  onRetry: () => void;
  onNext?: () => void;
  onHome: () => void;
}

export function ResultsScreen({
  visible,
  cleared,
  score,
  stars,
  hasNext,
  onRetry,
  onNext,
  onHome,
}: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.title}>{cleared ? "GOAL!" : "MISSED"}</Text>

        <View style={styles.starsRow}>
          {[1, 2, 3].map((n) => (
            <Feather
              key={n}
              name={stars >= n ? "star" : "star"}
              size={48}
              color={stars >= n ? "#ffd166" : "rgba(255,255,255,0.18)"}
              style={{ marginHorizontal: 6 }}
            />
          ))}
        </View>

        <Text style={styles.scoreLabel}>SCORE</Text>
        <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>

        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onHome}>
            <Feather name="home" size={18} color="#fff" />
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onRetry}>
            <Feather name="rotate-ccw" size={18} color="#fff" />
            <Text style={styles.btnText}>Retry</Text>
          </Pressable>
          {cleared && hasNext && onNext && (
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onNext}>
              <Text style={[styles.btnText, styles.btnTextDark]}>Next</Text>
              <Feather name="arrow-right" size={18} color="#0d1b2a" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "70%",
    maxWidth: 480,
    paddingVertical: 32,
    paddingHorizontal: 28,
    backgroundColor: "#1a2a3a",
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: 24,
  },
  scoreLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  scoreValue: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "900",
    marginBottom: 28,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
  },
  btnPrimary: {
    backgroundColor: "#ffd166",
  },
  btnSecondary: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  btnTextDark: {
    color: "#0d1b2a",
  },
});
