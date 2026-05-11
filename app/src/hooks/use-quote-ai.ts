"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getQuoteLibraryUiCopy } from "@/lib/i18n/quote-library-ui";
import type { Quote } from "@/types/quote";

const LIST_KEY = ["quotes"] as const;
const DAILY_KEY = ["quote-daily-pick"] as const;

export function useSmartTaggingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      quote_id: string;
      quote_text: string;
      source_author?: string | null;
      source_context?: string | null;
      language?: string;
    }) => {
      const res = await fetch("/api/quote-library/smart-tagging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "smart_tagging_failed");
      }
      return (await res.json()) as { quote: Quote };
    },
    onMutate: (input) => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.loading(copy.toastTaggingInProgress, {
        id: `smart-tag-${input.quote_id}`,
        duration: 20_000,
      });
    },
    onSuccess: (data, input) => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.success(copy.toastTaggingSucceeded, {
        id: `smart-tag-${input.quote_id}`,
      });
      queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
        prev
          ? prev.map((q) => (q.id === data.quote.id ? data.quote : q))
          : prev,
      );
    },
    onError: (_err, input) => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastTaggingFailed, {
        id: `smart-tag-${input.quote_id}`,
      });
    },
  });
}

export function useSourceIntelligenceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      quote_id: string;
      force_refresh?: boolean;
    }) => {
      const res = await fetch("/api/quote-library/source-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "source_intelligence_failed");
      }
      return (await res.json()) as { quote: Quote };
    },
    onMutate: () => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.loading(copy.toastEnrichmentStarted, {
        id: "source-intel",
        duration: 30_000,
      });
    },
    onSuccess: (data) => {
      toast.dismiss("source-intel");
      queryClient.setQueryData<Quote[]>(LIST_KEY, (prev) =>
        prev
          ? prev.map((q) => (q.id === data.quote.id ? data.quote : q))
          : prev,
      );
    },
    onError: () => {
      const copy = getQuoteLibraryUiCopy(useAppStore.getState().language);
      toast.error(copy.toastEnrichmentFailed, { id: "source-intel" });
    },
  });
}

export type DailyPickResponse = {
  pick_date: string;
  quote: Quote | null;
  reason: string | null;
  dismissed: boolean;
  cached: boolean;
};

export function useDailyQuote() {
  return useQuery<DailyPickResponse>({
    queryKey: DAILY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/quote-library/daily-quote", {
        method: "GET",
      });
      if (!res.ok) throw new Error("daily_quote_failed");
      return (await res.json()) as DailyPickResponse;
    },
    staleTime: 15 * 60 * 1000,
  });
}

export function useDismissDailyQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dismissed: boolean) => {
      const res = await fetch("/api/quote-library/daily-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissed }),
      });
      if (!res.ok) throw new Error("daily_dismiss_failed");
      return (await res.json()) as { ok: true; dismissed: boolean };
    },
    onSuccess: (_data, dismissed) => {
      queryClient.setQueryData<DailyPickResponse | undefined>(
        DAILY_KEY,
        (prev) => (prev ? { ...prev, dismissed } : prev),
      );
    },
  });
}
