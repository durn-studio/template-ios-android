import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Lightweight horizontal volume slider built on PanResponder so we
// don't have to pull in @react-native-community/slider for a single
// row. Tap-to-set + drag-to-scrub. Tapping the icon mutes/unmutes
// without losing the underlying volume.
//
// Coordinate strategy:
//   • We measure the track's page-X via measureInWindow on layout and
//     re-measure on every responder grant (sheet animations or
//     scrolls can shift it after layout).
//   • We always use page-relative coordinates from the gesture
//     event (pageX on grant, gestureState.moveX on move) and subtract
//     the measured offset. NEVER use locationX — when the knob
//     moves under the finger, locationX flips to be relative to the
//     knob and the value collapses to ~0.

const TRACK_HEIGHT = 6;
const KNOB_SIZE = 22;

export function VolumeSlider({
  label,
  value,
  muted,
  onChange,
  onToggleMute,
}: {
  label: string;
  value: number;
  muted: boolean;
  onChange: (v: number) => void;
  onToggleMute: () => void;
}) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const containerRef = useRef<View>(null);
  const containerXRef = useRef(0);

  // Keep the latest onChange in a ref so the panResponder closure —
  // captured once via useRef — always calls the current callback.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const measureContainer = useCallback(() => {
    containerRef.current?.measureInWindow((x) => {
      containerXRef.current = x;
    });
  }, []);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      widthRef.current = w;
      setWidth(w);
      // Layout x is parent-relative; we need page coords. Defer to
      // next tick so the view is fully positioned in the window.
      setTimeout(measureContainer, 0);
    },
    [measureContainer],
  );

  const setFromPageX = useCallback((pageX: number) => {
    const w = widthRef.current;
    if (w <= 0) return;
    const x = pageX - containerXRef.current;
    const v = Math.max(0, Math.min(1, x / w));
    onChangeRef.current(v);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      // Claim the gesture aggressively so the bottom-sheet's pan
      // can't steal mid-drag.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        // Re-measure right before we use the offset — fixes drift
        // from sheet animations or keyboard layout shifts.
        measureContainer();
        setFromPageX(e.nativeEvent.pageX);
      },
      onPanResponderMove: (_e, g) => {
        setFromPageX(g.moveX);
      },
    }),
  ).current;

  const ratio = Math.max(0, Math.min(1, value));
  const fillWidth = width * ratio;
  const knobLeft = Math.max(0, fillWidth - KNOB_SIZE / 2);

  const iconName: keyof typeof Feather.glyphMap = muted
    ? "volume-x"
    : ratio < 0.05
      ? "volume"
      : ratio < 0.5
        ? "volume-1"
        : "volume-2";

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggleMute}
        style={({ pressed }) => [
          styles.iconBtn,
          muted ? styles.iconBtnMuted : styles.iconBtnOn,
          pressed ? { opacity: 0.7 } : null,
        ]}
        hitSlop={6}
      >
        <Feather
          name={iconName}
          size={16}
          color={muted ? "rgba(255,255,255,0.5)" : "#FFD700"}
        />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.percent, muted && styles.percentMuted]}>
            {muted ? "MUTE" : `${Math.round(ratio * 100)}%`}
          </Text>
        </View>

        <View
          ref={containerRef}
          collapsable={false}
          style={styles.trackHit}
          onLayout={handleLayout}
          {...panResponder.panHandlers}
        >
          {/* pointerEvents none on every visual child so touches
              never reach the knob/fill — locationX would flip and
              the slider would jitter to ~0. */}
          <View pointerEvents="none" style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: fillWidth },
                muted && styles.fillMuted,
              ]}
            />
            <View
              style={[
                styles.knob,
                { left: knobLeft },
                muted && styles.knobMuted,
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnOn: {
    backgroundColor: "rgba(255,215,0,0.12)",
  },
  iconBtnMuted: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  percent: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 1,
  },
  percentMuted: {
    color: "rgba(255,255,255,0.4)",
  },
  trackHit: {
    paddingVertical: 8,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "#F59E0B",
  },
  fillMuted: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  knob: {
    position: "absolute",
    top: (TRACK_HEIGHT - KNOB_SIZE) / 2,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  knobMuted: {
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
