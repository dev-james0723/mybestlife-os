"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buildPlanQualityReport,
  type BuildPlanQualityInput,
} from "@/lib/daily-planner/focus/plan-quality";
import {
  dailyPlanQualityReportsRepository,
  type UpsertDailyPlanQualityReportInput,
} from "@/lib/repositories/daily-plan-quality-reports";

export function dailyPlanQualityQueryKey(planDate: string) {
  return ["daily-plan-quality", planDate] as const;
}

export function useDailyPlanQuality(planDate: string) {
  return useQuery({
    queryKey: dailyPlanQualityQueryKey(planDate),
    queryFn: () => dailyPlanQualityReportsRepository.getByDate(planDate),
    enabled: !!planDate,
  });
}

export function useAnalyzeDailyPlanQuality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: BuildPlanQualityInput & { dailyPlanId?: string | null },
    ) => {
      const report = buildPlanQualityReport(input);
      return dailyPlanQualityReportsRepository.upsert({
        ...report,
        daily_plan_id: input.dailyPlanId ?? null,
      });
    },
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanQualityQueryKey(report.plan_date) });
    },
  });
}

export function useUpsertDailyPlanQuality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertDailyPlanQualityReportInput) =>
      dailyPlanQualityReportsRepository.upsert(input),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanQualityQueryKey(report.plan_date) });
    },
  });
}

export function useDeleteDailyPlanQuality() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planDate: string) => dailyPlanQualityReportsRepository.deleteForDate(planDate),
    onSuccess: (_data, planDate) => {
      queryClient.invalidateQueries({ queryKey: dailyPlanQualityQueryKey(planDate) });
    },
  });
}
