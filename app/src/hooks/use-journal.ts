"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  journalRepository,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
} from "@/lib/repositories/journal";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { getJournalUiCopy } from "@/lib/i18n/journal-ui";

const JOURNAL_KEY = ["journal-entries"] as const;
const RECENT_LIMIT = 10;

export function useJournalEntries() {
  return useQuery({
    queryKey: JOURNAL_KEY,
    queryFn: journalRepository.getAll,
  });
}

export function useRecentJournalEntries(limit = RECENT_LIMIT) {
  return useQuery({
    queryKey: [...JOURNAL_KEY, "recent", limit],
    queryFn: () => journalRepository.getRecent(limit),
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: [...JOURNAL_KEY, id],
    queryFn: () => journalRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJournalEntryInput) =>
      journalRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      const copy = getJournalUiCopy(useAppStore.getState().language);
      toast.success(copy.toastSaveSuccess);
    },
    onError: () => {
      const copy = getJournalUiCopy(useAppStore.getState().language);
      toast.error(copy.toastSaveFailed);
    },
  });
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateJournalEntryInput;
    }) => journalRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
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
      queryClient.invalidateQueries({ queryKey: JOURNAL_KEY });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.journal;
      toast.error(ui.deleteFailed);
    },
  });
}
