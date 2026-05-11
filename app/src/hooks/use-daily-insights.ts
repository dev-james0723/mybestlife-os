"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dailyInsightsRepository } from "@/lib/repositories/daily-insights";
import type {
  DailyInsightInteractionStatus,
  DailyInsights,
} from "@/types/database";

/** Returns today's local-date in YYYY-MM-DD. */
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const KEY_TODAY = (date: string) => ["daily-insights", date] as const;

export function useTodayInsights() {
  const date = todayIso();
  return useQuery({
    queryKey: KEY_TODAY(date),
    queryFn: () => dailyInsightsRepository.getForDate(date),
    staleTime: 5 * 60_000,
  });
}

export function useSetInsightInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      row,
      suggestionId,
      status,
    }: {
      row: DailyInsights;
      suggestionId: string;
      status: DailyInsightInteractionStatus;
    }) => dailyInsightsRepository.setInteraction(row, suggestionId, status),
    onSuccess: (saved) => {
      qc.setQueryData(KEY_TODAY(saved.date), saved);
    },
  });
}
