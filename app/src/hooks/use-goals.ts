"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  goalsRepository,
  keyResultsRepository,
  type CreateGoalInput,
  type UpdateGoalInput,
  type CreateKeyResultInput,
  type UpdateKeyResultInput,
} from "@/lib/repositories/goals";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: goalsRepository.getAll,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGoalInput }) =>
      goalsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.error(ui.deleteFailed);
    },
  });
}

export function useKeyResults(goalId: string) {
  return useQuery({
    queryKey: ["key-results", goalId],
    queryFn: () => keyResultsRepository.getByGoalId(goalId),
    enabled: !!goalId,
  });
}

export function useCreateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKeyResultInput) => keyResultsRepository.create(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["key-results", variables.goal_id] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.success(ui.keyResultCreated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.error(ui.keyResultCreateFailed);
    },
  });
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKeyResultInput }) =>
      keyResultsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-results"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.success(ui.keyResultUpdated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.error(ui.keyResultUpdateFailed);
    },
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => keyResultsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-results"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.success(ui.keyResultDeleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.goals;
      toast.error(ui.keyResultDeleteFailed);
    },
  });
}
