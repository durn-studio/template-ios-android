import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

// Stylised spinning planet for the home-screen "Pick a Destination"
// card. Three layered SVGs inside a circular clip:
//
//   1. Static ocean sphere with a sun-side radial gradient (sky-blue
//      top-left → mid ocean → deep shadow at bottom-right).
//   2. Continents — stylised green blobs — on a separate layer that
//      rotates relative to the sphere. The clip mask hides anything
//      that swings past the silhouette so the continents read as
//      passing across the visible face of a sphere, not sliding off
//      a flat disc.
//   3. Static sun-highlight overlay (warm white falloff) layered on
//      top so the planet keeps a consistent lit side regardless of
//      where the continents are.
//
// The whole assembly is tilted 15° (subtler than Earth's actual
// ~23.4° axial tilt, but reads clearly as "this is a planet, not a
// logo"). Rotation is a single 18 s linear loop, started on mount
// and torn down in cleanup so it doesn't leak across navigations.

export function PlanetGlobe({ size = 64 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 18_000,
        easing: Easing.linear,
        // Native driver keeps the spin smooth even when the JS thread
        // is busy with gameplay/physics work elsewhere in the app.
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.tilt, { width: size, height: size }]}>
      <View
        style={[
          styles.clip,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {/* Layer 1 — ocean sphere */}
        <Svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="ocean" cx="0.35" cy="0.35" r="0.7">
              <Stop offset="0" stopColor="#7DD3FC" stopOpacity="1" />
              <Stop offset="0.55" stopColor="#0284C7" stopOpacity="1" />
              <Stop offset="1" stopColor="#0C4A6E" stopOpacity="1" />
            </RadialGradient>
          </Defs>
          <Circle cx="32" cy="32" r="32" fill="url(#ocean)" />
        </Svg>

        {/* Layer 2 — continents (rotating). Animated.View uses native
            driver so the spin doesn't compete with JS work. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}
        >
          <Svg width={size} height={size} viewBox="0 0 64 64">
            {/* Stylised continent blobs. Coordinates are tuned to
                stay within the 30-radius safe zone so they never poke
                past the sphere edge as they rotate. Greens vary
                slightly so the planet doesn't read as monochrome. */}
            <Path
              d="M 12 26 Q 18 22 22 28 Q 24 36 18 40 Q 14 38 10 32 Q 10 28 12 26 Z"
              fill="#15803D"
              opacity="0.92"
            />
            <Path
              d="M 28 16 Q 38 18 40 26 Q 42 36 36 40 Q 28 42 26 32 Q 24 22 28 16 Z"
              fill="#16A34A"
              opacity="0.92"
            />
            <Path
              d="M 44 24 Q 52 26 54 34 Q 50 38 44 36 Q 40 30 44 24 Z"
              fill="#15803D"
              opacity="0.92"
            />
            <Path
              d="M 36 46 Q 42 44 46 48 Q 44 52 38 50 Q 34 50 36 46 Z"
              fill="#16A34A"
              opacity="0.92"
            />
            {/* A small ice-cap dot near the "north pole" helps sell
                the spherical illusion as continents drift past. */}
            <Path
              d="M 30 6 Q 36 7 36 10 Q 32 12 28 10 Q 28 7 30 6 Z"
              fill="#F0F9FF"
              opacity="0.85"
            />
          </Svg>
        </Animated.View>

        {/* Layer 3 — static sun-highlight crescent. Stays anchored to
            the lit side regardless of continent position so the
            planet keeps a consistent light direction. */}
        <Svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          style={StyleSheet.absoluteFill}
        >
          <Defs>
            <RadialGradient id="hilight" cx="0.28" cy="0.25" r="0.5">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="32" cy="32" r="32" fill="url(#hilight)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tilt: {
    // Subtler than Earth's ~23° axial tilt — at 15° the spin axis
    // reads as planetary without skewing the silhouette enough to
    // crop on the corner-arrow side.
    transform: [{ rotate: "15deg" }],
  },
  clip: {
    overflow: "hidden",
  },
});
