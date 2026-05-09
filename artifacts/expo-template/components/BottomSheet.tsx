import { BlurView } from "expo-blur";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Reusable iOS-style bottom sheet.
//
// - `visible` mounts the Modal; closing animates the card down off-screen
//   so the dismiss feels like the sheet actually leaves, not just fades.
// - Drag the handle (or any empty area of the card) down past the
//   DISMISS threshold and the sheet closes. Flicking down (`vy` past the
//   velocity threshold) dismisses immediately.
// - PanResponder is set up *not* to capture on touch-start, so child
//   Pressables (buttons, rows, etc.) receive their taps normally. It
//   only takes over when the finger has moved more than a few px
//   vertically, which means "clearly a drag, not a tap".
// - Backdrop tap still dismisses via onClose.

const DISMISS_DISTANCE = 90;  // px pulled down before we treat the gesture as a dismiss
const DISMISS_VELOCITY = 0.6; // fling speed that counts as a dismiss regardless of distance
const CARD_OFFSCREEN = 800;   // how far down we animate before unmounting

export function BottomSheet({
  visible,
  onClose,
  children,
  showHandle = true,
  fillHeight = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  showHandle?: boolean;
  // When true the sheet card opens to its full available height
  // (capped at `maxCardHeight`) instead of auto-sizing to children.
  // Required for sheets whose body relies on a flex: 1 ScrollView —
  // without a definite parent height that ScrollView collapses to
  // 0pt and looks empty (Bubble Lab is the canonical case).
  fillHeight?: boolean;
}) {
  const translateY = useRef(new Animated.Value(CARD_OFFSCREEN)).current;
  const insets = useSafeAreaInsets();
  // Cap the card's height so it never slides up under the status
  // bar / notch. Leave a small breathing margin (8px) above the
  // notch so the rounded top corners stay legible against whatever
  // wallpaper is bleeding through.
  const maxCardHeight =
    Dimensions.get("window").height - insets.top - 8;

  // Animate in whenever the modal becomes visible. The Modal itself uses
  // `animationType="none"` so the translateY-based animation is the only
  // one in play — otherwise the built-in fade fights the slide.
  useEffect(() => {
    if (visible) {
      translateY.setValue(CARD_OFFSCREEN);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const animateOut = (done: () => void) => {
    Animated.timing(translateY, {
      toValue: CARD_OFFSCREEN,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => done());
  };

  // Shared drag handlers — used by both the card-level lenient
  // PanResponder and the dedicated handle-area PanResponder. Keeping
  // them in one place prevents the two from drifting.
  const onMove = (gesture: { dy: number }) => {
    // Only follow the finger downward; upward drag does nothing
    // (ceiling clamp at 0 so the card doesn't rise off its resting
    // spot).
    translateY.setValue(Math.max(0, gesture.dy));
  };
  const onRelease = (gesture: { dy: number; vy: number }) => {
    const flick = gesture.vy > DISMISS_VELOCITY;
    const farEnough = gesture.dy > DISMISS_DISTANCE;
    if (flick || farEnough) {
      animateOut(onClose);
    } else {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    }
  };
  const onTerminate = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 4,
    }).start();
  };

  // Card-level responder. Intentionally passive at touch-start so
  // child buttons keep working; tries to capture mid-drag once the
  // finger has moved down 6+ px. This works for sheets with a
  // sparse UI but struggles when the card is dense with Pressables
  // (the child holds the responder and doesn't release cleanly on
  // iOS) — that's why the handle area below has its own aggressive
  // responder.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx),
      onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
        gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => onMove(gesture),
      onPanResponderRelease: (_evt, gesture) => onRelease(gesture),
      onPanResponderTerminate: () => onTerminate(),
    }),
  ).current;

  // Dedicated handle-area responder. Captures on touch-start (full
  // takeover) so dragging from the top of the sheet *always* works,
  // no matter how many Pressables are in the body. This is the
  // always-available "grab and pull down" affordance.
  const handlePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_evt, gesture) => onMove(gesture),
      onPanResponderRelease: (_evt, gesture) => onRelease(gesture),
      onPanResponderTerminate: () => onTerminate(),
    }),
  ).current;

  const handleBackdrop = () => animateOut(onClose);

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.bg}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdrop} />
        <Animated.View
          style={[
            styles.card,
            fillHeight
              ? { height: maxCardHeight }
              : { maxHeight: maxCardHeight },
            { transform: [{ translateY }] },
          ]}
          {...pan.panHandlers}
        >
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.cardTint]}
          />
          {/* Full-width drag zone at the top of the sheet. Always
              captures touches via its own PanResponder, so pull-down
              works even when the body is dense with buttons. */}
          {showHandle && (
            <View style={styles.handleArea} {...handlePan.panHandlers}>
              <View style={styles.handle} />
            </View>
          )}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  card: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 38,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    gap: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  cardTint: { backgroundColor: "rgba(8,12,24,0.5)" },
  // Invisible full-width grab zone around the handle pill. Sized
  // generously (≈50pt tall) so the drag gesture is easy to land on a
  // first try — the previous 28pt strip was hard to find by feel.
  // Negative margins tuck it back into the card's top padding so the
  // taller hit area doesn't push body content down.
  handleArea: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 22,
    marginTop: -10,
    marginBottom: -8,
  },
  handle: {
    width: 56,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
});
