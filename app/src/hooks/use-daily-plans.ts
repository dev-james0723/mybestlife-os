"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  dailyPlansRepository,
  type CreateDailyPlanInput,
  type UpdateDailyPlanInput,
} from "@/lib/repositories/daily-plans";
import { useAppStore } from "@/stores/app-store";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return "Something went wrong";
  }
}

export function useDailyPlans() {
  return useQuery({
    queryKey: ["daily-plans"],
    queryFn: dailyPlansRepository.getAll,
  });
}

export function useDailyPlan(planDate: string) {
  return useQuery({
    queryKey: ["daily-plans", planDate],
    queryFn: () => dailyPlansRepository.getByDate(planDate),
    enabled: !!planDate,
  });
}

export function useUpsertDailyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDailyPlanInput) => dailyPlansRepository.upsertByDate(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
      queryClient.invalidateQueries({ queryKey: ["daily-plans", input.plan_date] });
    },
    onError: (err) => {
      const ui = getDailyPlannerUiCopy(useAppStore.getState().language);
      toast.error(`${ui.toastDailyPlanSaveFailed}: ${errorMessage(err)}`);
    },
  });
}

export function useUpdateDailyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDailyPlanInput }) =>
      dailyPlansRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
    },
    onError: (err) => {
      const ui = getDailyPlannerUiCopy(useAppStore.getState().language);
      toast.error(`${ui.toastDailyPlanUpdateFailed}: ${errorMessage(err)}`);
    },
  });
}
