import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BottomSheet } from "./BottomSheet";
import { VolumeSlider } from "./VolumeSlider";
import { format, LOCALE_CODES, LOCALE_LABELS } from "@/constants/i18n";
import { useGame } from "@/context/GameContext";
import { usePurchases } from "@/context/PurchasesContext";
import { useMusic } from "@/hooks/useMusic";
import { useSfx } from "@/hooks/useSfx";
import { useStrings } from "@/hooks/useStrings";

// In-game settings sheet. Replaces the bare RevenueCat Customer
// Center that used to open when the player tapped the gear — the
// Customer Center only makes sense for active subscribers, so free
// users were landing on "No Subscriptions found" and bouncing.
//
// Sections, top to bottom:
//   • Language   — inline locale picker, same keys as the home
//                  LanguageSheet.
//   • Account    — Restore purchases (required by Apple for any
//                  app with IAPs), Manage subscriptions (only
//                  visible when the player holds at least one
//                  active sub; opens the RC Customer Center).
//   • Legal      — Privacy policy, Terms of service. External
//                  links to the Slam Goal marketing site.
//   • Support    — mailto support address.
//   • Footer     — version string from expoConfig.
//
// All side-effect calls degrade gracefully: restorePurchases
// no-ops in Expo Go, mailto/URL open silently fail if the device
// can't handle them.

const SUPPORT_EMAIL = "REPLACE_WITH_SUPPORT_EMAIL";
const PRIVACY_URL = "REPLACE_WITH_PRIVACY_URL";
const TERMS_URL = "REPLACE_WITH_TERMS_URL";

export function GameSettingsSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { s, t } = useStrings();
  const { locale, setLocale } = useGame();
  const { isPro, hasUnlimitedHearts, restorePurchases, presentCustomerCenter } =
    usePurchases();
  const {
    muted: sfxMuted,
    setMuted: setSfxMuted,
    volume: sfxVolume,
    setVolume: setSfxVolume,
  } = useSfx();
  const {
    muted: musicMuted,
    setMuted: setMusicMuted,
    volume: musicVolume,
    setVolume: setMusicVolume,
  } = useMusic();
  const [restoring, setRestoring] = useState(false);

  const hasActiveSub = isPro || hasUnlimitedHearts;
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const ok = await restorePurchases();
      Alert.alert(
        s.settings.title,
        ok ? s.settings.restoreOk : s.settings.restoreFail,
      );
    } finally {
      setRestoring(false);
    }
  };

  const openUrl = (url: string) => {
    void Linking.openURL(url).catch(() => {});
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>{s.settings.title}</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Audio sliders ────────────────────────────────── */}
        <Text style={styles.section}>{s.settings.audio}</Text>
        <VolumeSlider
          label={s.settings.sound}
          value={sfxVolume}
          muted={sfxMuted}
          onChange={setSfxVolume}
          onToggleMute={() => setSfxMuted(!sfxMuted)}
        />
        <VolumeSlider
          label={s.settings.music}
          value={musicVolume}
          muted={musicMuted}
          onChange={setMusicVolume}
          onToggleMute={() => setMusicMuted(!musicMuted)}
        />
        <View style={styles.divider} />

        {/* ── Language ─────────────────────────────────────── */}
        <Text style={styles.section}>{s.settings.language}</Text>
        <View style={styles.localeList}>
          {LOCALE_CODES.map((code) => {
            const active = code === locale;
            return (
              <Pressable
                key={code}
                onPress={() => setLocale(code)}
                style={({ pressed }) => [
                  styles.localeRow,
                  active && styles.localeRowActive,
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Text style={styles.localeLabel}>{LOCALE_LABELS[code]}</Text>
                {active ? (
                  <Feather name="check" size={16} color="#A78BFA" />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* ── Account ──────────────────────────────────────── */}
        <View style={styles.divider} />
        <SettingsRow
          icon="refresh-cw"
          label={restoring ? s.settings.restoring : s.settings.restore}
          onPress={restoring ? undefined : handleRestore}
        />
        {hasActiveSub ? (
          <SettingsRow
            icon="credit-card"
            label={s.settings.manageSub}
            onPress={() => {
              onClose();
              // Small timeout so the sheet animates out before the
              // customer-center modal slides in — stacking native
              // modals over React Native sheets on iOS is flaky.
              setTimeout(() => {
                void presentCustomerCenter();
              }, 250);
            }}
          />
        ) : null}

        {/* ── Legal ────────────────────────────────────────── */}
        <View style={styles.divider} />
        <SettingsRow
          icon="shield"
          label={s.settings.privacy}
          onPress={() => openUrl(PRIVACY_URL)}
          external
        />
        <SettingsRow
          icon="file-text"
          label={s.settings.terms}
          onPress={() => openUrl(TERMS_URL)}
          external
        />

        {/* ── Support ──────────────────────────────────────── */}
        <View style={styles.divider} />
        <SettingsRow
          icon="mail"
          label={s.settings.support}
          onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
          external
        />

        {/* ── Footer — version ─────────────────────────────── */}
        <Text style={styles.version}>
          {t(s.settings.version, { v: version })}
        </Text>
      </ScrollView>
    </BottomSheet>
  );
}

// Shared list row — icon left, label centre, chevron or external-
// arrow right. Disabled when onPress is undefined.
function SettingsRow({
  icon,
  label,
  onPress,
  external,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  external?: boolean;
}) {
  const disabled = !onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        disabled ? styles.rowDisabled : null,
        pressed && !disabled ? { opacity: 0.7 } : null,
      ]}
    >
      <View style={styles.rowIconWrap}>
        <Feather name={icon} size={16} color="rgba(255,255,255,0.8)" />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Feather
        name={external ? "external-link" : "chevron-right"}
        size={16}
        color="rgba(255,255,255,0.45)"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    alignSelf: "stretch",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  scroll: {
    // BottomSheet wraps its children with alignItems: center, so a
    // plain flex child shrinks to intrinsic width. Any row here
    // that relies on rowLabel's flex:1 (e.g. the sound toggle,
    // "Restore purchases") would collapse and wrap the label one
    // character per line. alignSelf:stretch forces the ScrollView —
    // and therefore every row inside — to fill the sheet's
    // available width.
    alignSelf: "stretch",
    maxHeight: 520,
  },
  scrollContent: {
    paddingBottom: 8,
  },

  section: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: 8,
  },

  localeList: {
    gap: 6,
  },
  localeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  localeRowActive: {
    borderColor: "rgba(167,139,250,0.6)",
    backgroundColor: "rgba(167,139,250,0.12)",
  },
  localeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },

  version: {
    marginTop: 14,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    letterSpacing: 0.5,
  },

});
