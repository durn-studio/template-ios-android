import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { isLocaleCode, type LocaleCode } from "@/constants/i18n";
import { logLevelAchieved, logTutorialComplete } from "@/lib/analytics";
import { submitScore as submitGameCenterScore } from "@/lib/gameCenter";
import { getICloudNumber, setICloudNumber } from "@/lib/icloudKV";
import {
  OVERALL_LEADERBOARD_ID,
  leaderboardIdForWorld,
} from "@/constants/gameCenter";

// Slim GameContext — Slam Goal Phase 1.
//
// The Bubble Masters era of this provider was 1749 lines and held
// daily quests, power-up inventory, cup currency, cosmetic frame
// unlocks, and the Bubble Lab discovery tracker — all merge-game
// concepts. Phase 1 strips those out so the new game can model its
// own progression / inventory / collection systems from scratch in
// Phase 3+ without inheriting merge assumptions.
//
// What survives, because it's gameplay-agnostic platform plumbing:
//   • coin currency (with iCloud cross-device sync)
//   • hearts/lives economy (regen + ad refill cap + unlimited sub)
//   • daily slot rewarded-ad coin claims
//   • per-world high scores + games-played counters
//   • per-world game-state save blobs (untyped — Phase 2-3 will type
//     `GameSave` to the new physics module's snapshot shape)
//   • selected world + locale persistence
//   • leaderboard score submission (per-world + overall)
//   • AppsFlyer analytics events on tutorial/level milestones

// ── High scores ────────────────────────────────────────────────────
export interface HighScore {
  score: number;
  level: number;
  date: string;
}

// ── Daily slot economy ─────────────────────────────────────────────
// Watch a rewarded ad → claim DAILY_SLOT_COINS coins. Up to
// DAILY_SLOT_MAX claims per local calendar day with
// DAILY_SLOT_COOLDOWN_MS between consecutive claims.
export const DAILY_SLOT_MAX = 12;
export const DAILY_SLOT_COINS = 100;
export const DAILY_SLOT_COOLDOWN_MS = 10 * 60 * 1000;

interface DailyState {
  date: string;
  claims: number[];
}

export interface DailyClaimResult {
  ok: boolean;
  reason?: "cooldown" | "exhausted";
  nextAvailableAt: number | null;
  slotsLeft: number;
  coinsAwarded: number;
}

function emptyDaily(): DailyState {
  return { date: new Date().toDateString(), claims: [] };
}

function normalizeDaily(state: DailyState): DailyState {
  const today = new Date().toDateString();
  if (state.date !== today) return emptyDaily();
  return state;
}

// ── Hearts ──────────────────────────────────────────────────────────
export const HEARTS_MAX = 3;
export const HEART_REGEN_MS = 30 * 60 * 1000;
export const AD_REFILL_DAILY_CAP = 3;

export interface HeartsState {
  count: number;
  nextHeartAt: number | null;
  unlimitedUntil: number | null;
  // Monotonic clock anchor — the highest wall-clock ever observed
  // by this device. Prevents setting the device clock backwards
  // from fast-forwarding regen. See `monotonicNow`.
  lastSeenAt: number | null;
  adRefills: { date: string; count: number } | null;
}

const HEARTS_DEFAULT: HeartsState = {
  count: HEARTS_MAX,
  nextHeartAt: null,
  unlimitedUntil: null,
  lastSeenAt: null,
  adRefills: null,
};

export interface HeartsView {
  hearts: number;
  nextHeartIn: number | null;
  unlimited: boolean;
}

function localDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function adRefillsRemaining(state: HeartsState): number {
  const today = localDateKey();
  if (!state.adRefills || state.adRefills.date !== today) {
    return AD_REFILL_DAILY_CAP;
  }
  return Math.max(0, AD_REFILL_DAILY_CAP - state.adRefills.count);
}

function monotonicNow(state: HeartsState, now: number): number {
  return state.lastSeenAt != null && state.lastSeenAt > now
    ? state.lastSeenAt
    : now;
}

export function computeHeartsView(state: HeartsState, now: number): HeartsView {
  const safeNow = monotonicNow(state, now);
  if (state.unlimitedUntil && state.unlimitedUntil > safeNow) {
    return { hearts: HEARTS_MAX, nextHeartIn: null, unlimited: true };
  }
  if (state.count >= HEARTS_MAX || state.nextHeartAt == null) {
    return { hearts: state.count, nextHeartIn: null, unlimited: false };
  }
  const elapsed = safeNow - state.nextHeartAt;
  if (elapsed < 0) {
    return { hearts: state.count, nextHeartIn: -elapsed, unlimited: false };
  }
  const ticks = 1 + Math.floor(elapsed / HEART_REGEN_MS);
  const next = Math.min(state.count + ticks, HEARTS_MAX);
  if (next >= HEARTS_MAX) {
    return { hearts: HEARTS_MAX, nextHeartIn: null, unlimited: false };
  }
  const futureNextAt = state.nextHeartAt + ticks * HEART_REGEN_MS;
  return {
    hearts: next,
    nextHeartIn: futureNextAt - safeNow,
    unlimited: false,
  };
}

function catchUpHearts(state: HeartsState, now: number): HeartsState {
  const safeNow = monotonicNow(state, now);
  const view = computeHeartsView(state, now);
  const lastSeenAt = Math.max(state.lastSeenAt ?? 0, safeNow);
  if (view.unlimited) {
    return lastSeenAt === state.lastSeenAt ? state : { ...state, lastSeenAt };
  }
  if (
    view.hearts === state.count &&
    view.nextHeartIn === null &&
    state.nextHeartAt === null &&
    lastSeenAt === state.lastSeenAt
  ) {
    return state;
  }
  return {
    ...state,
    count: view.hearts,
    nextHeartAt: view.nextHeartIn !== null ? safeNow + view.nextHeartIn : null,
    lastSeenAt,
  };
}

// ── Game save blob ─────────────────────────────────────────────────
// Phase 2-3 will replace `unknown` with the native physics module's
// canonical snapshot shape. Until then, callers serialise/deserialise
// at the boundary.
export type GameSave = unknown;

// ── Per-level stars ────────────────────────────────────────────────
// Maps a levelId (e.g. "world1-level1") to the player's best star
// rating earned (0-3). 0 = cleared with no score above 1-star
// threshold; absent = never cleared. Used for level-select progress
// + the world-unlock gate.
export type StarCount = 0 | 1 | 2 | 3;

// ── Storage keys ────────────────────────────────────────────────────
// Keep the `fc_` prefix even though the project is now Slam Goal —
// renaming would orphan everyone's existing local saves on upgrade.
// New keys (cosmetics, quests, etc.) introduced in later phases can
// use a `sg_` prefix to break cleanly with the migration.
const HIGH_SCORES_V2_KEY = "fc_high_scores_v2";
const GAMES_PLAYED_V2_KEY = "fc_games_played_v2";
const GAME_SAVE_KEY_PREFIX = "fc_game_save_";
const COINS_KEY = "fc_coins";
const COINS_UPDATED_AT_KEY = "fc_coins_updated_at";
const ICLOUD_COINS_KEY = "coins";
const ICLOUD_COINS_UPDATED_AT_KEY = "coinsUpdatedAt";
const AF_TUTORIAL_KEY = "fc_af_tutorial_completion";
const HEARTS_KEY = "fc_hearts_v1";
const DAILY_KEY = "fc_daily_slots";
const WORLD_KEY = "fc_selected_world";
const LOCALE_KEY = "fc_locale";
const LEVEL_STARS_KEY = "sg_level_stars_v1";

interface GameContextType {
  // Scores + games-played per world (worldId → list / count). Empty
  // map until Slam Goal worlds are populated in Phase 4-5.
  highScores: Record<string, HighScore[]>;
  gamesPlayed: Record<string, number>;
  addHighScore: (
    score: number,
    level: number,
    worldId?: string,
  ) => Promise<void>;
  incrementGamesPlayed: (worldId?: string) => Promise<void>;
  getHighScoresFor: (worldId: string) => HighScore[];
  getBestScoreFor: (worldId: string) => number;
  getGamesPlayedFor: (worldId: string) => number;
  getOverallBestScore: () => number;
  getTotalGamesPlayed: () => number;

  // Per-world saved-game flag + serialised blob.
  hasSavedGame: Record<string, boolean>;
  saveGameState: (worldId: string, save: GameSave) => Promise<void>;
  loadGameState: (worldId: string) => Promise<GameSave | null>;
  clearGameState: (worldId: string) => Promise<void>;

  // Currency.
  coins: number;
  addCoins: (amount: number) => Promise<void>;

  // Hearts.
  heartsState: HeartsState;
  consumeHeart: () => boolean;
  grantHearts: (amount: number) => void;
  claimAdHeart: () => boolean;
  grantUnlimitedHearts: (durationMs: number) => void;

  // Daily slot economy.
  daily: DailyState;
  claimDailySlot: () => Promise<DailyClaimResult>;

  // Per-level star tracking. levelStars[levelId] is the player's
  // best 0-3 star rating; absent = never cleared.
  levelStars: Readonly<Record<string, StarCount>>;
  /** Records a clear. Stores the max of the existing and incoming
   *  star count, so retrying a level with fewer stars never
   *  downgrades. Returns the stored value. */
  recordLevelStars: (levelId: string, stars: StarCount) => Promise<StarCount>;
  /** Convenience: highest stars earned on this level (0 if never
   *  cleared). */
  getLevelStars: (levelId: string) => StarCount;

  // Selected world + locale.
  selectedWorldId: string;
  setSelectedWorldId: (id: string) => void;
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
}

const GameContext = createContext<GameContextType | null>(null);

function detectDeviceLocale(): LocaleCode {
  const locales = Localization.getLocales();
  for (const l of locales) {
    const code = l.languageCode?.toLowerCase();
    if (code && isLocaleCode(code)) return code;
  }
  return "en";
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [highScores, setHighScores] = useState<Record<string, HighScore[]>>({});
  const [gamesPlayed, setGamesPlayed] = useState<Record<string, number>>({});
  const [hasSavedGame, setHasSavedGame] = useState<Record<string, boolean>>({});
  const [coins, setCoins] = useState(100);
  const [heartsState, setHeartsState] = useState<HeartsState>(HEARTS_DEFAULT);
  const [daily, setDaily] = useState<DailyState>(() => emptyDaily());
  const [selectedWorldId, setSelectedWorldIdState] = useState("");
  const [locale, setLocaleState] = useState<LocaleCode>(() =>
    detectDeviceLocale(),
  );
  const [levelStars, setLevelStars] = useState<Record<string, StarCount>>({});

  // Fire-and-forget iCloud push on every coin write so other devices
  // pick up the new total. Last-write-wins via timestamp.
  const persistCoinTimestamp = useCallback(async (next: number) => {
    const ts = Date.now();
    await AsyncStorage.setItem(COINS_UPDATED_AT_KEY, JSON.stringify(ts));
    void setICloudNumber(ICLOUD_COINS_KEY, next);
    void setICloudNumber(ICLOUD_COINS_UPDATED_AT_KEY, ts);
  }, []);

  // Foreground re-reconcile with iCloud (multi-device case).
  useEffect(() => {
    const sub = AppState.addEventListener(
      "change",
      async (state: AppStateStatus) => {
        if (state !== "active") return;
        try {
          const [cloudCoinsRaw, cloudTsRaw, localTsJson] = await Promise.all([
            getICloudNumber(ICLOUD_COINS_KEY),
            getICloudNumber(ICLOUD_COINS_UPDATED_AT_KEY),
            AsyncStorage.getItem(COINS_UPDATED_AT_KEY),
          ]);
          if (cloudCoinsRaw == null || cloudTsRaw == null) return;
          const localTs = localTsJson ? Number(JSON.parse(localTsJson)) : 0;
          if (cloudTsRaw > localTs) {
            const nextCoins = Math.max(0, Math.floor(cloudCoinsRaw));
            setCoins(nextCoins);
            await AsyncStorage.setItem(COINS_KEY, JSON.stringify(nextCoins));
            await AsyncStorage.setItem(
              COINS_UPDATED_AT_KEY,
              JSON.stringify(cloudTsRaw),
            );
          }
        } catch {
          // Ignore — next foreground will retry.
        }
      },
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const [
        highScoresJson,
        gamesPlayedJson,
        coinsJson,
        heartsJson,
        dailyJson,
        worldJson,
        localeJson,
        levelStarsJson,
      ] = await Promise.all([
        AsyncStorage.getItem(HIGH_SCORES_V2_KEY),
        AsyncStorage.getItem(GAMES_PLAYED_V2_KEY),
        AsyncStorage.getItem(COINS_KEY),
        AsyncStorage.getItem(HEARTS_KEY),
        AsyncStorage.getItem(DAILY_KEY),
        AsyncStorage.getItem(WORLD_KEY),
        AsyncStorage.getItem(LOCALE_KEY),
        AsyncStorage.getItem(LEVEL_STARS_KEY),
      ]);
      if (highScoresJson) {
        const parsed = JSON.parse(highScoresJson);
        if (parsed && typeof parsed === "object") setHighScores(parsed);
      }
      if (gamesPlayedJson) {
        const parsed = JSON.parse(gamesPlayedJson);
        if (parsed && typeof parsed === "object") setGamesPlayed(parsed);
      }
      if (coinsJson) setCoins(JSON.parse(coinsJson));

      // iCloud coin reconcile on cold start.
      try {
        const [cloudCoinsRaw, cloudTsRaw, localTsJson] = await Promise.all([
          getICloudNumber(ICLOUD_COINS_KEY),
          getICloudNumber(ICLOUD_COINS_UPDATED_AT_KEY),
          AsyncStorage.getItem(COINS_UPDATED_AT_KEY),
        ]);
        const localTs = localTsJson ? Number(JSON.parse(localTsJson)) : 0;
        const cloudTs = cloudTsRaw ?? 0;
        if (cloudCoinsRaw != null && cloudTs > localTs) {
          const cloudCoins = Math.max(0, Math.floor(cloudCoinsRaw));
          setCoins(cloudCoins);
          await AsyncStorage.setItem(COINS_KEY, JSON.stringify(cloudCoins));
          await AsyncStorage.setItem(
            COINS_UPDATED_AT_KEY,
            JSON.stringify(cloudTs),
          );
        } else if (localTs > cloudTs) {
          const localCoins = coinsJson ? Number(JSON.parse(coinsJson)) : 100;
          void setICloudNumber(ICLOUD_COINS_KEY, localCoins);
          void setICloudNumber(ICLOUD_COINS_UPDATED_AT_KEY, localTs);
        }
      } catch {
        // iCloud unavailable.
      }

      if (heartsJson) {
        const parsed = JSON.parse(heartsJson);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.count === "number"
        ) {
          const migrated: HeartsState = {
            count: Math.max(0, Math.min(HEARTS_MAX, parsed.count)),
            nextHeartAt:
              typeof parsed.nextHeartAt === "number" ? parsed.nextHeartAt : null,
            unlimitedUntil:
              typeof parsed.unlimitedUntil === "number"
                ? parsed.unlimitedUntil
                : null,
            lastSeenAt:
              typeof parsed.lastSeenAt === "number"
                ? parsed.lastSeenAt
                : Date.now(),
            adRefills:
              parsed.adRefills &&
              typeof parsed.adRefills === "object" &&
              typeof parsed.adRefills.date === "string" &&
              typeof parsed.adRefills.count === "number"
                ? {
                    date: parsed.adRefills.date,
                    count: Math.max(0, parsed.adRefills.count),
                  }
                : null,
          };
          const caughtUp = catchUpHearts(migrated, Date.now());
          setHeartsState(caughtUp);
          if (caughtUp !== migrated) {
            AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(caughtUp)).catch(
              () => {},
            );
          }
        }
      }

      if (dailyJson) {
        const parsed = JSON.parse(dailyJson);
        if (
          parsed &&
          typeof parsed.date === "string" &&
          Array.isArray(parsed.claims)
        ) {
          setDaily(normalizeDaily(parsed));
        }
      }

      if (worldJson) setSelectedWorldIdState(JSON.parse(worldJson));
      if (levelStarsJson) {
        const parsed = JSON.parse(levelStarsJson);
        if (parsed && typeof parsed === "object") {
          // Validate: keys are strings, values are 0/1/2/3.
          const clean: Record<string, StarCount> = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof k !== "string") continue;
            if (v === 0 || v === 1 || v === 2 || v === 3) {
              clean[k] = v as StarCount;
            }
          }
          setLevelStars(clean);
        }
      }
      if (localeJson) {
        const parsed = JSON.parse(localeJson);
        if (typeof parsed === "string" && isLocaleCode(parsed)) {
          setLocaleState(parsed);
        }
      }

      // Probe disk for persisted save blobs per known world id (the
      // home screen flips PLAY ↔ CONTINUE off `hasSavedGame[worldId]`).
      // With WORLDS empty until Phase 4-5, this loop is a no-op today.
      // It still handles upgrade-from-Bubble-Masters: once Slam Goal
      // ships its own world ids, persisted-save probe runs against
      // those. (Old `fc_game_save_<oldWorldId>` blobs stay on disk
      // untouched; they're orphaned but small.)
    } catch (err) {
      console.warn("[GameContext] loadData error:", err);
    }
  };

  const addCoins = useCallback(
    async (amount: number) => {
      if (amount === 0) return;
      const next = Math.max(0, coins + amount);
      setCoins(next);
      await AsyncStorage.setItem(COINS_KEY, JSON.stringify(next));
      await persistCoinTimestamp(next);
    },
    [coins, persistCoinTimestamp],
  );

  const addHighScore = useCallback(
    async (score: number, level: number, worldId?: string) => {
      const wid = worldId || selectedWorldId || "default";
      const entry: HighScore = {
        score,
        level,
        date: new Date().toISOString(),
      };
      const updated = { ...highScores };
      const list = (updated[wid] ?? []).slice();
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      updated[wid] = list.slice(0, 10);
      setHighScores(updated);
      await AsyncStorage.setItem(
        HIGH_SCORES_V2_KEY,
        JSON.stringify(updated),
      );
      // Submit per-world + overall to platform leaderboards. Wires
      // are in place even though the WORLDS array is empty in
      // Phase 1; the score will land under the right Game Center /
      // Play Games leaderboard once IDs are configured.
      const ids: string[] = [];
      const perWorldId = leaderboardIdForWorld(wid);
      if (perWorldId) ids.push(perWorldId);
      if (OVERALL_LEADERBOARD_ID) ids.push(OVERALL_LEADERBOARD_ID);
      if (ids.length) await submitGameCenterScore(score, ids);
      void logLevelAchieved(level);
    },
    [highScores, selectedWorldId],
  );

  const incrementGamesPlayed = useCallback(
    async (worldId?: string) => {
      const wid = worldId || selectedWorldId || "default";
      const updated = { ...gamesPlayed };
      updated[wid] = (updated[wid] ?? 0) + 1;
      setGamesPlayed(updated);
      await AsyncStorage.setItem(
        GAMES_PLAYED_V2_KEY,
        JSON.stringify(updated),
      );
      // Fire AppsFlyer's tutorial-complete event exactly once per
      // install — primary retention signal for ad campaigns.
      try {
        const flagged = await AsyncStorage.getItem(AF_TUTORIAL_KEY);
        if (!flagged) {
          void logTutorialComplete();
          await AsyncStorage.setItem(AF_TUTORIAL_KEY, "1");
        }
      } catch {
        // Ignore — non-fatal.
      }
    },
    [gamesPlayed, selectedWorldId],
  );

  const getHighScoresFor = useCallback(
    (worldId: string) => highScores[worldId] ?? [],
    [highScores],
  );
  const getBestScoreFor = useCallback(
    (worldId: string) => (highScores[worldId]?.[0]?.score ?? 0),
    [highScores],
  );
  const getGamesPlayedFor = useCallback(
    (worldId: string) => gamesPlayed[worldId] ?? 0,
    [gamesPlayed],
  );
  const getOverallBestScore = useCallback(() => {
    let best = 0;
    for (const list of Object.values(highScores)) {
      const top = list[0]?.score ?? 0;
      if (top > best) best = top;
    }
    return best;
  }, [highScores]);
  const getTotalGamesPlayed = useCallback(() => {
    let total = 0;
    for (const v of Object.values(gamesPlayed)) total += v;
    return total;
  }, [gamesPlayed]);

  const saveGameState = useCallback(
    async (worldId: string, save: GameSave) => {
      const key = `${GAME_SAVE_KEY_PREFIX}${worldId}`;
      await AsyncStorage.setItem(key, JSON.stringify(save));
      setHasSavedGame((prev) =>
        prev[worldId] ? prev : { ...prev, [worldId]: true },
      );
    },
    [],
  );

  const loadGameState = useCallback(
    async (worldId: string): Promise<GameSave | null> => {
      const key = `${GAME_SAVE_KEY_PREFIX}${worldId}`;
      const json = await AsyncStorage.getItem(key);
      if (!json) return null;
      try {
        return JSON.parse(json) as GameSave;
      } catch {
        return null;
      }
    },
    [],
  );

  const clearGameState = useCallback(async (worldId: string) => {
    const key = `${GAME_SAVE_KEY_PREFIX}${worldId}`;
    await AsyncStorage.removeItem(key);
    setHasSavedGame((prev) => {
      if (!prev[worldId]) return prev;
      const next = { ...prev };
      delete next[worldId];
      return next;
    });
  }, []);

  const consumeHeart = useCallback((): boolean => {
    const now = Date.now();
    const caught = catchUpHearts(heartsState, now);
    if (caught.unlimitedUntil && caught.unlimitedUntil > now) {
      // Unlimited active — no-op decrement. Keep lastSeenAt fresh.
      if (caught !== heartsState) {
        setHeartsState(caught);
        AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(caught)).catch(() => {});
      }
      return true;
    }
    if (caught.count <= 0) {
      if (caught !== heartsState) {
        setHeartsState(caught);
        AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(caught)).catch(() => {});
      }
      return false;
    }
    const nextCount = caught.count - 1;
    const next: HeartsState = {
      ...caught,
      count: nextCount,
      nextHeartAt:
        nextCount < HEARTS_MAX
          ? caught.nextHeartAt ?? now + HEART_REGEN_MS
          : null,
    };
    setHeartsState(next);
    AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(next)).catch(() => {});
    return true;
  }, [heartsState]);

  const grantHearts = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      const now = Date.now();
      const caught = catchUpHearts(heartsState, now);
      const next: HeartsState = {
        ...caught,
        count: caught.count + amount,
        // No regen timer needed when we're at/above MAX.
        nextHeartAt: caught.count + amount >= HEARTS_MAX ? null : caught.nextHeartAt,
      };
      setHeartsState(next);
      AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(next)).catch(() => {});
    },
    [heartsState],
  );

  const claimAdHeart = useCallback((): boolean => {
    const today = localDateKey();
    const now = Date.now();
    const caught = catchUpHearts(heartsState, now);
    const remaining =
      !caught.adRefills || caught.adRefills.date !== today
        ? AD_REFILL_DAILY_CAP
        : Math.max(0, AD_REFILL_DAILY_CAP - caught.adRefills.count);
    if (remaining <= 0) return false;
    const newCount = caught.count + 1;
    const next: HeartsState = {
      ...caught,
      count: newCount,
      nextHeartAt: newCount >= HEARTS_MAX ? null : caught.nextHeartAt,
      adRefills: {
        date: today,
        count:
          (caught.adRefills?.date === today ? caught.adRefills.count : 0) + 1,
      },
    };
    setHeartsState(next);
    AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(next)).catch(() => {});
    return true;
  }, [heartsState]);

  const grantUnlimitedHearts = useCallback(
    (durationMs: number) => {
      if (durationMs <= 0) return;
      const now = Date.now();
      const caught = catchUpHearts(heartsState, now);
      const next: HeartsState = {
        ...caught,
        unlimitedUntil: now + durationMs,
      };
      setHeartsState(next);
      AsyncStorage.setItem(HEARTS_KEY, JSON.stringify(next)).catch(() => {});
    },
    [heartsState],
  );

  const claimDailySlot = useCallback(async (): Promise<DailyClaimResult> => {
    const now = Date.now();
    const live = normalizeDaily(daily);
    const lastAt = live.claims[live.claims.length - 1] ?? 0;
    const slotsLeftBefore = DAILY_SLOT_MAX - live.claims.length;
    if (slotsLeftBefore <= 0) {
      return {
        ok: false,
        reason: "exhausted",
        nextAvailableAt: null,
        slotsLeft: 0,
        coinsAwarded: 0,
      };
    }
    if (lastAt && now - lastAt < DAILY_SLOT_COOLDOWN_MS) {
      return {
        ok: false,
        reason: "cooldown",
        nextAvailableAt: lastAt + DAILY_SLOT_COOLDOWN_MS,
        slotsLeft: slotsLeftBefore,
        coinsAwarded: 0,
      };
    }
    const next: DailyState = { ...live, claims: [...live.claims, now] };
    setDaily(next);
    await AsyncStorage.setItem(DAILY_KEY, JSON.stringify(next));
    await addCoins(DAILY_SLOT_COINS);
    const slotsLeft = DAILY_SLOT_MAX - next.claims.length;
    return {
      ok: true,
      nextAvailableAt:
        slotsLeft > 0 ? now + DAILY_SLOT_COOLDOWN_MS : null,
      slotsLeft,
      coinsAwarded: DAILY_SLOT_COINS,
    };
  }, [daily, addCoins]);

  const setSelectedWorldId = useCallback((id: string) => {
    setSelectedWorldIdState(id);
    AsyncStorage.setItem(WORLD_KEY, JSON.stringify(id)).catch(() => {});
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    AsyncStorage.setItem(LOCALE_KEY, JSON.stringify(code)).catch(() => {});
  }, []);

  const recordLevelStars = useCallback(
    async (levelId: string, stars: StarCount): Promise<StarCount> => {
      const existing = levelStars[levelId] ?? 0;
      // Only upgrade — retrying with fewer stars must not downgrade
      // a prior best.
      if (stars <= existing) return existing;
      const next = { ...levelStars, [levelId]: stars };
      setLevelStars(next);
      try {
        await AsyncStorage.setItem(LEVEL_STARS_KEY, JSON.stringify(next));
      } catch {
        // Best-effort persist; in-memory state is already updated.
      }
      return stars;
    },
    [levelStars],
  );

  const getLevelStars = useCallback(
    (levelId: string): StarCount => levelStars[levelId] ?? 0,
    [levelStars],
  );

  const value: GameContextType = {
    highScores,
    gamesPlayed,
    addHighScore,
    incrementGamesPlayed,
    getHighScoresFor,
    getBestScoreFor,
    getGamesPlayedFor,
    getOverallBestScore,
    getTotalGamesPlayed,
    hasSavedGame,
    saveGameState,
    loadGameState,
    clearGameState,
    coins,
    addCoins,
    heartsState,
    consumeHeart,
    grantHearts,
    claimAdHeart,
    grantUnlimitedHearts,
    daily,
    claimDailySlot,
    levelStars,
    recordLevelStars,
    getLevelStars,
    selectedWorldId,
    setSelectedWorldId,
    locale,
    setLocale,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
