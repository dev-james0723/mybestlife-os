"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tasksRepository, type CreateTaskInput, type UpdateTaskInput } from "@/lib/repositories/tasks";
import { getTasksUiCopy } from "@/lib/i18n/tasks-ui";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";

export function useTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: tasksRepository.getAll,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ["tasks", id],
    queryFn: () => tasksRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => tasksRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.success(ui.toastTaskCreated);
    },
    onError: () => {
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.error(ui.toastTaskCreateFailed);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      tasksRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.success(ui.toastTaskUpdated);
    },
    onError: () => {
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.error(ui.toastTaskUpdateFailed);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.success(ui.toastTaskDeleted);
    },
    onError: () => {
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.error(ui.toastTaskDeleteFailed);
    },
  });
}

/** Update many tasks at once (table bulk actions) with a single toast + refetch. */
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: UpdateTaskInput }) => {
      await Promise.all(ids.map((id) => tasksRepository.update(id, data)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.success(ui.toastTaskUpdated);
    },
    onError: () => {
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.error(ui.toastTaskUpdateFailed);
    },
  });
}

/** Delete many tasks at once (table bulk delete) with a single toast + refetch. */
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => tasksRepository.delete(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.success(ui.toastTaskDeleted);
    },
    onError: () => {
      const ui = getTasksUiCopy(useAppStore.getState().language);
      toast.error(ui.toastTaskDeleteFailed);
    },
  });
}
