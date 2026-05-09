import { useEffect, useState } from "react";

import { getProductPrices } from "@/lib/purchases";

// Fetches localized priceString values from RevenueCat for the
// given product IDs. Returns a stable map; missing IDs (Store
// doesn't know them yet, or RC isn't linked) are simply absent and
// the caller falls back to the static `priceLocal` field on the
// catalogue product.
//
// Re-runs only when the joined ID list changes — passing a freshly
// constructed array on every render is fine because it serializes
// to the same key.
export function useStoreProducts(productIds: readonly string[]): {
  prices: Record<string, string>;
  loading: boolean;
} {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Stable dep: hash the id list so React doesn't re-fetch when the
  // caller passes a new array literal containing the same IDs.
  const key = productIds.join("|");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const result = await getProductPrices(productIds);
      if (cancelled) return;
      setPrices(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // `productIds` changes reference every render; key handles
    // identity. eslint-disable for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { prices, loading };
}
