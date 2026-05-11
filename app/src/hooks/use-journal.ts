"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  journalRepository,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
} from "@/lib/repositories/journal";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useJournalEntries() {
  return useQuery({
    queryKey: ["journal-entries"],
    queryFn: journalRepository.getAll,
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: ["journal-entries", id],
    queryFn: () => journalRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) => journalRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJournalEntryInput }) =>
      journalRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.error(ui.deleteFailed);
    },
  });
}
