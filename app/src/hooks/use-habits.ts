"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  habitsRepository,
  habitCompletionsRepository,
  streakFreezesRepository,
  tagsRepository,
  habitTagsRepository,
  habitLinksRepository,
  habitVisualsRepository,
  timerSessionsRepository,
  habitReflectionsRepository,
  type CreateHabitInput,
  type UpdateHabitInput,
  type CreateCompletionInput,
  type UpdateCompletionInput,
  type CreateFreezeInput,
  type CreateTagInput,
  type CreateHabitLinkInput,
  type CreateTimerSessionInput,
  type CreateHabitReflectionInput,
} from "@/lib/repositories/habits";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

// Stable query keys.
export const habitsKeys = {
  all: ["habits"] as const,
  one: (id: string) => ["habits", id] as const,
  completions: (habitId: string) => ["habit-completions", habitId] as const,
  allCompletions: ["habit-completions"] as const,
  freezes: (habitId: string) => ["habit-freezes", habitId] as const,
  allFreezes: ["habit-freezes", "all"] as const,
  tags: ["habit-tags"] as const,
  links: (habitId: string) => ["habit-links", habitId] as const,
  visuals: (habitIds: readonly string[]) =>
    ["habit-visuals", [...habitIds].sort()] as const,
  allVisuals: ["habit-visuals"] as const,
  activeTimer: ["timer-sessions", "active"] as const,
  reflections: ["habit-reflections"] as const,
};

function requestHabitVisual(row: {
  id: string;
  name: string;
  description: string | null;
  type: string;
  time_of_day: string;
}) {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    void fetch("/api/ai/habits/generate-visual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        habitId: row.id,
        habitName: row.name,
        description: row.description,
        type: row.type,
        timeOfDay: row.time_of_day,
      }),
    }).catch(() => {
      // Visual generation is best-effort and must never block habit creation.
    });
  }, 0);
}

// ============================================================
// Habit queries
// ============================================================

export function useHabits() {
  return useQuery({
    queryKey: habitsKeys.all,
    queryFn: habitsRepository.getAll,
  });
}

export function useHabit(id: string) {
  return useQuery({
    queryKey: habitsKeys.one(id),
    queryFn: () => habitsRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => habitsRepository.create(input),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allVisuals });
      requestHabitVisual(row);
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHabitInput }) =>
      habitsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allCompletions });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.error(ui.deleteFailed);
    },
  });
}

// ============================================================
// Completion queries
// ============================================================

export function useHabitCompletions(
  habitId: string,
  opts?: { from?: string; to?: string; limit?: number },
) {
  return useQuery({
    queryKey: [...habitsKeys.completions(habitId), opts ?? {}],
    queryFn: () => habitCompletionsRepository.getByHabitId(habitId, opts),
    enabled: !!habitId,
  });
}

/** All completions for the current user — used by heatmap + Today view. */
export function useAllCompletions(opts?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: [...habitsKeys.allCompletions, opts ?? {}],
    queryFn: () => habitCompletionsRepository.getForUser(opts),
  });
}

/** All streak freezes in a date range (heatmap + streak math). */
export function useAllStreakFreezes(opts: { from: string; to: string }) {
  return useQuery({
    queryKey: [...habitsKeys.allFreezes, opts],
    queryFn: () => streakFreezesRepository.getForUserInRange(opts),
  });
}

/** Upsert (idempotent check-off). Invalidates completions + habits. */
export function useUpsertCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCompletionInput) =>
      habitCompletionsRepository.upsert(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: habitsKeys.completions(variables.habit_id),
      });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allCompletions });
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allFreezes });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.success(ui.logSaved);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.habits;
      toast.error(ui.logSaveFailed);
    },
  });
}

export function useUpdateCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCompletionInput }) =>
      habitCompletionsRepository.update(id, data),
    onSuccess: (row) => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.allCompletions });
      queryClient.invalidateQueries({
        queryKey: habitsKeys.completions(row.habit_id),
      });
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allFreezes });
    },
  });
}

export function useDeleteCompletionForDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, date }: { habitId: string; date: string }) =>
      habitCompletionsRepository.deleteForDate(habitId, date),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: habitsKeys.completions(variables.habitId),
      });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allCompletions });
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allFreezes });
    },
  });
}

// ============================================================
// Streak freeze
// ============================================================

export function useStreakFreezes(habitId: string) {
  return useQuery({
    queryKey: habitsKeys.freezes(habitId),
    queryFn: () => streakFreezesRepository.getByHabitId(habitId),
    enabled: !!habitId,
  });
}

export function useCreateFreeze() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFreezeInput) =>
      streakFreezesRepository.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: habitsKeys.freezes(variables.habit_id),
      });
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.allFreezes });
    },
  });
}

// ============================================================
// Tags + links
// ============================================================

export function useTags() {
  return useQuery({
    queryKey: habitsKeys.tags,
    queryFn: tagsRepository.getAll,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTagInput) => tagsRepository.create(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: habitsKeys.tags }),
  });
}

export function useSetHabitTags() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, tagIds }: { habitId: string; tagIds: string[] }) =>
      habitTagsRepository.setForHabit(habitId, tagIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: habitsKeys.all }),
  });
}

export function useHabitLinks(habitId: string) {
  return useQuery({
    queryKey: habitsKeys.links(habitId),
    queryFn: () => habitLinksRepository.getByHabitId(habitId),
    enabled: !!habitId,
  });
}

export function useCreateHabitLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitLinkInput) =>
      habitLinksRepository.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: habitsKeys.links(variables.habit_id),
      });
    },
  });
}

// ============================================================
// Habit visuals
// ============================================================

export function useHabitVisuals(habitIds: readonly string[]) {
  return useQuery({
    queryKey: habitsKeys.visuals(habitIds),
    queryFn: () => habitVisualsRepository.getForHabits(habitIds),
    enabled: habitIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================================
// Persistent timer sessions
// ============================================================

function invalidateTimerQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: habitsKeys.activeTimer });
  queryClient.invalidateQueries({ queryKey: habitsKeys.allCompletions });
  queryClient.invalidateQueries({ queryKey: habitsKeys.all });
}

export function useActiveTimerSession() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: habitsKeys.activeTimer,
    queryFn: timerSessionsRepository.getActive,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    const refetch = () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.activeTimer });
    };
    window.addEventListener("focus", refetch);
    window.addEventListener("online", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      window.removeEventListener("online", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [queryClient]);

  return query;
}

export function useStartTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTimerSessionInput) =>
      timerSessionsRepository.create(input),
    onSuccess: () => invalidateTimerQueries(queryClient),
  });
}

export function usePauseTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timerSessionsRepository.pause(id),
    onSuccess: () => invalidateTimerQueries(queryClient),
  });
}

export function useResumeTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timerSessionsRepository.resume(id),
    onSuccess: () => invalidateTimerQueries(queryClient),
  });
}

export function useCompleteTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timerSessionsRepository.complete(id),
    onSuccess: () => invalidateTimerQueries(queryClient),
  });
}

export function useCancelTimerSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timerSessionsRepository.cancel(id),
    onSuccess: () => invalidateTimerQueries(queryClient),
  });
}

export function useCreateHabitReflection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitReflectionInput) =>
      habitReflectionsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.reflections });
    },
  });
}

export function useDeleteHabitLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitLinksRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-links"] });
    },
  });
}
