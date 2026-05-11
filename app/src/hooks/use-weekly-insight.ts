"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import {
  fetchWeeklyInsight,
  type WeeklyInsightResponse,
} from "@/lib/ai/bio-lab/clients";

/**
 * `useWeeklyInsight` — gated client hook for the Garden hub weekly roll-up.
 *
 * Why gated:
 *   - The query is *expensive*: it runs an aggregation + LLM call.
 *   - It's only useful weekly. Default behaviour: only fetch on Sundays
 *     (local time), and even then only if the caller flips `enabled`.
 *   - Callers (the section component) usually want one of:
 *       a) Auto-fetch on Sunday once the user lands on the page.
 *       b) Manual "Reflect on this week" button → `refresh()`.
 *
 * The hook exposes both: `enabled` controls auto-fetch, `refresh()` always
 * works, and `isSunday()` is exported so the caller can decide UI affordances
 * separately from the fetch trigger.
 */

export function isSunday(now: Date = new Date()): boolean {
  return now.getDay() === 0;
}

type UseWeeklyInsightOptions = {
  /**
   * When false, the hook will not auto-fetch. Set this to `false` in tests
   * or to defer until the user explicitly opts in.
   */
  enabled?: boolean;
  /**
   * When false, the auto-fetch is suppressed off-Sunday. Default `true`.
   * Set to `false` if you've already gated this externally and want the
   * fetch to fire every visit.
   */
  sundayOnly?: boolean;
};

export function useWeeklyInsight(opts: UseWeeklyInsightOptions = {}) {
  const language = useAppStore((s) => s.language);
  const queryClient = useQueryClient();

  const enabled = opts.enabled ?? true;
  const sundayOnly = opts.sundayOnly ?? true;

  // We deliberately *do not* include the date in the queryKey: the server
  // computes (and caches) per-UTC-day already, and the client cache survives
  // for the React Query lifetime. Re-running the same hook later in the day
  // will hit the cached row.
  const queryKey = ["bio-lab-weekly-insight", language] as const;

  const isAutoFetchOk = sundayOnly ? isSunday() : true;

  const query = useQuery<WeeklyInsightResponse>({
    queryKey,
    queryFn: () => fetchWeeklyInsight({ language }),
    enabled: enabled && isAutoFetchOk,
    staleTime: 60 * 60 * 1000,
    gcTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  const refresh = useMutation({
    mutationFn: () => fetchWeeklyInsight({ language, forceRefresh: true }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  /** Manual Reflect / Try again runs the mutation. Its failures were not
   *  merged into `query.error`, so weekdays (query disabled) never showed an
   *  error — and retries after a Sunday failure could look "stuck" if only
   *  the mutation failed. Prefer the latest mutation error when present. */
  const error: Error | null =
    refresh.isError && refresh.error
      ? (refresh.error as Error)
      : (query.error as Error | null) ?? null;

  return {
    data: query.data,
    isLoading: query.isFetching || refresh.isPending,
    error,
    /** Use `mutate` (not `mutateAsync`) so failed fetches don't cause
     *  unhandled promise rejections when the card calls `onReflect` without
     *  awaiting. Errors surface via `error` + mutation state instead. */
    refresh: () => {
      refresh.mutate();
    },
    isRefreshing: refresh.isPending,
    /** Convenience: tells the caller whether today is a Sunday (local). */
    isSunday: isSunday(),
  };
}
