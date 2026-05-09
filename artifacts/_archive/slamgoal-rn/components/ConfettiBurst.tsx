import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

// Pure-RN confetti burst — no external library, fits comfortably
// inside Expo Go. Spawns N short rectangles at a single point, each
// with a randomised angle / distance / colour / spin / lifetime, and
// runs them on the native driver so a discovery can land at 60 fps
// while the physics loop keeps spinning.
//
// Used for first-card discoveries (Stage 2) and reused by future
// celebrations (e.g. world-100% completion in Stage 3).

const PIECE_COUNT = 28;
const DEFAULT_COLORS = [
  "#FBBF24", // amber
  "#F472B6", // pink
  "#A78BFA", // violet
  "#22D3EE", // cyan
  "#34D399", // emerald
  "#F87171", // red
];

interface PieceSpec {
  color: string;
  angle: number; // radians
  distance: number;
  duration: number;
  startSpin: number;
  endSpin: number;
  width: number;
  height: number;
  delay: number;
}

function makePiece(colors: readonly string[]): PieceSpec {
  const angle = Math.random() * Math.PI * 2;
  const distance = 90 + Math.random() * 90;
  const duration = 700 + Math.random() * 500;
  const startSpin = Math.random() * 180;
  const endSpin = startSpin + (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 540);
  return {
    color: colors[Math.floor(Math.random() * colors.length)],
    angle,
    distance,
    duration,
    startSpin,
    endSpin,
    width: 6 + Math.random() * 4,
    height: 8 + Math.random() * 6,
    delay: Math.random() * 60,
  };
}

export function ConfettiBurst({
  x,
  y,
  colors = DEFAULT_COLORS,
  onDone,
}: {
  x: number;
  y: number;
  colors?: readonly string[];
  onDone: () => void;
}) {
  // Generate the spec once so the animation is deterministic per
  // mount. Re-renders (e.g. parent re-render during physics tick)
  // don't reroll positions and re-trigger the animation.
  const pieces = useMemo<readonly PieceSpec[]>(
    () => Array.from({ length: PIECE_COUNT }, () => makePiece(colors)),
    [colors],
  );

  // One Animated.Value per piece — drives translateX/Y/rotate/opacity
  // via interpolate. Native-driver compatible.
  const drivers = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = drivers.map((d, i) =>
      Animated.timing(d, {
        toValue: 1,
        duration: pieces[i].duration,
        delay: pieces[i].delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start(() => onDone());
  }, [drivers, pieces, onDone]);

  return (
    <View pointerEvents="none" style={[styles.wrap, { left: x, top: y }]}>
      {pieces.map((p, i) => {
        const d = drivers[i];
        const dx = Math.cos(p.angle) * p.distance;
        // Bias slight upward (negative y) so the burst feels like a
        // fountain rather than a flat radial.
        const dy = Math.sin(p.angle) * p.distance - 30;
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                opacity: d.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [1, 1, 0],
                }),
                transform: [
                  {
                    translateX: d.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, dx],
                    }),
                  },
                  {
                    translateY: d.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, dy],
                    }),
                  },
                  {
                    rotate: d.interpolate({
                      inputRange: [0, 1],
                      outputRange: [`${p.startSpin}deg`, `${p.endSpin}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    width: 0,
    height: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  piece: {
    position: "absolute",
    borderRadius: 1.5,
  },
});
