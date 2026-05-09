import { useCallback, useState } from "react";

import type { Product } from "@/constants/products";
import { useGame } from "@/context/GameContext";
import { isRevenueCatAvailable, purchaseProduct } from "@/lib/purchases";

// Purchase flow hook. Routes the request through RevenueCat first;
// only falls back to a local simulation when the native RC bridge
// isn't available (Expo Go / web), so designers can still poke the
// UI without a dev build. On a production iOS / Android build, the
// fallback never fires.
//
// Result shape:
//   ok=true,  stubbed=false → real Apple/Google charge confirmed
//   ok=true,  stubbed=true  → local simulation only (Expo Go)
//   ok=false, reason=...    → user cancel / store error / no product

export interface PurchaseResult {
  ok: boolean;
  stubbed: boolean;
  amount: number;
  reason?: string;
}

// Unlimited-hearts subscription window used ONLY in simulation mode.
// On real builds the entitlement comes from RevenueCat and the local
// `unlimitedUntil` state isn't touched — `hasUnlimitedHearts` in
// PurchasesContext is the source of truth.
const UNLIMITED_HEARTS_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function usePurchase() {
  const { addCoins, grantHearts, grantUnlimitedHearts } = useGame();
  const [busy, setBusy] = useState(false);

  // Apply the gameplay-side grant for a product. Subscriptions get
  // special-cased: in production the RC entitlement listener handles
  // them, so we only flip the local timer when simulating.
  //
  // Phase 1 supports coins + hearts only — the merge-game power-up
  // bundle and its grant types were removed. Phase 5's IAP redesign
  // (footballer cards, manager pass, etc.) will reintroduce richer
  // product kinds here.
  const applyGrant = useCallback(
    (product: Product, isSimulation: boolean) => {
      if (product.kind === "coins") {
        void addCoins(product.amount);
        return;
      }
      if (product.kind === "hearts") {
        if (product.subscription) {
          if (isSimulation) {
            grantUnlimitedHearts(UNLIMITED_HEARTS_MONTH_MS);
          }
          // Real-store path: RC grants `unlimited_hearts`
          // entitlement; PurchasesContext listener picks it up.
        } else {
          grantHearts(product.amount);
        }
        return;
      }
    },
    [addCoins, grantHearts, grantUnlimitedHearts],
  );

  const purchase = useCallback(
    async (product: Product): Promise<PurchaseResult> => {
      if (busy) {
        return { ok: false, stubbed: false, amount: 0, reason: "busy" };
      }
      setBusy(true);
      try {
        const rc = await purchaseProduct(product.id);

        // Real store charge succeeded → grant items locally for
        // consumables. Subscriptions (`hearts.unlimited`, Pro) skip
        // the local grant — the RC entitlement listener handles them.
        if (rc.ok) {
          applyGrant(product, false);
          return { ok: true, stubbed: false, amount: product.amount };
        }

        // RC isn't available (Expo Go / web) — keep the dev-time
        // local simulation so designers can verify the UI flow.
        // Real builds either succeed above or surface an error
        // below; we never silently fake a charge in production.
        if (rc.reason === "rcUnavailable") {
          await new Promise((resolve) => setTimeout(resolve, 600));
          applyGrant(product, true);
          return { ok: true, stubbed: true, amount: product.amount };
        }

        return {
          ok: false,
          stubbed: false,
          amount: 0,
          reason: rc.reason ?? "error",
        };
      } finally {
        setBusy(false);
      }
    },
    [busy, applyGrant],
  );

  // Surface "are we in dev-sim mode?" so the calling sheet can hide
  // the "purchases simulate locally" banner on real builds.
  const isLive = isRevenueCatAvailable();

  return { purchase, busy, isLive };
}
