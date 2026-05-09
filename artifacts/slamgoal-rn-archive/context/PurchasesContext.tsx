import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PAYWALL_RESULT,
  PRO_ENTITLEMENT,
  Purchases,
  RevenueCatUI,
  UNLIMITED_HEARTS_ENTITLEMENT,
  getProductPrices,
  initPurchases,
  isRevenueCatAvailable,
} from "@/lib/purchases";
import { logEvent } from "@/lib/analytics";
import { setProForAds } from "@/lib/interstitial";
import { COIN_PRODUCTS, HEART_PRODUCTS } from "@/constants/products";

// We only type the shape we actually consume to keep this file
// independent of the RevenueCat types on Expo Go / web (where the
// real types resolve to `never` because the module is null).
type CustomerInfo = {
  entitlements: {
    active: Record<string, unknown>;
  };
} & Record<string, unknown>;

interface PurchasesContextValue {
  /** True when the user holds the Slam Goal Pro entitlement. */
  isPro: boolean;
  /** True when the user holds the `unlimited_hearts` monthly
   *  subscription entitlement. The hearts system in GameContext
   *  treats this as "never decrement" while active. */
  hasUnlimitedHearts: boolean;
  /** True while the first fetch of customer info is in flight. */
  loading: boolean;
  /** Raw customer info if available — exposed for advanced flows. */
  customerInfo: CustomerInfo | null;
  /** True when running inside Expo Go / web where RC native modules
   *  aren't linked. All purchase actions no-op; UI should show a
   *  "requires dev build" hint when this is true. */
  unavailable: boolean;
  /** Present the RevenueCat-hosted paywall. Resolves true if the
   *  user purchased or restored, false otherwise. */
  presentPaywall: () => Promise<boolean>;
  /** Open the Customer Center — RC's native sheet for managing
   *  subscriptions, cancellations, and restores. */
  presentCustomerCenter: () => Promise<void>;
  /** Restore previous purchases (mandatory for App Store review). */
  restorePurchases: () => Promise<boolean>;
  /** Force a fresh fetch of customer info. The listener below also
   *  auto-refreshes whenever RC pushes an update. */
  refresh: () => Promise<void>;
}

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const unavailable = !isRevenueCatAvailable();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(!unavailable);
  // Hold the listener-remove token so we can clean up on unmount.
  const listenerRemoveRef = useRef<(() => void) | null>(null);

  // ── Init + subscribe ────────────────────────────────────────────
  //
  // Initialise the SDK on mount (safe in Expo Go — no-op), fetch the
  // current customer info, and subscribe to live updates. RevenueCat
  // pushes new customer info whenever a purchase completes, a
  // subscription renews, or an entitlement changes, so we never have
  // to poll.
  useEffect(() => {
    if (unavailable || !Purchases) {
      setLoading(false);
      return;
    }
    initPurchases();

    let cancelled = false;
    (async () => {
      try {
        const info = (await Purchases!.getCustomerInfo()) as unknown as CustomerInfo;
        if (!cancelled) setCustomerInfo(info);
      } catch {
        // Swallow — RC occasionally fails the first call on a cold
        // device before StoreKit is ready. The listener below will
        // push fresh info as soon as it's available.
      }

      // Pre-warm the price cache for every IAP we might surface in
      // the TopUpSheet / PowerUpShopSheet. Without this, the first
      // time the player opens a sheet they see "—" placeholders for
      // ~500 ms while RC fetches StoreKit. Worse, if the fetch
      // stalls in sandbox they were seeing the hardcoded USD
      // fallbacks (the bug that prompted this change). Pre-warming
      // keeps the cache hot so the locale-formatted price is ready
      // when the sheet opens.
      try {
        await getProductPrices([
          ...COIN_PRODUCTS.map((p) => p.id),
          ...HEART_PRODUCTS.map((p) => p.id),
        ]);
      } catch {
        // Swallow — getProductPrices already returns {} on failure
        // and useStoreProducts re-fetches when each sheet mounts.
      }

      if (!cancelled) setLoading(false);
    })();

    // addCustomerInfoUpdateListener returns a remove() function in
    // recent versions; older versions use a separate
    // removeCustomerInfoUpdateListener. We accept both for safety.
    try {
      const anyPurchases = Purchases as unknown as {
        addCustomerInfoUpdateListener: (
          fn: (info: CustomerInfo) => void,
        ) => (() => void) | void;
        removeCustomerInfoUpdateListener?: (
          fn: (info: CustomerInfo) => void,
        ) => void;
      };
      const handler = (info: CustomerInfo) => setCustomerInfo(info);
      const maybeRemove = anyPurchases.addCustomerInfoUpdateListener(handler);
      if (typeof maybeRemove === "function") {
        listenerRemoveRef.current = maybeRemove;
      } else if (anyPurchases.removeCustomerInfoUpdateListener) {
        listenerRemoveRef.current = () =>
          anyPurchases.removeCustomerInfoUpdateListener!(handler);
      }
    } catch {
      // Listener registration can fail on the first render in some
      // RN bridge states — live updates simply won't fire in that
      // case, but explicit `refresh()` still works.
    }

    return () => {
      cancelled = true;
      listenerRemoveRef.current?.();
    };
  }, [unavailable]);

  // ── Derived: Pro entitlement ────────────────────────────────────
  //
  // `customerInfo.entitlements.active` is a map keyed by entitlement
  // identifier. Presence = active. Absence = expired or never
  // purchased. This is the single source of truth for Pro.
  const isPro = useMemo(() => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[PRO_ENTITLEMENT] !== undefined;
  }, [customerInfo]);

  // Mirror isPro into the ad-manager module so
  // `maybeShowOnGameOver` / `trackActivePlay` refuse to fire when
  // the player is on Pro even if a future call site forgets the
  // React-level guard. Runs on every isPro flip (purchase, restore,
  // subscription lapse).
  useEffect(() => {
    setProForAds(isPro);
  }, [isPro]);

  // Unlimited-hearts recurring sub. RevenueCat automatically removes
  // the entitlement from `active` when the subscription lapses /
  // cancels / enters billing retry, so downstream consumers don't
  // need to track expiry dates themselves.
  const hasUnlimitedHearts = useMemo(() => {
    if (!customerInfo) return false;
    return (
      customerInfo.entitlements.active[UNLIMITED_HEARTS_ENTITLEMENT] !==
      undefined
    );
  }, [customerInfo]);

  // ── Public methods ──────────────────────────────────────────────

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    if (!RevenueCatUI || !PAYWALL_RESULT) return false;
    try {
      // Snapshot active entitlements BEFORE the paywall opens so we
      // can diff post-purchase and log only *newly* activated ones —
      // avoids double-firing af_purchase if the user already holds
      // Pro and upgrades to the unlimited-hearts sub (or vice-versa).
      const beforeActive = new Set(
        Object.keys(customerInfo?.entitlements.active ?? {}),
      );

      const result = await RevenueCatUI.presentPaywall();
      // Re-fetch customer info after the paywall closes so the UI
      // flips immediately even if the listener is delayed.
      let afterInfo: CustomerInfo | null = null;
      if (Purchases) {
        afterInfo = (await Purchases.getCustomerInfo()) as unknown as CustomerInfo;
        setCustomerInfo(afterInfo);
      }

      // Only fire af_purchase on an actual PURCHASED result — RESTORED
      // means the user is reinstalling and attribution was already
      // captured on the original install.
      if (result === PAYWALL_RESULT.PURCHASED && afterInfo) {
        const active = afterInfo.entitlements.active as Record<
          string,
          { productIdentifier?: string }
        >;
        for (const entId of Object.keys(active)) {
          if (beforeActive.has(entId)) continue;
          const ent = active[entId];
          void logEvent("af_purchase", {
            af_content_id: ent?.productIdentifier ?? entId,
            af_content_type:
              entId === UNLIMITED_HEARTS_ENTITLEMENT ? "subscription" : "inapp",
          });
        }
      }

      return (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      );
    } catch {
      return false;
    }
  }, [customerInfo]);

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    if (!RevenueCatUI) return;
    try {
      // `presentCustomerCenter` exists on newer SDKs; guard the call
      // so older versions don't throw.
      const anyUI = RevenueCatUI as unknown as {
        presentCustomerCenter?: () => Promise<void>;
      };
      if (typeof anyUI.presentCustomerCenter === "function") {
        await anyUI.presentCustomerCenter();
      }
    } catch {
      // User dismissed or SDK error — either way nothing to do.
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!Purchases) return false;
    try {
      const info = (await Purchases.restorePurchases()) as unknown as CustomerInfo;
      setCustomerInfo(info);
      return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
    } catch {
      return false;
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!Purchases) return;
    try {
      const info = (await Purchases.getCustomerInfo()) as unknown as CustomerInfo;
      setCustomerInfo(info);
    } catch {
      // noop
    }
  }, []);

  const value = useMemo<PurchasesContextValue>(
    () => ({
      isPro,
      hasUnlimitedHearts,
      loading,
      customerInfo,
      unavailable,
      presentPaywall,
      presentCustomerCenter,
      restorePurchases,
      refresh,
    }),
    [
      isPro,
      hasUnlimitedHearts,
      loading,
      customerInfo,
      unavailable,
      presentPaywall,
      presentCustomerCenter,
      restorePurchases,
      refresh,
    ],
  );

  return (
    <PurchasesContext.Provider value={value}>
      {children}
    </PurchasesContext.Provider>
  );
}

export function usePurchases(): PurchasesContextValue {
  const ctx = useContext(PurchasesContext);
  if (!ctx) {
    throw new Error("usePurchases must be used within a PurchasesProvider");
  }
  return ctx;
}
