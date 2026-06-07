"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildDailyPlanReviewDraft,
  computeDailyFocusMetrics,
  type BuildDailyFocusMetricsInput,
} from "@/lib/daily-planner/focus/review-metrics";
import {
  dailyPlanReviewsRepository,
  type UpsertDailyPlanReviewInput,
} from "@/lib/repositories/daily-plan-reviews";

export function dailyPlanReviewQueryKey(planDate: string) {
  return ["daily-plan-review", planDate] as const;
}

export function useDailyPlanReview(planDate: string) {
  return useQuery({
    queryKey: dailyPlanReviewQueryKey(planDate),
    queryFn: () => dailyPlanReviewsRepository.getByDate(planDate),
    enabled: !!planDate,
  });
}

export function useDailyPlanReviewsRange(from: string, to: string) {
  return useQuery({
    queryKey: ["daily-plan-reviews", "range", from, to],
    queryFn: () => dailyPlanReviewsRepository.getRange(from, to),
    enabled: !!from && !!to,
  });
}

export function useGenerateDailyPlanReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BuildDailyFocusMetricsInput & {
        planDate: string;
        dailyPlanId?: string | null;
        savedToJournalEntryId?: string | null;
      },
    ) => {
      const metrics = computeDailyFocusMetrics(input);
      const draft = buildDailyPlanReviewDraft(metrics);
      return dailyPlanReviewsRepository.upsert({
        daily_plan_id: input.dailyPlanId ?? null,
        plan_date: input.planDate,
        saved_to_journal_entry_id: input.savedToJournalEntryId ?? null,
        ...draft,
      });
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanReviewQueryKey(review.plan_date) });
      queryClient.invalidateQueries({ queryKey: ["daily-plan-reviews", "range"] });
    },
  });
}

export function useUpsertDailyPlanReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertDailyPlanReviewInput) =>
      dailyPlanReviewsRepository.upsert(input),
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanReviewQueryKey(review.plan_date) });
      queryClient.invalidateQueries({ queryKey: ["daily-plan-reviews", "range"] });
    },
  });
}
