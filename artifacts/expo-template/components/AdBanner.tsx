import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { isAdsAvailable } from "@/lib/ads";
import { AD_UNIT_IDS } from "@/lib/adConfig";

// Bottom banner. When the Google Mobile Ads native module is linked
// (EAS dev or production build), we render `<BannerAd>` inline with
// the fixed `BANNER` size (320×50 MMA standard). We previously used
// `ANCHORED_ADAPTIVE_BANNER`, but that variant reads its parent's
// measured width through the native bridge to compute the ad height,
// and our wrapper uses `alignItems: "center"` (no definite child
// width) — so the SDK kept failing the request with an invalid-size
// error and we fell through to the placeholder. Fixed `BANNER` has
// an intrinsic 320×50 size so the request goes out cleanly.
//
// When the native module isn't available (Expo Go / web), we render
// the same "AD placeholder" card as before so the screen still reads
// honestly as "your ad would sit here".

// Lazy require so Expo Go boots without the native module. Kept at
// module scope so we don't repay the require cost on every render.
type BannerSize = "BANNER";
type BannerAdProps = {
  unitId: string;
  size: BannerSize;
  onAdFailedToLoad?: (err: unknown) => void;
};
let BannerAd: React.ComponentType<BannerAdProps> | null = null;
let BannerAdSize: { BANNER: BannerSize } | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("react-native-google-mobile-ads");
  BannerAd = mod.BannerAd ?? null;
  BannerAdSize = mod.BannerAdSize ?? null;
} catch {
  // Expo Go / web — use the placeholder branch.
}

export function AdBanner() {
  const hasAds = isAdsAvailable() && BannerAd !== null && BannerAdSize !== null;
  const [failed, setFailed] = useState(false);

  console.warn("[AdBanner] render", {
    isAdsAvailable: isAdsAvailable(),
    hasBannerAd: BannerAd !== null,
    hasBannerAdSize: BannerAdSize !== null,
    failed,
    unitId: AD_UNIT_IDS.banner,
  });

  // Native banner branch. The dark band + hairline divider provides a
  // deliberate backdrop so the creative doesn't read as an orphan
  // floating over the theme background. On a fill failure we fall
  // through to the placeholder so the slot is never empty.
  if (hasAds && !failed) {
    return (
      <View style={styles.reservation}>
        <View style={styles.reservationDivider} />
        <LinearGradient
          colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.65)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bannerCenter}>
          {BannerAd && BannerAdSize && (
            <BannerAd
              unitId={AD_UNIT_IDS.banner}
              size={BannerAdSize.BANNER}
              onAdFailedToLoad={(err) => {
                console.warn("[AdBanner] onAdFailedToLoad", err);
                setFailed(true);
              }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.adBadge}>
        <Text style={styles.adText}>AD</Text>
      </View>
      <View style={styles.centerCol}>
        <Text style={styles.label}>Ad placeholder</Text>
        <Text style={styles.subtle}>320 × 50</Text>
      </View>
      <View style={styles.iconWrap}>
        <Feather name="info" size={14} color="rgba(255,255,255,0.5)" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  reservation: {
    flex: 1,
    alignSelf: "stretch",
    overflow: "hidden",
  },
  reservationDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  // Center the BannerAd horizontally inside the reserved band. The
  // BannerAd component sizes itself to its content, so this keeps
  // the creative centered when the parent is wider than the ad.
  bannerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.35)",
    marginHorizontal: 16,
  },
  adBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "rgba(255,215,0,0.15)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,215,0,0.4)",
  },
  adText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
    letterSpacing: 1,
  },
  centerCol: {
    flex: 1,
    alignItems: "center",
    gap: 1,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
  },
  subtle: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.5,
  },
  iconWrap: {
    width: 24,
    alignItems: "flex-end",
  },
});
