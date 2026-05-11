"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  japaneseStudyRepository,
  type CreateJapaneseStudySessionInput,
  type UpdateJapaneseStudySessionInput,
} from "@/lib/repositories/japanese-study";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useJapaneseStudySessions() {
  return useQuery({
    queryKey: ["japanese-study-sessions"],
    queryFn: japaneseStudyRepository.getAll,
  });
}

export function useJapaneseStudySession(id: string) {
  return useQuery({
    queryKey: ["japanese-study-sessions", id],
    queryFn: () => japaneseStudyRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateJapaneseStudySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJapaneseStudySessionInput) => japaneseStudyRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["japanese-study-sessions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.japaneseStudy;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.japaneseStudy;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateJapaneseStudySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateJapaneseStudySessionInput }) =>
      japaneseStudyRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["japanese-study-sessions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.japaneseStudy;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.japaneseStudy;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteJapaneseStudySession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => japaneseStudyRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["japanese-study-sessions"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.japaneseStudy;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.japaneseStudy;
      toast.error(ui.deleteFailed);
    },
  });
}
