import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  authenticatePlayer,
  isGameCenterReady,
  presentLeaderboard,
  submitScore,
} from "@/lib/gameCenter";

// Demo screen for the cross-platform leaderboard bridge. On iOS it
// drives `expo-game-center`; on Android it drives `expo-play-games-services`.
// Both bridges are no-ops in Expo Go, so this screen is safe to open
// during development.
//
// Replace `DEMO_LEADERBOARD_ID` with one of your real IDs from
// `constants/gameCenter.ts` once you've set up the leaderboards in
// App Store Connect / Play Games Console.
const DEMO_LEADERBOARD_ID = "REPLACE_WITH_LEADERBOARD_ID";

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [available, setAvailable] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [lastSubmit, setLastSubmit] = useState<string | null>(null);

  useEffect(() => {
    setAvailable(isGameCenterReady());
    void authenticatePlayer().then((p) => setAuthed(p.authenticated));
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable onPress={() => router.back()} hitSlop={16}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>Leaderboard demo</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Native bridge</Text>
        <Text style={styles.value}>
          {available ? "available" : "unavailable (Expo Go / web)"}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Authenticated</Text>
        <Text style={styles.value}>{authed ? "yes" : "no"}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last submit</Text>
        <Text style={styles.value}>{lastSubmit ?? "—"}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={async () => {
          const score = Math.floor(Math.random() * 10_000);
          await submitScore(score, [DEMO_LEADERBOARD_ID]);
          setLastSubmit(`${score} → ${DEMO_LEADERBOARD_ID}`);
        }}
      >
        <Text style={styles.buttonText}>Submit random score</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => presentLeaderboard(DEMO_LEADERBOARD_ID)}
      >
        <Text style={styles.buttonText}>Open native leaderboard UI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b1220",
    paddingHorizontal: 24,
    gap: 12,
  },
  back: {
    color: "#94a3b8",
    fontSize: 16,
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomColor: "#1e293b",
    borderBottomWidth: 1,
  },
  label: {
    color: "#94a3b8",
    fontSize: 14,
  },
  value: {
    color: "#fff",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
