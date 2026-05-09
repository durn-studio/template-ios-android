import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";

type Route = "/smoketest" | "/leaderboard";

const MENU: Array<{ label: string; route: Route; subtitle: string }> = [
  {
    label: "Physics smoketest",
    route: "/smoketest",
    subtitle: "planck.js + Skia bouncing bodies, FPS overlay",
  },
  {
    label: "Leaderboard",
    route: "/leaderboard",
    subtitle: "Game Center (iOS) / Play Games (Android) bridge",
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <View style={styles.header}>
        <Logo size={120} />
        <Text style={styles.title}>Expo template</Text>
        <Text style={styles.subtitle}>
          Replace this screen with your app. SDK plumbing (AdMob,
          RevenueCat, AppsFlyer, Game Center, Play Games, iCloud KV)
          is wired in `lib/` and `context/`.
        </Text>
      </View>
      <View style={styles.menu}>
        {MENU.map((item) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route)}
            style={({ pressed }) => [
              styles.tile,
              pressed && styles.tilePressed,
            ]}
          >
            <Text style={styles.tileLabel}>{item.label}</Text>
            <Text style={styles.tileSubtitle}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0b1220",
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginTop: 16,
  },
  subtitle: {
    color: "#94a3b8",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  menu: {
    gap: 12,
  },
  tile: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 16,
  },
  tilePressed: {
    opacity: 0.7,
  },
  tileLabel: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  tileSubtitle: {
    color: "#94a3b8",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 4,
  },
});
