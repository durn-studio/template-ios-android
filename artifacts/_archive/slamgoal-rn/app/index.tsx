import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CoinIcon } from "@/components/CoinIcon";
import { GameSettingsSheet } from "@/components/GameSettingsSheet";
import { HomeBackground } from "@/components/HomeBackground";
import { Logo } from "@/components/Logo";
import { TopUpSheet } from "@/components/TopUpSheet";
import { TrophyIcon } from "@/components/TrophyIcon";
import { computeHeartsView, useGame } from "@/context/GameContext";
import { useStrings } from "@/hooks/useStrings";

// Slam Goal home — Phase 1 placeholder.
//
// The Bubble Masters home was 1562 lines: world picker, daily-slot
// reward grid, daily quests card, in-progress saves, top-up sheet,
// PowerUp shop, ExploreWorlds card, settings sheet, language picker,
// and a leaderboard mini. Phase 1 strips this back to:
//   • Top bar — coins (tap to top up), hearts, settings, leaderboard
//   • Centre — logo + "in development" placeholder
//
// Phase 3+ replaces the centre block with the slingshot launcher /
// world map / level select. The top bar shape carries forward.

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { s } = useStrings();
  const { coins, heartsState } = useGame();

  // 1 Hz tick for the hearts countdown — cheap and isolated.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const heartsView = useMemo(
    () => computeHeartsView(heartsState, now),
    [heartsState, now],
  );

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topUpKind, setTopUpKind] = useState<"coins" | "hearts" | null>(null);

  return (
    <View style={styles.root}>
      <HomeBackground />

      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 8,
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
          },
        ]}
      >
        <Pressable
          style={styles.coinPill}
          onPress={() => setTopUpKind("coins")}
          hitSlop={8}
        >
          <CoinIcon size={20} />
          <Text style={styles.coinText}>{coins.toLocaleString()}</Text>
          <Feather name="plus-circle" size={16} color="#fff" />
        </Pressable>

        <Pressable
          style={styles.heartPill}
          onPress={() => setTopUpKind("hearts")}
          hitSlop={8}
        >
          <Feather
            name="heart"
            size={18}
            color={heartsView.unlimited ? "#ffd166" : "#ff6b6b"}
          />
          <Text style={styles.heartText}>
            {heartsView.unlimited ? "∞" : heartsView.hearts}
          </Text>
        </Pressable>

        <View style={styles.spacer} />

        <Pressable
          style={styles.iconBtn}
          onPress={() => router.push("/leaderboard")}
          hitSlop={8}
          accessibilityLabel={s.leaderboard.title}
        >
          <TrophyIcon size={22} />
        </Pressable>

        <Pressable
          style={styles.iconBtn}
          onPress={() => setSettingsOpen(true)}
          hitSlop={8}
          accessibilityLabel={s.settings.title}
        >
          <Feather name="settings" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.centre}>
        <Logo size={140} />
        <Text style={styles.title}>SLAM GOAL</Text>
        <Text style={styles.subtitle}>Phase 5 · World 1 ready</Text>

        <Pressable
          style={styles.playBtn}
          onPress={() => router.push("/levels")}
          hitSlop={8}
        >
          <Feather name="play" size={18} color="#0d1b2a" />
          <Text style={styles.playBtnText}>PLAY</Text>
        </Pressable>

        <Pressable
          style={styles.physicsBtn}
          onPress={() => router.push("/smoketest")}
          hitSlop={8}
        >
          <Feather name="zap" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.physicsBtnText}>Physics test</Text>
        </Pressable>
      </View>

      <GameSettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <TopUpSheet
        visible={topUpKind !== null}
        kind={topUpKind ?? "coins"}
        onClose={() => setTopUpKind(null)}
      />
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
  coinPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
  },
  coinText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  heartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
  },
  heartText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  spacer: { flex: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 4,
    marginTop: 12,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    marginTop: 4,
    letterSpacing: 1,
  },
  note: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginTop: 24,
    textAlign: "center",
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: "#ffd166",
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  playBtnText: {
    color: "#0d1b2a",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 4,
  },
  physicsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginTop: 24,
  },
  physicsBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
