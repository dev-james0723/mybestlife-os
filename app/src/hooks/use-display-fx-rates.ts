"use client";

import { useQuery } from "@tanstack/react-query";
import type { FxRatesPayload } from "@/lib/fx/types";

export function useDisplayFxRates(displayCurrency: string | undefined) {
  const base = (displayCurrency ?? "USD").trim().toUpperCase() || "USD";
  return useQuery({
    queryKey: ["fx-rates", base],
    queryFn: async (): Promise<FxRatesPayload> => {
      const res = await fetch(`/api/fx?from=${encodeURIComponent(base)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("FX_FETCH_FAILED");
      }
      return res.json() as Promise<FxRatesPayload>;
    },
    staleTime: 55 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
