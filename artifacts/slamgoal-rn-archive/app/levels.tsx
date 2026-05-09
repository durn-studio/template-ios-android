import { router, Stack } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/context/GameContext";
import {
  BOSS_LEVEL_IDS,
  LEVEL_IDS,
  getLevelData,
} from "@/lib/levelLoader";

// Level select — Street Pitch. Phase 5a ships 12 levels (11
// progression + 1 boss); the layout here scales to ~30 if we add
// more in Phase 5b without rework.
//
// Lock rule: level N is unlocked iff level N-1 has been cleared at
// least once (≥ 1 star). Level 1 is always unlocked. The boss
// level uses the same rule — clear level 11 with ≥ 1 star to
// unlock the captain.
//
// World 2-6 unlock per design doc §5.4 needs 60 % of World 1 stars
// (24 / 36) — Phase 6 wires that gate when more worlds exist; for
// now there's only Street Pitch so the cumulative-stars line in
// the header is informational.

const COLS = 3;

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const { getLevelStars } = useGame();

  const tiles = useMemo(() => {
    return LEVEL_IDS.map((id, idx) => {
      const data = getLevelData(id);
      const stars = getLevelStars(id);
      // Unlock: first level always; subsequent only if predecessor
      // has been cleared.
      const isFirst = idx === 0;
      const prevId = idx > 0 ? LEVEL_IDS[idx - 1] : null;
      const prevStars = prevId ? getLevelStars(prevId) : 0;
      const unlocked = isFirst || prevStars > 0;
      const isBoss = (BOSS_LEVEL_IDS as readonly string[]).includes(id);
      return {
        id,
        index: idx + 1,
        name: data?.name ?? "Unknown",
        stars,
        unlocked,
        isBoss,
      };
    });
  }, [getLevelStars]);

  const totalStars = tiles.reduce((sum, t) => sum + t.stars, 0);
  const maxStars = tiles.length * 3;
  const cleared = tiles.filter((t) => t.stars > 0).length;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

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
        <View style={styles.titleColumn}>
          <Text style={styles.world}>WORLD 1</Text>
          <Text style={styles.title}>STREET PITCH</Text>
        </View>
        <View style={styles.spacer} />
        <View style={styles.starsPill}>
          <Feather name="star" size={14} color="#ffd166" />
          <Text style={styles.starsText}>
            {totalStars} / {maxStars}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingLeft: insets.left + 16,
            paddingRight: insets.right + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Text style={styles.subline}>
          {cleared} of {tiles.length} cleared
        </Text>
        <View style={styles.grid}>
          {tiles.map((t) => (
            <LevelTile
              key={t.id}
              index={t.index}
              name={t.name}
              stars={t.stars}
              unlocked={t.unlocked}
              isBoss={t.isBoss}
              onPress={() => {
                if (!t.unlocked) return;
                router.push({
                  pathname: "/game",
                  params: { levelId: t.id },
                });
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

interface TileProps {
  index: number;
  name: string;
  stars: 0 | 1 | 2 | 3;
  unlocked: boolean;
  isBoss: boolean;
  onPress: () => void;
}

function LevelTile({ index, name, stars, unlocked, isBoss, onPress }: TileProps) {
  return (
    <Pressable
      style={[
        styles.tile,
        isBoss && styles.tileBoss,
        !unlocked && styles.tileLocked,
      ]}
      onPress={onPress}
      disabled={!unlocked}
    >
      <View style={styles.tileHeader}>
        <Text style={[styles.tileIndex, isBoss && styles.tileIndexBoss]}>
          {isBoss ? "BOSS" : index}
        </Text>
        {!unlocked && (
          <Feather
            name="lock"
            size={14}
            color="rgba(255,255,255,0.5)"
          />
        )}
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.tileStars}>
        {[1, 2, 3].map((n) => (
          <Feather
            key={n}
            name="star"
            size={14}
            color={
              stars >= n
                ? "#ffd166"
                : unlocked
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.08)"
            }
          />
        ))}
      </View>
    </Pressable>
  );
}

const TILE_GAP = 10;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0d1b2a",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleColumn: {
    alignItems: "flex-start",
  },
  world: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  spacer: { flex: 1 },
  starsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
  },
  starsText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  scroll: {
    paddingTop: 8,
  },
  subline: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TILE_GAP,
  },
  tile: {
    width: `${(100 - (COLS - 1) * 1.2) / COLS}%`,
    minWidth: 130,
    aspectRatio: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "space-between",
  },
  tileBoss: {
    backgroundColor: "rgba(127,0,0,0.25)",
    borderColor: "#7f0000",
  },
  tileLocked: {
    opacity: 0.45,
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileIndex: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tileIndexBoss: {
    color: "#ff8888",
    fontSize: 12,
  },
  tileName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  tileStars: {
    flexDirection: "row",
    gap: 3,
    marginTop: 6,
  },
});
