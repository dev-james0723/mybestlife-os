"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  taskSubtasksRepository,
  type CreateSubtaskInput,
  type UpdateSubtaskInput,
} from "@/lib/repositories/tasks";
import type { TaskSubtask } from "@/types/database";

const keyFor = (taskId: string) => ["task-subtasks", taskId] as const;

export function useTaskSubtasks(taskId: string | null | undefined) {
  return useQuery({
    queryKey: keyFor(taskId ?? "none"),
    queryFn: () => taskSubtasksRepository.listByTask(taskId as string),
    enabled: Boolean(taskId),
  });
}

export function useCreateSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubtaskInput) =>
      taskSubtasksRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(taskId) });
    },
  });
}

/** Insert several subtasks at once (e.g. an AI breakdown). */
export function useCreateSubtasksBulk(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (titles: string[]) =>
      taskSubtasksRepository.createMany(taskId, titles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(taskId) });
    },
  });
}

export function useUpdateSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubtaskInput }) =>
      taskSubtasksRepository.update(id, input),
    // Optimistic toggle/rename so the checklist feels instant.
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: keyFor(taskId) });
      const previous = queryClient.getQueryData<TaskSubtask[]>(keyFor(taskId));
      queryClient.setQueryData<TaskSubtask[]>(keyFor(taskId), (old) =>
        (old ?? []).map((s) => (s.id === id ? { ...s, ...input } : s)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(keyFor(taskId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(taskId) });
    },
  });
}

export function useDeleteSubtask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskSubtasksRepository.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: keyFor(taskId) });
      const previous = queryClient.getQueryData<TaskSubtask[]>(keyFor(taskId));
      queryClient.setQueryData<TaskSubtask[]>(keyFor(taskId), (old) =>
        (old ?? []).filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(keyFor(taskId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(taskId) });
    },
  });
}
