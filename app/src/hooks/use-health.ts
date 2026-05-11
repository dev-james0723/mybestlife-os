"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  sleepLogsRepository,
  exerciseLogsRepository,
  nutritionLogsRepository,
  dailyCheckInsRepository,
  type CreateSleepLogInput,
  type CreateExerciseLogInput,
  type CreateNutritionLogInput,
  type CreateDailyCheckInInput,
} from "@/lib/repositories/health";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useSleepLogs() {
  return useQuery({
    queryKey: ["health", "sleep_logs"],
    queryFn: sleepLogsRepository.getAll,
  });
}

export function useCreateSleepLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSleepLogInput) => sleepLogsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "sleep_logs"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.sleepCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.sleepCreateFailed);
    },
  });
}

export function useDeleteSleepLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sleepLogsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "sleep_logs"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.entryDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.entryDeleteFailed);
    },
  });
}

export function useExerciseLogs() {
  return useQuery({
    queryKey: ["health", "exercise_logs"],
    queryFn: exerciseLogsRepository.getAll,
  });
}

export function useCreateExerciseLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseLogInput) => exerciseLogsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "exercise_logs"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.exerciseCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.exerciseCreateFailed);
    },
  });
}

export function useDeleteExerciseLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exerciseLogsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "exercise_logs"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.entryDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.entryDeleteFailed);
    },
  });
}

export function useNutritionLogs() {
  return useQuery({
    queryKey: ["health", "nutrition_logs"],
    queryFn: nutritionLogsRepository.getAll,
  });
}

export function useCreateNutritionLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNutritionLogInput) => nutritionLogsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "nutrition_logs"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.mealCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.mealCreateFailed);
    },
  });
}

export function useDeleteNutritionLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nutritionLogsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "nutrition_logs"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.entryDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.entryDeleteFailed);
    },
  });
}

export function useDailyCheckIns() {
  return useQuery({
    queryKey: ["health", "daily_check_ins"],
    queryFn: dailyCheckInsRepository.getAll,
  });
}

export function useCreateDailyCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDailyCheckInInput) => dailyCheckInsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "daily_check_ins"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.checkInCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.checkInCreateFailed);
    },
  });
}

export function useDeleteDailyCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dailyCheckInsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health", "daily_check_ins"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.success(ui.entryDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.health;
      toast.error(ui.entryDeleteFailed);
    },
  });
}
