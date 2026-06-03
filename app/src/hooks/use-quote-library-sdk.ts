"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  addQuoteFromMindSweep,
  findResonantQuotes,
  generateContextualQuote,
  getFavoritesForDailyInspiration,
  getQuotesForGoal,
  inspireMe,
  linkQuoteToGoal,
  type ContextualQuoteResult,
  type FavoriteInspirationItem,
  type InspireMeContext,
  type InspireMeResult,
  type MindSweepContext,
  type ResonantQuoteMatch,
} from "@/lib/quote-library/sdk";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";
import type { Quote } from "@/types/quote";

/**
 * React Query bindings for the Quote Library SDK.
 *
 * These hooks are what Dashboard / Journal / MindClear / Goals should import
 * — never the REST routes directly. Each mutation invalidates the right cache
 * keys so related UI stays consistent (e.g. linking a quote to a goal
 * invalidates the `quotes` list so the goal filter refreshes).
 */

const QUOTES_KEY = ["quotes"] as const;
const DAILY_INSPIRATION_KEY = ["quote-daily-inspiration"] as const;
const INSPIRE_KEY = ["quote-inspire-latest"] as const;
const GOAL_QUOTES_KEY = (goalId: string) =>
  ["quote-goal-quotes", goalId] as const;

/**
 * Fetch the user's 5 freshest favorites for the Dashboard Daily Inspiration
 * card. 10-minute stale time keeps the morning view cheap to re-render.
 */
export function useDailyInspirationFavorites(
  options?: { limit?: number; enabled?: boolean },
) {
  const limit = options?.limit ?? 5;
  const [canFetchFavorites, setCanFetchFavorites] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanFetchFavorites(!hasDevLoginBypassCookie());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return useQuery({
    queryKey: [...DAILY_INSPIRATION_KEY, limit],
    queryFn: async () => {
      const res = await getFavoritesForDailyInspiration({ limit });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: (options?.enabled ?? true) && canFetchFavorites,
  });
}

export function useInspireMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ctx: InspireMeContext) => {
      const res = await inspireMe(ctx);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<InspireMeResult>(INSPIRE_KEY, data);
    },
  });
}

export function useLastInspireMe(
  options?: UseQueryOptions<InspireMeResult | null, Error>,
) {
  return useQuery<InspireMeResult | null, Error>({
    queryKey: [...INSPIRE_KEY],
    queryFn: () => null,
    staleTime: Infinity,
    enabled: false,
    ...options,
  });
}

/**
 * Resonant matches for a journal entry (or any free-form text).
 *
 * Intentionally LAZY: we don't kick the search off automatically on mount —
 * callers pass `enabled: true` once the entry is open and we have stable
 * text. That keeps embeddings calls off the happy path when a user scrolls
 * past a card.
 */
export function useResonantQuotes(
  text: string,
  options?: { limit?: number; threshold?: number; enabled?: boolean },
) {
  const limit = options?.limit ?? 3;
  const threshold = options?.threshold;
  const enabled = (options?.enabled ?? true) && text.trim().length >= 24;
  return useQuery({
    queryKey: ["quote-resonant", text.trim().slice(0, 200), limit, threshold],
    queryFn: async () => {
      const res = await findResonantQuotes({
        journalEntryText: text,
        limit,
        threshold,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled,
    staleTime: 15 * 60 * 1000,
  });
}

export function useContextualQuote() {
  return useMutation({
    mutationFn: async (input: { context: string; language?: string }) => {
      const res = await generateContextualQuote(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

export function useAddQuoteFromMindSweep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      text: string;
      source_author?: string | null;
      source_context?: string | null;
      personal_note?: string | null;
      mindSweepContext?: MindSweepContext;
    }) => {
      const res = await addQuoteFromMindSweep(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Quote[]>(QUOTES_KEY, (prev) =>
        prev ? [data.quote, ...prev.filter((q) => q.id !== data.quote.id)] : [data.quote],
      );
      queryClient.invalidateQueries({ queryKey: QUOTES_KEY });
    },
  });
}

/**
 * Quotes linked to a specific goal. Returns `[]` (not undefined) for
 * convenience — callers rarely need to distinguish loading from empty.
 */
export function useQuotesForGoal(goalId: string, enabled = true) {
  return useQuery({
    queryKey: GOAL_QUOTES_KEY(goalId),
    queryFn: async (): Promise<Quote[]> => {
      const res = await getQuotesForGoal({ goalId });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: enabled && !!goalId,
    staleTime: 60 * 1000,
  });
}

export function useLinkQuoteToGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { quoteId: string; goalId: string | null }) => {
      const res = await linkQuoteToGoal(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<Quote[]>(QUOTES_KEY, (prev) =>
        prev
          ? prev.map((q) => (q.id === data.quote.id ? data.quote : q))
          : prev,
      );
      if (variables.goalId) {
        queryClient.invalidateQueries({
          queryKey: GOAL_QUOTES_KEY(variables.goalId),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["quote-goal-quotes"] });
    },
  });
}

// Re-export the SDK types so consumers don't have to import from two places.
export type {
  FavoriteInspirationItem,
  InspireMeContext,
  InspireMeResult,
  ResonantQuoteMatch,
  ContextualQuoteResult,
};
