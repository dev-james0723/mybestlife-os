"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  documentsRepository,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from "@/lib/repositories/documents";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: documentsRepository.getAll,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDocumentInput) => documentsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.documents;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.documents;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDocumentInput }) =>
      documentsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.documents;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.documents;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.documents;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.documents;
      toast.error(ui.deleteFailed);
    },
  });
}
