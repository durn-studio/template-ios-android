import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TrophyIcon } from "@/components/TrophyIcon";
import { OVERALL_LEADERBOARD_ID } from "@/constants/gameCenter";
import { MAX_CONTENT_WIDTH } from "@/constants/layout";
import { getWorldImages } from "@/constants/playerImages";
import { WORLDS } from "@/constants/worlds";
import type { HighScore } from "@/context/GameContext";
import { useGame } from "@/context/GameContext";
import { useColors } from "@/hooks/useColors";
import { useStrings } from "@/hooks/useStrings";

// Sentinel for the pill/active-filter state — distinct from any
// real worldId so `activeWorldId === OVERALL_VIEW` is an unambiguous
// mode switch.
const OVERALL_VIEW = "__overall__";

interface OverallRun extends HighScore {
  worldId: string;
}
import {
  isGameCenterReady,
  presentLeaderboard,
} from "@/lib/gameCenter";

// Top-3 medal palette + glow tint pairs. Index 0 = gold, 1 = silver,
// 2 = bronze. The `glow` colour goes into a soft drop shadow on the
// rank chip and the row gradient.
const PODIUM = [
  { medal: "#FFD700", glow: "rgba(255,215,0,0.35)", deep: "#7C2D12" },
  { medal: "#E5E7EB", glow: "rgba(229,231,235,0.30)", deep: "#374151" },
  { medal: "#CD7F32", glow: "rgba(205,127,50,0.30)", deep: "#7C2D12" },
];

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    highScores,
    selectedWorldId,
    getBestScoreFor,
    getOverallBestScore,
    getTotalGamesPlayed,
  } = useGame();
  const { s, t } = useStrings();

  const topPad = Platform.OS === "web" ? insets.top + 67 : insets.top + 8;
  const bottomPad = Platform.OS === "web" ? insets.bottom + 34 : insets.bottom + 8;

  // Filter state: either OVERALL_VIEW (cross-theme rollup) or a
  // specific worldId. Defaults to whatever the home screen last
  // pointed at, so the leaderboard matches the context the player
  // was just in. The "Overall" pill is always shown first; per-theme
  // pills are only shown for themes that have at least one recorded
  // score (keeps the row clean instead of cluttered with zero-run
  // themes).
  const [activeWorldId, setActiveWorldId] = useState<string>(selectedWorldId);
  const isOverallView = activeWorldId === OVERALL_VIEW;

  const pillWorlds = useMemo(
    () => WORLDS.filter((w) => (highScores[w.id]?.length ?? 0) > 0),
    [highScores],
  );

  // For the overall view: aggregate every recorded run across all
  // themes, tag with worldId so each row can render the right
  // theme flag, sort by score desc, cap at 10 so the list doesn't
  // scroll past the GC card. Only recomputed when highScores
  // changes — cheap either way.
  const overallRuns = useMemo<OverallRun[]>(() => {
    const all: OverallRun[] = [];
    for (const w of WORLDS) {
      for (const hs of highScores[w.id] ?? []) {
        all.push({ ...hs, worldId: w.id });
      }
    }
    return all.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [highScores]);

  // In theme view, activeScores is the plain per-theme list; in
  // overall view it's the sorted cross-theme aggregate. Both are
  // assignable to a union array for the render loop below.
  const themeScores = highScores[activeWorldId] ?? [];
  const activeWorld = isOverallView
    ? undefined
    : WORLDS.find((w) => w.id === activeWorldId);
  const activeImages = useMemo(
    () => (isOverallView ? [] : getWorldImages(activeWorldId)),
    [isOverallView, activeWorldId],
  );
  const bestScore = isOverallView
    ? getOverallBestScore()
    : themeScores[0]?.score ?? 0;
  const runCount = isOverallView
    ? getTotalGamesPlayed()
    : themeScores.length;
  const rows: (HighScore | OverallRun)[] = isOverallView
    ? overallRuns
    : themeScores;
  const hasRows = rows.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.gameBackground }]}>
      <View style={styles.frame}>
        <View
          style={[
            styles.header,
            { paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 12 },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              { backgroundColor: "rgba(255,255,255,0.06)", borderColor: colors.border },
            ]}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={18} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTrophyWrap}>
              <LinearGradient
                colors={["#FFD700", "#F59E0B"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <TrophyIcon size={16} />
            </View>
            <View>
              <Text style={styles.eyebrow}>HALL OF FAME</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {s.leaderboard.title}
              </Text>
            </View>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPad + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Theme filter pills — the leading pill is always
              "Overall" (cross-theme rollup); subsequent pills are
              per-theme and only appear for themes with at least one
              recorded score. Active pill is tinted with the theme's
              primary colour (or gold for Overall). Horizontally
              scrollable so a 20-theme catalogue still fits. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            <Pressable
              onPress={() => setActiveWorldId(OVERALL_VIEW)}
              style={[
                styles.pill,
                {
                  backgroundColor: isOverallView
                    ? "rgba(255,215,0,0.22)"
                    : "rgba(255,255,255,0.04)",
                  borderColor: isOverallView
                    ? "#FFD700"
                    : "rgba(255,255,255,0.1)",
                },
              ]}
            >
              <Feather name="award" size={13} color="#FFD700" />
              <Text
                style={[
                  styles.pillName,
                  isOverallView && { color: "#fff" },
                ]}
              >
                {s.leaderboard.overallPill}
              </Text>
              <Text style={styles.pillScore}>
                {getOverallBestScore().toLocaleString()}
              </Text>
            </Pressable>
            {pillWorlds.map((w) => {
              const active = w.id === activeWorldId;
              return (
                <Pressable
                  key={w.id}
                  onPress={() => setActiveWorldId(w.id)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active
                        ? w.primaryColor + "33"
                        : "rgba(255,255,255,0.04)",
                      borderColor: active
                        ? w.primaryColor
                        : "rgba(255,255,255,0.1)",
                    },
                  ]}
                >
                  <Text style={styles.pillFlag}>{w.flag}</Text>
                  <Text
                    style={[
                      styles.pillName,
                      active && { color: "#fff" },
                    ]}
                  >
                    {w.name}
                  </Text>
                  <Text style={styles.pillScore}>
                    {getBestScoreFor(w.id).toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Hero card — two flavours:
              • Overall view: gold gradient, trophy icon, "OVERALL
                BEST" label, big number = max score across all themes,
                run-count chip shows total games across all themes.
                No tier strip (it'd be meaningless cross-theme).
              • Theme view: theme-coloured gradient + flag + "PERSONAL
                BEST" + 12-character tier strip (unchanged).
              Skipped entirely when there are zero recorded runs —
              the empty state further down takes over. */}
          {hasRows && isOverallView ? (
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#F59E0B", "#B45309"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroEyebrow}>
                    {s.leaderboard.overallBest}
                  </Text>
                  <View style={styles.heroOverallRow}>
                    <Feather name="award" size={16} color="#FFD700" />
                    <Text style={styles.heroName} numberOfLines={1}>
                      {s.leaderboard.title}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroRunsChip}>
                  <Feather name="repeat" size={11} color="#fff" />
                  <Text style={styles.heroRunsTxt}>
                    {t(s.leaderboard.runs, { n: runCount })}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroScore}>
                {bestScore.toLocaleString()}
              </Text>
            </View>
          ) : hasRows && activeWorld ? (
            <View style={styles.heroCard}>
              <LinearGradient
                colors={[activeWorld.primaryColor, activeWorld.secondaryColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.4)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroEyebrow}>
                    {s.leaderboard.personalBest}
                  </Text>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {activeWorld.flag}  {activeWorld.name}
                  </Text>
                </View>
                <View style={styles.heroRunsChip}>
                  <Feather name="repeat" size={11} color="#fff" />
                  <Text style={styles.heroRunsTxt}>
                    {t(s.leaderboard.runs, { n: runCount })}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroScore}>
                {bestScore.toLocaleString()}
              </Text>
              {/* Tier strip — 12 characters this theme can merge into. */}
              <View style={styles.heroTierRow}>
                {activeImages.slice(0, 12).map((img, i) => {
                  const ring = activeWorld.players?.[i]?.ringColor;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.heroTierDot,
                        {
                          borderColor: ring
                            ? ring + "AA"
                            : "rgba(255,255,255,0.4)",
                        },
                      ]}
                    >
                      <Image
                        source={img}
                        style={styles.heroTierImg}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Game Center handoff card — gradient + chevron so it reads
              as a CTA, not just a status banner. Hidden on Android /
              Expo Go where the native module isn't linked. */}
          {isGameCenterReady() ? (
            <Pressable
              onPress={() => {
                // v1.0 only has the `overall` board registered in App
                // Store Connect — point at it directly so the sheet
                // shows real data instead of an empty per-theme view.
                void presentLeaderboard(OVERALL_LEADERBOARD_ID);
              }}
              style={({ pressed }) => [
                styles.gcCard,
                pressed ? { opacity: 0.85 } : null,
              ]}
            >
              <LinearGradient
                colors={["rgba(255,215,0,0.18)", "rgba(124,58,237,0.10)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.gcIconWrap}>
                <LinearGradient
                  colors={["#FFD700", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Feather name="award" size={18} color="#7C2D12" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gcTitle}>{s.leaderboard.syncTitle}</Text>
                <Text style={styles.gcBody}>{s.leaderboard.syncBody}</Text>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color="rgba(255,255,255,0.7)"
              />
            </Pressable>
          ) : null}

          {/* "Your runs" header + list. Empty state takes over the
              whole panel when there's nothing to show. In overall
              view each row gets a trailing theme-flag chip (since
              every row can belong to a different theme); in theme
              view the trailing slot is the per-level character
              avatar as before. */}
          {!hasRows ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Feather name="award" size={42} color="#FFD700" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {s.leaderboard.emptyTitle}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {activeWorld
                  ? `${s.leaderboard.emptyText}  (${activeWorld.name})`
                  : s.leaderboard.emptyText}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{s.leaderboard.yourRuns}</Text>
              <View style={styles.list}>
                {rows.map((item, index) => {
                  const podium = index < 3 ? PODIUM[index] : null;
                  // Only overall rows carry a worldId. Look up the
                  // theme so we can render its flag in the trailing
                  // slot.
                  const rowWorldId = isOverallView
                    ? (item as OverallRun).worldId
                    : activeWorldId;
                  const rowWorld = WORLDS.find((w) => w.id === rowWorldId);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.row,
                        {
                          borderColor: podium
                            ? podium.medal + "55"
                            : "rgba(255,255,255,0.08)",
                        },
                      ]}
                    >
                      {podium ? (
                        <LinearGradient
                          colors={[podium.medal + "1F", "transparent"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      ) : null}
                      <View
                        style={[
                          styles.rankChip,
                          podium
                            ? {
                                backgroundColor: podium.medal,
                                shadowColor: podium.medal,
                                shadowOpacity: 0.7,
                                shadowRadius: 10,
                                shadowOffset: { width: 0, height: 0 },
                                elevation: 4,
                              }
                            : { backgroundColor: "rgba(255,255,255,0.08)" },
                        ]}
                      >
                        {podium ? (
                          <Feather
                            name="award"
                            size={16}
                            color={podium.deep}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.rankNum,
                              { color: "rgba(255,255,255,0.7)" },
                            ]}
                          >
                            {index + 1}
                          </Text>
                        )}
                      </View>

                      <View style={styles.info}>
                        <Text
                          style={[
                            styles.scoreText,
                            {
                              color: podium
                                ? podium.medal
                                : colors.foreground,
                            },
                          ]}
                        >
                          {item.score.toLocaleString()}
                        </Text>
                        <Text
                          style={[
                            styles.meta,
                            { color: colors.mutedForeground },
                          ]}
                          numberOfLines={1}
                        >
                          {isOverallView && rowWorld
                            ? `${rowWorld.flag} ${rowWorld.name} · ${item.date}`
                            : t(s.leaderboard.meta, {
                                level: item.level,
                                date: item.date,
                              })}
                        </Text>
                      </View>

                      {/* Trailing slot — in theme view, the
                          tier-image character the player reached
                          (gated on level > 1 because addHighScore
                          currently hardcodes level=1). In overall
                          view, a compact flag chip identifying
                          which theme this run belongs to. */}
                      {isOverallView && rowWorld ? (
                        <View style={styles.rowFlagChip}>
                          <Text style={styles.rowFlagTxt}>
                            {rowWorld.flag}
                          </Text>
                        </View>
                      ) : item.level > 1 &&
                        activeImages[item.level - 1] ? (
                        (() => {
                          const ring =
                            activeWorld?.players?.[item.level - 1]?.ringColor;
                          return (
                            <View
                              style={[
                                styles.rowTier,
                                {
                                  borderColor: ring
                                    ? ring + "AA"
                                    : "rgba(255,255,255,0.3)",
                                },
                              ]}
                            >
                              <Image
                                source={activeImages[item.level - 1]}
                                style={styles.rowTierImg}
                                resizeMode="contain"
                              />
                            </View>
                          );
                        })()
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Centred column — keeps the leaderboard readable on iPad
  // portrait instead of stretching the rows edge-to-edge.
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTrophyWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  eyebrow: {
    color: "rgba(255,215,0,0.85)",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    marginBottom: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },

  scrollContent: {
    paddingHorizontal: 0,
  },

  // ── Theme filter pills ──────────────────────────────────────
  pillsRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillFlag: {
    fontSize: 14,
  },
  pillName: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 0.3,
  },
  pillScore: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#FDE68A",
    letterSpacing: 0.3,
    marginLeft: 4,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.15)",
  },

  // ── Personal-best hero ──────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 22,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    minHeight: 170,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  heroEyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "rgba(255,255,255,0.85)",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    marginTop: 4,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroOverallRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  heroRunsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 999,
  },
  heroRunsTxt: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  heroScore: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginTop: 6,
    lineHeight: 60,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  heroTierRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    flexWrap: "wrap",
  },
  heroTierDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroTierImg: {
    width: 18,
    height: 18,
  },

  // ── Game Center card ────────────────────────────────────────
  gcCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    overflow: "hidden",
  },
  gcIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  gcTitle: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  gcBody: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  // ── List ────────────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 3,
    paddingHorizontal: 18,
    marginTop: 8,
    marginBottom: 10,
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  rankChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  info: { flex: 1 },
  scoreText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  meta: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  rowTier: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTierImg: {
    width: 28,
    height: 28,
  },
  // Trailing flag chip for the overall-view run rows — shows which
  // theme the run belongs to. Compact square so it doesn't crowd
  // the score column.
  rowFlagChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  rowFlagTxt: {
    fontSize: 16,
  },

  // ── Empty state ─────────────────────────────────────────────
  empty: {
    paddingVertical: 36,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,215,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
