"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notesRepository, type CreateNoteInput, type UpdateNoteInput } from "@/lib/repositories/notes";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: notesRepository.getAll,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNoteInput) => notesRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.notes;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.notes;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteInput }) =>
      notesRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.notes;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.notes;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notesRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.notes;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.notes;
      toast.error(ui.deleteFailed);
    },
  });
}
