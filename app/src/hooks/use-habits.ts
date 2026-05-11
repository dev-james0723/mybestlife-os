"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  habitsRepository,
  habitCompletionsRepository,
  streakFreezesRepository,
  tagsRepository,
  habitTagsRepository,
  habitLinksRepository,
  type CreateHabitInput,
  type UpdateHabitInput,
  type CreateCompletionInput,
  type UpdateCompletionInput,
  type CreateFreezeInput,
  type CreateTagInput,
  type CreateHabitLinkInput,
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
};

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
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

export function useDeleteHabitLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitLinksRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-links"] });
    },
  });
}
