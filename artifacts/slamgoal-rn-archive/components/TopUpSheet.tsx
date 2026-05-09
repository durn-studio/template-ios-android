import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { BottomSheet } from "./BottomSheet";
import { CoinIcon } from "./CoinIcon";
import {
  COIN_PRODUCTS,
  HEART_PRODUCTS,
  type Product,
} from "@/constants/products";
import { usePurchase } from "@/hooks/usePurchase";
import { useStoreProducts } from "@/hooks/useStoreProducts";
import { useStrings } from "@/hooks/useStrings";

// Bottom-sheet IAP picker for coin / heart bundles. Shared between the
// main menu coin & heart pills and the in-game coin pill so players
// can top up without backing out to the menu mid-run. `kind` switches
// the product list and title; everything else is identical.
export function TopUpSheet({
  visible,
  kind,
  onClose,
}: {
  visible: boolean;
  kind: "coins" | "hearts";
  onClose: () => void;
}) {
  const { s, t } = useStrings();
  const { purchase, busy, isLive } = usePurchase();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastCredit, setLastCredit] = useState<{
    amount: number;
    kind: "coins" | "hearts";
  } | null>(null);

  const products = kind === "coins" ? COIN_PRODUCTS : HEART_PRODUCTS;
  const title = kind === "coins" ? s.topup.coinsTitle : s.topup.heartsTitle;

  // Live, locale-formatted prices from RevenueCat. The map is empty
  // on first paint before the round-trip lands.
  //
  // On real iOS / Android builds (`isLive`), we DON'T fall back to
  // the static `priceLocal` because that string is hardcoded USD —
  // German / French / JP players were seeing "$0.99" briefly (or
  // permanently if RC's getProducts() was slow / failed). Showing
  // an em-dash placeholder until RC responds beats showing a wrong
  // currency. On Expo Go / web (`!isLive`), RC isn't linked at all,
  // so the static fallback is the only thing we have and we use it
  // unchanged for the dev-time UI preview.
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { prices } = useStoreProducts(productIds);
  const priceFor = (p: Product) => {
    const live = prices[p.id];
    if (live) return p.subscription ? `${live}/mo` : live;
    if (!isLive) return p.priceLocal;
    return "—";
  };

  useEffect(() => {
    if (!lastCredit) return;
    const id = setTimeout(() => setLastCredit(null), 2000);
    return () => clearTimeout(id);
  }, [lastCredit]);

  const handleBuy = async (product: Product) => {
    if (busy) return;
    setBusyId(product.id);
    const res = await purchase(product);
    setBusyId(null);
    // TopUpSheet only surfaces coin + heart products.
    if (res.ok) {
      setLastCredit({ amount: res.amount, kind: product.kind });
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>{title}</Text>

      {!isLive ? (
        <View style={styles.topupBanner}>
          <Feather name="info" size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.topupBannerTxt}>{s.topup.comingSoon}</Text>
        </View>
      ) : null}

      <View style={styles.productsList}>
        {products.map((p) => {
          const thisBusy = busyId === p.id;
          const kindLabel =
            p.kind === "coins" ? s.topup.kindCoins : s.topup.kindHearts;
          return (
            <Pressable
              key={p.id}
              onPress={() => handleBuy(p)}
              style={[
                styles.productRow,
                p.highlighted && styles.productRowHighlighted,
              ]}
              disabled={busy}
            >
              <View style={styles.productIconWrap}>
                {p.kind === "coins" ? (
                  <CoinIcon size={32} />
                ) : (
                  <Feather name="heart" size={26} color="#FB7185" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.productAmount}>
                  {p.subscription
                    ? `${s.topup.subscription} · ∞ ${kindLabel}`
                    : `${p.amount.toLocaleString()} ${kindLabel}`}
                </Text>
                {p.highlighted && (
                  <Text style={styles.productBestValue}>
                    {s.topup.bestValue}
                  </Text>
                )}
              </View>
              <View style={styles.productPrice}>
                <Text style={styles.productPriceTxt}>
                  {thisBusy ? s.topup.buying : priceFor(p)}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {lastCredit && (
        <View style={styles.toast}>
          <Text style={styles.toastTxt}>
            {t(s.topup.credited, {
              amount: lastCredit.amount.toLocaleString(),
              kind:
                lastCredit.kind === "coins"
                  ? s.topup.kindCoins
                  : s.topup.kindHearts,
            })}
          </Text>
        </View>
      )}

      <Pressable onPress={onClose} hitSlop={10} style={styles.sheetClose}>
        <Text style={styles.sheetCloseTxt}>{s.daily.close}</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold" },
  sheetClose: { paddingVertical: 6 },
  sheetCloseTxt: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  topupBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(250,204,21,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(250,204,21,0.25)",
    marginVertical: 4,
  },
  topupBannerTxt: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
  productsList: {
    width: "100%",
    gap: 6,
    marginVertical: 4,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
  },
  productRowHighlighted: {
    backgroundColor: "rgba(255,215,0,0.12)",
    borderColor: "rgba(255,215,0,0.42)",
  },
  productIconWrap: {
    width: 36,
    alignItems: "center",
  },
  productAmount: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  productBestValue: {
    color: "#FFD700",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  productPrice: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  productPriceTxt: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,215,0,0.18)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,215,0,0.45)",
    marginTop: 4,
  },
  toastTxt: {
    color: "#FFD700",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
