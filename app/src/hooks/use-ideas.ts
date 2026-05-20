"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ideasRepository, type CreateIdeaInput, type UpdateIdeaInput } from "@/lib/repositories/ideas";
import type { Idea } from "@/types/database";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useIdeas(options?: { initialData?: Idea[] }) {
  return useQuery({
    queryKey: ["ideas"],
    queryFn: ideasRepository.getAll,
    initialData: options?.initialData,
  });
}

export function useIdea(id: string) {
  return useQuery({
    queryKey: ["ideas", id],
    queryFn: () => ideasRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIdeaInput) => ideasRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.ideas;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.ideas;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIdeaInput }) => ideasRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.ideas;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.ideas;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteIdea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ideasRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ideas"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.ideas;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.ideas;
      toast.error(ui.deleteFailed);
    },
  });
}
