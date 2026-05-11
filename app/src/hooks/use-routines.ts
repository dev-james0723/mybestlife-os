"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  routinesRepository,
  routineStepsRepository,
  routineCompletionsRepository,
  type CreateRoutineInput,
  type UpdateRoutineInput,
  type CreateRoutineStepInput,
  type UpdateRoutineStepInput,
  type CreateRoutineCompletionInput,
} from "@/lib/repositories/routines";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export const routinesKeys = {
  all: ["routines"] as const,
  allWithSteps: ["routines", "with-steps"] as const,
  one: (id: string) => ["routines", id] as const,
  steps: (routineId: string) => ["routine-steps", routineId] as const,
  completions: (routineId: string) => ["routine-completions", routineId] as const,
};

// ============================================================
// Routine queries
// ============================================================

export function useRoutines() {
  return useQuery({
    queryKey: routinesKeys.all,
    queryFn: routinesRepository.getAll,
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: routinesKeys.one(id),
    queryFn: () => routinesRepository.getById(id),
    enabled: !!id,
  });
}

export function useRoutinesWithSteps() {
  return useQuery({
    queryKey: routinesKeys.allWithSteps,
    queryFn: routinesRepository.getAllWithSteps,
  });
}

export function useCreateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoutineInput) => routinesRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routinesKeys.all });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoutineInput }) =>
      routinesRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routinesKeys.all });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteRoutine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routinesRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routinesKeys.all });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.error(ui.deleteFailed);
    },
  });
}

// ============================================================
// Routine steps
// ============================================================

export function useRoutineSteps(routineId: string) {
  return useQuery({
    queryKey: routinesKeys.steps(routineId),
    queryFn: () => routineStepsRepository.getByRoutineId(routineId),
    enabled: !!routineId,
  });
}

export function useCreateRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoutineStepInput) =>
      routineStepsRepository.create(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: routinesKeys.steps(variables.routine_id),
      });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
    },
  });
}

export function useUpdateRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateRoutineStepInput;
    }) => routineStepsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine-steps"] });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
    },
  });
}

export function useDeleteRoutineStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => routineStepsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine-steps"] });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
    },
  });
}

export function useReorderRoutineSteps() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: ReadonlyArray<{ id: string; position: number }>) =>
      routineStepsRepository.reorder(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routine-steps"] });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
    },
  });
}

// ============================================================
// Routine completions
// ============================================================

export function useRoutineCompletions(
  routineId: string,
  opts?: { from?: string; to?: string; limit?: number },
) {
  return useQuery({
    queryKey: [...routinesKeys.completions(routineId), opts ?? {}],
    queryFn: () => routineCompletionsRepository.getByRoutineId(routineId, opts),
    enabled: !!routineId,
  });
}

export function useUpsertRoutineCompletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRoutineCompletionInput) =>
      routineCompletionsRepository.upsert(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: routinesKeys.completions(variables.routine_id),
      });
      queryClient.invalidateQueries({ queryKey: routinesKeys.allWithSteps });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.success(ui.runLogged);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.routines;
      toast.error(ui.runLogFailed);
    },
  });
}
