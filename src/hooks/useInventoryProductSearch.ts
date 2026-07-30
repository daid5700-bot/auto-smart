"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface InventorySelectorProduct {
  id: number;
  sku: string;
  name: string;
  category?: string | null;
  unit?: string | null;
  vehicleModel?: string | null;
  vehicleModels?: string[];
  stockCount: number;
  movingAvgCost: number;
  prices: Array<{
    type: string;
    amount: number;
  }>;
}

interface UseInventoryProductSearchOptions {
  query: string;
  enabled?: boolean;
  branchFilter?: number | null;
  limit?: number;
  debounceMs?: number;
}

function mergeProducts(
  current: InventorySelectorProduct[],
  incoming: InventorySelectorProduct[],
) {
  const productMap = new Map(current.map((product) => [product.id, product]));
  incoming.forEach((product) => productMap.set(product.id, product));
  return Array.from(productMap.values());
}

/**
 * Tìm phụ tùng trực tiếp trên server thay vì chỉ lọc một trang dữ liệu đã tải.
 * `products` giữ cache các lựa chọn cũ để dòng đã chọn không bị mất khi đổi từ khóa.
 */
export function useInventoryProductSearch({
  query,
  enabled = true,
  branchFilter = null,
  limit = 20,
  debounceMs = 300,
}: UseInventoryProductSearchOptions) {
  const [results, setResults] = useState<InventorySelectorProduct[]>([]);
  const [products, setProducts] = useState<InventorySelectorProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const branchKey = branchFilter ?? "current";
  const normalizedQuery = query.trim();

  useEffect(() => {
    setResults([]);
    setProducts([]);
  }, [branchKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResults([]);

    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          view: "selector",
          page: "1",
          limit: String(Math.min(50, Math.max(1, limit))),
        });
        if (normalizedQuery) params.set("search", normalizedQuery);
        if (typeof branchFilter === "number") {
          params.set("branchFilter", String(branchFilter));
        }

        const response = await fetch(`/api/inventory?${params}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Không thể tìm kiếm phụ tùng.");
        }

        const nextResults = (data.products || []) as InventorySelectorProduct[];
        setResults(nextResults);
        setProducts((current) => mergeProducts(current, nextResults));
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setResults([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không thể tìm kiếm phụ tùng.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, normalizedQuery ? debounceMs : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    branchFilter,
    branchKey,
    debounceMs,
    enabled,
    limit,
    normalizedQuery,
    refreshVersion,
  ]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products],
  );

  const refresh = useCallback(() => {
    setRefreshVersion((version) => version + 1);
  }, []);

  return {
    results,
    products,
    productMap,
    loading,
    error,
    refresh,
  };
}
