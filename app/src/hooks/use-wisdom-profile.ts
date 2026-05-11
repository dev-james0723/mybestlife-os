"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import type { QuoteCategory } from "@/types/quote";

export type WisdomTheme = {
  theme: string;
  description: string;
  supporting_categories: QuoteCategory[];
};

export type WisdomProfile = {
  id: string;
  user_id: string;
  quote_count_at_compute: number;
  category_distribution: Record<string, number>;
  top_themes: WisdomTheme[];
  monthly_insight: string | null;
  computed_at: string;
  manual_refresh_date: string | null;
  created_at: string;
  updated_at: string;
};

const WISDOM_KEY = ["quote-wisdom-profile"] as const;

export function useWisdomProfile() {
  return useQuery({
    queryKey: WISDOM_KEY,
    queryFn: async () => {
      const res = await fetch("/api/quote-library/wisdom", { method: "GET" });
      if (!res.ok) throw new Error("wisdom_read_failed");
      const data = (await res.json()) as { profile: WisdomProfile | null };
      return data.profile;
    },
    staleTime: 60_000,
  });
}

export function useComputeWisdomProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (options?: { manual?: boolean }) => {
      const res = await fetch("/api/quote-library/wisdom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual: options?.manual ?? false }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "wisdom_compute_failed");
      }
      return (await res.json()) as {
        profile: WisdomProfile;
        cached?: boolean;
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(WISDOM_KEY, data.profile);
    },
    onError: (err) => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      const message =
        err instanceof Error ? err.message : copy.toastTaggingFailed;
      toast.error(
        message === "manual_refresh_exhausted"
          ? copy.wisdomRefreshing + "…"
          : copy.errorGeneric,
      );
    },
  });
}
