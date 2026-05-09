import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { GameProvider } from "@/context/GameContext";
import { PurchasesProvider, usePurchases } from "@/context/PurchasesContext";
import { useMusicPlayback } from "@/hooks/useMusic";
import { hideBanner, initAds, showLaunchAd } from "@/lib/ads";
import { initAppsFlyer } from "@/lib/analytics";
import { authenticatePlayer } from "@/lib/gameCenter";

SplashScreen.preventAutoHideAsync();

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  // Start the looping background music as soon as the navigator
  // mounts. Honours the user's persisted mute + volume preferences;
  // no-ops in Expo Go where expo-audio isn't linked.
  useMusicPlayback();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="smoketest" />
      <Stack.Screen name="game" />
      <Stack.Screen name="levels" />
    </Stack>
  );
}

// Boots both the attribution SDK (AppsFlyer) and the ads SDK
// (Google Mobile Ads) in the correct order. Runs once the purchases
// context has finished its first fetch.
//
// Sequence:
//   1. AppsFlyer init — runs for EVERY user (Pro or free). Owns the
//      ATT prompt so attribution gets a fixed IDFA state before the
//      install event fires. GMA's init sees the already-answered
//      permission and skips prompting.
//   2. GMA init + launch app-open ad — free-tier users only; no
//      point monetising someone who already paid for Pro.
//   3. Signal `onReady` so the splash screen can hide.
//
// Expo Go / web users get through in milliseconds — every helper
// no-ops when the native modules aren't linked.
function AnalyticsAndAdsBootstrap({ onReady }: { onReady: () => void }) {
  const { isPro, loading, unavailable } = usePurchases();
  const doneRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (doneRef.current) return;
    doneRef.current = true;

    let cancelled = false;
    (async () => {
      // AppsFlyer first — owns ATT, runs for everyone. Don't hide
      // the splash on AppsFlyer errors; init can fail silently and
      // the rest of the app still works.
      await initAppsFlyer();
      if (cancelled) return;

      // Game Center sign-in. Fire-and-forget: leaderboard
      // submissions elsewhere in the app wait on `authenticatePlayer`
      // themselves, and the loading screen doesn't block on this —
      // GameKit can present its own sign-in sheet which we don't
      // want stacking under the interstitial.
      void authenticatePlayer();

      // Pro / unavailable: ads don't need to init and we can drop
      // the splash immediately after AppsFlyer settles.
      if (isPro || unavailable) {
        onReady();
        return;
      }

      // Free tier: init Google Mobile Ads, then show the launch
      // app-open ad over the splash. Splash hides when the ad
      // closes (or the 7 s budget lapses without a fill). The
      // launch ad is gated by `LAUNCH_AD_ENABLED` in lib/ads.ts and
      // currently disabled for D1-retention reasons; this call
      // resolves immediately when the flag is off.
      await initAds();
      if (cancelled) return;
      await showLaunchAd(7000);
      if (!cancelled) onReady();
    })();
    return () => {
      cancelled = true;
    };
  }, [isPro, loading, unavailable, onReady]);

  // If Pro flips on mid-session (post-launch paywall purchase), make
  // sure the banner tears down immediately.
  useEffect(() => {
    if (isPro) hideBanner();
  }, [isPro]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Cold-start UX:
  //   • System splash (static icon.png) is up from process start
  //     until React mounts, then we hide it IMMEDIATELY on first
  //     render so the Lottie overlay takes over.
  //   • <LoadingOverlay/> holds the view until `adsReady` flips —
  //     either the launch interstitial closes, the ad fails, or the
  //     7 s budget lapses. It fades out over 300 ms and then
  //     unmounts, handing off to the main menu.
  //   • Belt-and-braces 10 s timeout guarantees the overlay can
  //     never wedge the app forever.
  const [adsReady, setAdsReady] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(true);
  const handleAdsReady = useCallback(() => setAdsReady(true), []);

  // Hide the native splash as soon as fonts are done — the Lottie
  // overlay covers the same pixels so the swap is invisible to the
  // player.
  useEffect(() => {
    const fontsDone = fontsLoaded || !!fontError;
    if (fontsDone) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const id = setTimeout(() => {
      // Force the overlay to fade out after 10 s no matter what —
      // if the ads bootstrap wedges we never want the user stuck
      // staring at a loading animation.
      setAdsReady(true);
    }, 10_000);
    return () => clearTimeout(id);
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          {/* PurchasesProvider initialises the RevenueCat SDK on
              mount (no-op in Expo Go where the native module isn't
              linked) and exposes the `Slam Goal Pro`
              entitlement across the tree. Must sit above GameProvider
              so gameplay screens can react to Pro status. */}
          <PurchasesProvider>
            <AnalyticsAndAdsBootstrap onReady={handleAdsReady} />
            <GameProvider>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </GameProvider>
            {overlayMounted ? (
              <LoadingOverlay
                hiding={adsReady}
                onFaded={() => setOverlayMounted(false)}
              />
            ) : null}
          </PurchasesProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
