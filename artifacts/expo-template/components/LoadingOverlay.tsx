// Full-screen Lottie loading overlay rendered on cold start. Sits on
// top of the main navigator until the ads bootstrap either shows the
// launch interstitial or times out — gives the app a native "app
// open" feel instead of a plain static splash.
//
// Expo-Go-safe: `lottie-react-native` is a native module, so we
// dynamic-require it inside a try/catch. On Expo Go / web we fall
// back to the icon image (same UX as the previous static splash).

import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

// Native-only dynamic import, mirrors the pattern in `lib/ads.ts`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LottieView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LottieView = require("lottie-react-native").default;
} catch {
  LottieView = null;
}

const animationSource = require("../assets/animations/loading.json");
// icon.png stays PNG (Apple's app-icon pipeline requires PNG, so the
// optimize-images script's KEEP_AS_PNG list excludes it). The earlier
// codebase-wide .png -> .webp sweep accidentally rewrote this require
// even though no icon.webp was generated.
const fallbackIcon = require("../assets/images/icon.png");

const inExpoGo = Constants.appOwnership === "expo";

interface Props {
  // When true, the overlay fades out over `fadeMs`. Parent should
  // unmount the component after the fade finishes (we don't
  // self-unmount so the parent stays in control of the render tree).
  hiding: boolean;
  // Fade duration in ms. 300 ms lets the interstitial-to-menu hand-off
  // feel instant without looking jarring.
  fadeMs?: number;
  // Called after the fade animation completes so the parent can
  // unmount the overlay.
  onFaded?: () => void;
}

export function LoadingOverlay({ hiding, fadeMs = 300, onFaded }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!hiding) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: fadeMs,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onFaded?.();
    });
  }, [hiding, fadeMs, opacity, onFaded]);

  const containerStyle: Animated.WithAnimatedValue<ViewStyle> = {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0d1b2a",
    opacity,
    alignItems: "center",
    justifyContent: "center",
    // Keep on top of every gameplay screen until faded.
    zIndex: 9999,
    elevation: 9999,
  };

  // Prefer the Lottie animation when the native module is linked.
  // Expo Go / web / SSR get the icon fallback.
  const showLottie = !!LottieView && !inExpoGo;

  return (
    <Animated.View
      pointerEvents={hiding ? "none" : "auto"}
      style={containerStyle}
    >
      {showLottie ? (
        <LottieView
          source={animationSource}
          autoPlay
          loop
          style={styles.lottie}
          resizeMode="contain"
        />
      ) : (
        <Image source={fallbackIcon} style={styles.icon} resizeMode="contain" />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: 260,
    height: 260,
  },
  icon: {
    width: 180,
    height: 180,
  },
});
