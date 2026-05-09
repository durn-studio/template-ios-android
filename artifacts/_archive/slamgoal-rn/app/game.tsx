import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Vec2 } from "planck";

import { FootballerPicker } from "@/components/FootballerPicker";
import { PhysicsCanvas, type Particle } from "@/components/PhysicsCanvas";
import { ResultsScreen } from "@/components/ResultsScreen";
import { Slingshot } from "@/components/Slingshot";
import {
  SceneBackdrop,
  SlingshotRig,
  GoalPost,
} from "@/components/sprites";
import {
  TutorialOverlay,
  getTutorialSeen,
} from "@/components/TutorialOverlay";
import {
  DEFAULT_FOOTBALLER_ID,
  getFootballerById,
  isActiveAbility,
  launchVelocityMultiplier,
} from "@/constants/footballers";
import { getMaterialById } from "@/constants/materials";
import { applyAbility } from "@/lib/abilities";
import {
  LEVEL_IDS,
  getLevelData,
  loadLevel,
  starsForScore,
  type LevelData,
} from "@/lib/levelLoader";
import {
  addBody,
  createWorld,
  type Body,
  type World,
} from "@/lib/physics";
import { useGame } from "@/context/GameContext";

// Slam Goal — Phase 4 game screen.
//
// Phase 3 shipped the slingshot loop with one footballer; Phase 4
// adds the full Street Pitch roster, ability triggers, combo
// multiplier, and per-ball rest tracking so split-shot can spawn
// three balls without breaking shot-end detection.
//
// What's intentionally still MVP and gets richer in Phase 4b/5:
//   • No environmental hazards (puddles, clotheslines).
//   • No weather / wind.
//   • No fragments / particles on destruction; bodies just vanish.
//   • Score readout doesn't animate / flash on combos.
//   • Audio / SFX still on the merge-game catalogue (Phase 4b).

const PIXELS_PER_METER_FALLBACK = 60;
const GRAVITY_Y = 12;
const REST_VELOCITY_THRESHOLD = 0.4;
const REST_FRAMES_REQUIRED = 30;
const GOAL_BONUS = 1000;
const IMPACT_DAMAGE_SCALE = 0.5;

/** Combo window — destruction events within this window of each
 *  other escalate the multiplier. */
const COMBO_WINDOW_MS = 500;

interface BlockState {
  materialId: string;
  hp: number;
}

function comboMultiplier(count: number): number {
  if (count >= 5) return 2;
  if (count >= 3) return 1.5;
  return 1;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ levelId?: string }>();
  const levelId = params.levelId ?? LEVEL_IDS[0];
  const insets = useSafeAreaInsets();
  const { addHighScore, recordLevelStars } = useGame();
  const [canvasLayout, setCanvasLayout] = useState<{ w: number; h: number } | null>(null);

  const levelData = useMemo<LevelData | null>(
    () => getLevelData(levelId),
    [levelId],
  );

  const [attempt, setAttempt] = useState(0);
  const [selectedFootballerId, setSelectedFootballerId] = useState(
    DEFAULT_FOOTBALLER_ID,
  );

  const footballer = useMemo(
    () => getFootballerById(selectedFootballerId),
    [selectedFootballerId],
  );

  // ── World + level setup ────────────────────────────────────────
  const setup = useMemo(() => {
    if (!levelData) return null;
    const world = createWorld({ gravity: { x: 0, y: GRAVITY_Y } });
    const loaded = loadLevel(world, levelData);
    const goalBody = addBody(world, {
      shape: "box",
      type: "static",
      position: {
        x: levelData.goal.x + levelData.goal.width / 2,
        y: levelData.goal.y + levelData.goal.height / 2,
      },
      halfW: levelData.goal.width / 2,
      halfH: levelData.goal.height / 2,
      density: 0,
      friction: 0,
      restitution: 0,
      color: "transparent",
      id: "goal_sensor",
    });
    for (let f = goalBody.getFixtureList(); f; f = f.getNext()) {
      f.setSensor(true);
    }
    return { world, loaded, goalBody };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelData, attempt]);

  const blockStateRef = useRef<Map<Body, BlockState>>(new Map());
  /** Damage tracking is gated until the first launch. Levels carry
   *  dynamic bodies that settle under gravity on load — angled
   *  planks, stacked towers, enemies sitting on platforms — and the
   *  settle collisions would otherwise rack up free destruction
   *  points before the player has touched the screen. Flipped to
   *  true the first time handleLaunch fires; stays true for the
   *  rest of the attempt. */
  const damageEnabledRef = useRef(false);
  /** Active footballer bodies. Set rather than ref because split
   *  shot fans the parent into 3 children mid-flight. */
  const ballsRef = useRef<Set<Body>>(new Set());
  /** JS-managed particle list, mutated in place by handleAfterStep.
   *  PhysicsCanvas reads + steps each frame. */
  const particlesRef = useRef<Particle[]>([]);
  /** Animated values for screen shake. Triggered on destruction +
   *  goal events. */
  const shakeX = useRef(new Animated.Value(0)).current;
  const shakeY = useRef(new Animated.Value(0)).current;
  /** Per-ball rest-frame counter — the shot ends when EVERY active
   *  ball has been at rest for REST_FRAMES_REQUIRED consecutive
   *  frames. */
  const restFramesRef = useRef<Map<Body, number>>(new Map());
  const destructionQueueRef = useRef<Set<Body>>(new Set());
  const destructionTimestampsRef = useRef<number[]>([]);
  const goalReachedRef = useRef(false);
  const submittedRef = useRef(false);

  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(
    levelData?.shotsAllowed ?? 0,
  );
  /** Mirrored from ballsRef.size so the UI can disable the picker
   *  / enable the ability button reactively. */
  const [ballsInFlight, setBallsInFlight] = useState(0);
  const [abilityUsed, setAbilityUsed] = useState(false);
  const [results, setResults] = useState<{
    cleared: boolean;
    score: number;
    stars: 0 | 1 | 2 | 3;
  } | null>(null);
  // Tutorial overlay — show on first /game visit per install. The
  // initial state is `null` so we don't flash the overlay before
  // checking AsyncStorage; effect below resolves to true / false.
  const [showTutorial, setShowTutorial] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getTutorialSeen().then((seen) => {
      if (!cancelled) setShowTutorial(!seen);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reset state on new attempt / level change.
  useEffect(() => {
    if (!levelData || !setup) return;
    blockStateRef.current = new Map(setup.loaded.blockBodies);
    ballsRef.current = new Set();
    restFramesRef.current = new Map();
    destructionQueueRef.current = new Set();
    destructionTimestampsRef.current = [];
    goalReachedRef.current = false;
    submittedRef.current = false;
    damageEnabledRef.current = false;
    particlesRef.current = [];
    setScore(0);
    setShotsLeft(levelData.shotsAllowed);
    setBallsInFlight(0);
    setAbilityUsed(false);
    setResults(null);
  }, [levelData, setup]);

  /** Animated camera shake — N quick translations on a sequence,
   *  scaled by `magnitude` (8 px typical, 16 for goal). */
  const triggerShake = useCallback(
    (magnitude = 8) => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shakeX, {
            toValue: magnitude,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: -magnitude * 0.7,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: magnitude * 0.4,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeX, {
            toValue: 0,
            duration: 40,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(shakeY, {
            toValue: -magnitude * 0.5,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeY, {
            toValue: magnitude * 0.6,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeY, {
            toValue: -magnitude * 0.3,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(shakeY, {
            toValue: 0,
            duration: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    },
    [shakeX, shakeY],
  );

  // ── Contact listener: damage + goal detection ──────────────────
  useEffect(() => {
    if (!setup) return;
    const { world, goalBody } = setup;

    const onPostSolve = (contact: any, impulse: any) => {
      // Pre-launch settle: ignore all damage. Levels often carry
      // angled / stacked dynamic bodies that fall under gravity on
      // load, and those settle collisions would otherwise destroy
      // blocks (and award points) before the player has aimed.
      if (!damageEnabledRef.current) return;
      const fa = contact.getFixtureA();
      const fb = contact.getFixtureB();
      const ba = fa.getBody();
      const bb = fb.getBody();
      const arr = impulse.normalImpulses ?? [];
      let total = 0;
      for (let i = 0; i < arr.length; i++) total += Math.abs(arr[i] ?? 0);
      if (total <= 0) return;
      const damage = total * IMPACT_DAMAGE_SCALE;
      const map = blockStateRef.current;
      for (const body of [ba, bb]) {
        const state = map.get(body);
        if (!state) continue;
        state.hp -= damage;
        if (state.hp <= 0 && !destructionQueueRef.current.has(body)) {
          destructionQueueRef.current.add(body);
        }
      }
    };

    const onBeginContact = (contact: any) => {
      const fa = contact.getFixtureA();
      const fb = contact.getFixtureB();
      const ba = fa.getBody();
      const bb = fb.getBody();
      const isGoal = (b: Body) => b === goalBody;
      const isBall = (b: Body) => ballsRef.current.has(b);
      if ((isGoal(ba) && isBall(bb)) || (isGoal(bb) && isBall(ba))) {
        goalReachedRef.current = true;
      }
    };

    world.on("post-solve", onPostSolve);
    world.on("begin-contact", onBeginContact);
    return () => {
      // planck doesn't expose `off` cleanly; rebinding is fine since
      // `setup` is recreated per attempt and the old world is GC'd.
    };
  }, [setup]);

  // ── Per-frame work ─────────────────────────────────────────────
  const handleAfterStep = useCallback(
    (world: World) => {
      // Drain destruction queue. Each destruction is timestamped so
      // we can detect combos (≥3 destroys within COMBO_WINDOW_MS
      // gets a multiplier on the points awarded).
      const queue = destructionQueueRef.current;
      const map = blockStateRef.current;
      let scoredThisFrame = 0;
      if (queue.size > 0) {
        const now = performance.now();
        const times = destructionTimestampsRef.current;
        let biggestImpact = 0;
        queue.forEach((body) => {
          const state = map.get(body);
          if (state) {
            const mat = getMaterialById(state.materialId);
            if (mat) {
              times.push(now);
              // Prune timestamps outside the combo window.
              while (times.length > 0 && now - times[0] > COMBO_WINDOW_MS) {
                times.shift();
              }
              const mult = comboMultiplier(times.length);
              const points = Math.round(mat.scoreOnDestroy * mult);
              scoredThisFrame += points;
              if (points > biggestImpact) biggestImpact = points;

              // Spawn destruction particles at the body's position
              // before destroying it. Count scales with fragments
              // hint from the material.
              const pos = body.getPosition();
              const fragments = mat.fragments ?? 4;
              for (let i = 0; i < fragments; i++) {
                const ang = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                particlesRef.current.push({
                  x: pos.x,
                  y: pos.y,
                  vx: Math.cos(ang) * speed,
                  vy: Math.sin(ang) * speed - 2,
                  radius: 0.04 + Math.random() * 0.06,
                  color: mat.color,
                  ttl: 0.5 + Math.random() * 0.4,
                  ttlMax: 0.9,
                  rotation: Math.random() * Math.PI * 2,
                  angularVelocity: (Math.random() - 0.5) * 12,
                });
              }
            }
            map.delete(body);
          }
          world.destroyBody(body);
        });
        queue.clear();
        // Screen shake — magnitude scales with the biggest single
        // impact in this frame so a multi-destroy combo only triggers
        // one shake (not stacked).
        if (biggestImpact > 0) {
          const mag = Math.min(14, 4 + biggestImpact / 200);
          triggerShake(mag);
        }
      }
      if (scoredThisFrame > 0) {
        setScore((s) => s + scoredThisFrame);
      }

      // Goal-reached transition: count once, fire end-of-level.
      if (goalReachedRef.current && !results && !submittedRef.current) {
        submittedRef.current = true;
        const finalScore = score + scoredThisFrame + GOAL_BONUS;
        const stars = levelData ? starsForScore(levelData, finalScore) : 0;
        setScore(finalScore);
        setResults({ cleared: true, score: finalScore, stars });
        triggerShake(18);
        // Confetti burst — yellow + green particles around the goal.
        if (levelData) {
          const cx = levelData.goal.x + levelData.goal.width / 2;
          const cy = levelData.goal.y + levelData.goal.height / 2;
          const colors = ["#ffd166", "#06d6a0", "#4cc9f0", "#ef476f"];
          for (let i = 0; i < 24; i++) {
            const ang = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 7;
            particlesRef.current.push({
              x: cx,
              y: cy,
              vx: Math.cos(ang) * speed,
              vy: Math.sin(ang) * speed - 3,
              radius: 0.05 + Math.random() * 0.08,
              color: colors[i % colors.length],
              ttl: 0.8 + Math.random() * 0.6,
              ttlMax: 1.4,
              rotation: Math.random() * Math.PI * 2,
              angularVelocity: (Math.random() - 0.5) * 16,
            });
          }
        }
        if (levelData) {
          void addHighScore(finalScore, 1, levelData.worldId);
          // Persist per-level best stars so the level select can
          // render progress + the unlock gate has data to read.
          void recordLevelStars(levelData.id, stars);
        }
        return;
      }

      // Per-ball rest tracking. Tear down any ball that's been at
      // rest / off-screen for REST_FRAMES_REQUIRED consecutive
      // frames; the shot ends when the set is empty.
      const balls = ballsRef.current;
      const rest = restFramesRef.current;
      const toRemove: Body[] = [];
      balls.forEach((ball) => {
        const v = ball.getLinearVelocity();
        const speed = Math.hypot(v.x, v.y);
        const pos = ball.getPosition();
        const off =
          levelData &&
          (pos.y > levelData.height + 1 ||
            pos.x < -1 ||
            pos.x > levelData.width + 1);
        if (off || speed < REST_VELOCITY_THRESHOLD) {
          rest.set(ball, (rest.get(ball) ?? 0) + 1);
        } else {
          rest.delete(ball);
        }
        if ((rest.get(ball) ?? 0) >= REST_FRAMES_REQUIRED) {
          toRemove.push(ball);
        }
      });
      for (const ball of toRemove) {
        world.destroyBody(ball);
        balls.delete(ball);
        rest.delete(ball);
      }

      // Mirror the Set size into state so the UI re-renders.
      const newSize = balls.size;
      if (newSize !== ballsInFlight) {
        setBallsInFlight(newSize);
      }

      // Out of shots, no balls left, didn't score → fail.
      if (
        balls.size === 0 &&
        shotsLeft <= 0 &&
        !goalReachedRef.current &&
        !submittedRef.current
      ) {
        submittedRef.current = true;
        const finalScore = score + scoredThisFrame;
        setResults({ cleared: false, score: finalScore, stars: 0 });
      }
    },
    [results, score, levelData, shotsLeft, addHighScore, recordLevelStars, ballsInFlight, triggerShake],
  );

  // ── Slingshot launch ────────────────────────────────────────────
  const handleLaunch = useCallback(
    (event: { vx: number; vy: number }) => {
      if (!setup || !levelData || !footballer) return;
      if (results) return;
      if (ballsRef.current.size > 0) return;
      if (shotsLeft <= 0) return;
      const ball = addBody(setup.world, {
        shape: "circle",
        position: { x: levelData.slingshot.x, y: levelData.slingshot.y },
        radius: footballer.radius,
        density: footballer.density,
        friction: footballer.friction,
        restitution: footballer.restitution,
        color: footballer.color,
        // Use the footballer's id so the sprite registry renders
        // the right character. The applyAbility split-shot path
        // currently spawns children with id "ball" which falls
        // back to Striker's sprite — fix-up Phase 5b.
        id: footballer.id,
      });
      const mult = launchVelocityMultiplier(footballer);
      ball.setLinearVelocity(Vec2(event.vx * mult, event.vy * mult));
      ballsRef.current.add(ball);
      setBallsInFlight(ballsRef.current.size);
      setAbilityUsed(false);
      setShotsLeft((n) => n - 1);
      // Activate damage tracking from this point forward. Settle
      // collisions before the first launch don't count; everything
      // after does, including chain-reactions started by this shot.
      damageEnabledRef.current = true;
    },
    [setup, levelData, footballer, results, shotsLeft],
  );

  // ── Ability trigger (active abilities only) ────────────────────
  const handleAbility = useCallback(() => {
    if (!setup || !footballer) return;
    if (abilityUsed) return;
    if (ballsRef.current.size === 0) return;
    if (!isActiveAbility(footballer.ability)) return;
    const next = applyAbility({
      world: setup.world,
      balls: ballsRef.current,
      footballer,
    });
    ballsRef.current = next;
    // The split-shot path destroys the parent and spawns children;
    // restFramesRef should reset for the new bodies.
    restFramesRef.current = new Map();
    setBallsInFlight(next.size);
    setAbilityUsed(true);
  }, [setup, footballer, abilityUsed]);

  if (!levelData) {
    return (
      <View style={styles.errorRoot}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Level not found: {levelId}</Text>
        <Pressable style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }
  if (!setup) return null;

  const canvasW = canvasLayout?.w ?? 1;
  const canvasH = canvasLayout?.h ?? 1;
  const fitX = canvasW / levelData.width;
  const fitY = canvasH / levelData.height;
  const pixelsPerMeter = canvasLayout
    ? Math.min(fitX, fitY)
    : PIXELS_PER_METER_FALLBACK;
  const levelPxW = levelData.width * pixelsPerMeter;
  const levelPxH = levelData.height * pixelsPerMeter;
  const offsetX = Math.max(0, (canvasW - levelPxW) / 2);
  const offsetY = Math.max(0, (canvasH - levelPxH) / 2);
  const goalW = levelData.goal.width * pixelsPerMeter;
  const goalH = levelData.goal.height * pixelsPerMeter;

  const currentLevelIndex = (LEVEL_IDS as readonly string[]).indexOf(levelId);
  const nextLevelId =
    currentLevelIndex >= 0 && currentLevelIndex < LEVEL_IDS.length - 1
      ? LEVEL_IDS[currentLevelIndex + 1]
      : null;

  const showAbilityButton =
    footballer &&
    isActiveAbility(footballer.ability) &&
    ballsInFlight > 0 &&
    !abilityUsed &&
    !results;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HUD top bar */}
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
        <Text style={styles.levelTitle}>{levelData.name}</Text>
        <View style={styles.spacer} />
        <FootballerPicker
          selectedId={selectedFootballerId}
          onSelect={setSelectedFootballerId}
          disabled={ballsInFlight > 0 || !!results}
        />
        <View style={styles.spacer} />
        <View style={styles.shotsPill}>
          <Feather name="target" size={14} color="#fff" />
          <Text style={styles.shotsText}>
            {shotsLeft + ballsInFlight}
          </Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
        </View>
      </View>

      {/* Playfield: PhysicsCanvas owns the Skia surface (sky, scene
          props, bodies, particles). The Slingshot touch overlay is
          a sibling on top so it captures pan gestures. Animated.View
          wraps both so screen-shake transforms apply to the whole
          playfield without affecting the HUD. */}
      <Animated.View
        style={[
          styles.canvasWrap,
          {
            transform: [
              { translateX: shakeX },
              { translateY: shakeY },
            ],
          },
        ]}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          if (canvasLayout?.w !== w || canvasLayout?.h !== h) {
            setCanvasLayout({ w, h });
          }
        }}
      >
        {canvasLayout && (
          <>
            <PhysicsCanvas
              world={setup.world}
              pixelsPerMeter={pixelsPerMeter}
              width={canvasW}
              height={canvasH}
              originX={offsetX}
              originY={offsetY}
              onAfterStep={handleAfterStep}
              showFpsOverlay={__DEV__}
              gravityY={GRAVITY_Y}
              particlesRef={particlesRef}
              backLayer={
                <>
                  <SceneBackdrop
                    width={canvasW}
                    height={canvasH}
                    groundY={
                      levelData.height * pixelsPerMeter + offsetY
                    }
                  />
                  <GoalPost
                    x={levelData.goal.x * pixelsPerMeter + offsetX}
                    y={levelData.goal.y * pixelsPerMeter + offsetY}
                    width={goalW}
                    height={goalH}
                  />
                  {ballsInFlight === 0 && !results && (
                    <SlingshotRig
                      x={levelData.slingshot.x * pixelsPerMeter + offsetX}
                      y={levelData.slingshot.y * pixelsPerMeter + offsetY}
                      scale={pixelsPerMeter}
                    />
                  )}
                </>
              }
            />

            <Slingshot
              anchorWorld={levelData.slingshot}
              pixelsPerMeter={pixelsPerMeter}
              offsetX={offsetX}
              offsetY={offsetY}
              gravityY={GRAVITY_Y}
              disabled={!!results || ballsInFlight > 0}
              onLaunch={handleLaunch}
            />
          </>
        )}

        {/* Ability button — floating bottom-right when an active
            ability is available and the ball is in flight. Tap to
            fire the once-per-shot ability (banana kick / split). */}
        {showAbilityButton && (
          <Pressable
            style={[
              styles.abilityBtn,
              {
                bottom: insets.bottom + 16,
                right: insets.right + 16,
                backgroundColor: footballer.color,
              },
            ]}
            onPress={handleAbility}
            hitSlop={8}
          >
            <Feather name="zap" size={26} color="#0d1b2a" />
          </Pressable>
        )}
      </Animated.View>

      <ResultsScreen
        visible={!!results}
        cleared={results?.cleared ?? false}
        score={results?.score ?? 0}
        stars={results?.stars ?? 0}
        hasNext={!!nextLevelId}
        onRetry={() => setAttempt((a) => a + 1)}
        onNext={
          nextLevelId
            ? () =>
                router.replace({
                  pathname: "/game",
                  params: { levelId: nextLevelId },
                })
            : undefined
        }
        onHome={() => router.replace("/")}
      />

      <TutorialOverlay
        visible={showTutorial === true && !results}
        onDismiss={() => setShowTutorial(false)}
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  levelTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  spacer: { flex: 1 },
  shotsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
  },
  shotsText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  scorePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#ffd166",
    borderRadius: 14,
  },
  scoreText: {
    color: "#0d1b2a",
    fontSize: 13,
    fontWeight: "900",
  },
  canvasWrap: {
    flex: 1,
  },
  goalIndicator: {
    backgroundColor: "rgba(255,209,102,0.18)",
    borderColor: "#ffd166",
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
  },
  abilityBtn: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorRoot: {
    flex: 1,
    backgroundColor: "#0d1b2a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 16,
  },
  errorBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: "#ffd166",
  },
  errorBtnText: {
    color: "#0d1b2a",
    fontSize: 14,
    fontWeight: "800",
  },
});
