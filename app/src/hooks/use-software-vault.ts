"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  softwareVaultRepository,
  type CreateSoftwareVaultInput,
  type UpdateSoftwareVaultInput,
} from "@/lib/repositories/software-vault";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

function formatMutationError(error: unknown): string | undefined {
  if (!error) return undefined;
  if (error instanceof Error) return error.message || undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const e = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };
    const parts = [
      typeof e.message === "string" ? e.message : null,
      typeof e.details === "string" ? e.details : null,
      typeof e.hint === "string" ? e.hint : null,
      typeof e.code === "string" ? `(${e.code})` : null,
    ].filter((p): p is string => Boolean(p && p.trim()));
    if (parts.length > 0) return parts.join(" — ");
    try {
      return JSON.stringify(error);
    } catch {
      return undefined;
    }
  }
  return String(error);
}

export function useSoftwareVault() {
  return useQuery({
    queryKey: ["software-vault"],
    queryFn: softwareVaultRepository.getAll,
  });
}

export function useSoftwareVaultEntry(id: string) {
  return useQuery({
    queryKey: ["software-vault", id],
    queryFn: () => softwareVaultRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateSoftwareVaultEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSoftwareVaultInput) => softwareVaultRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.success(ui.created);
    },
    onError: (error) => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      const detail = formatMutationError(error);
      toast.error(ui.createFailed, { description: detail });
    },
  });
}

export function useUpdateSoftwareVaultEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSoftwareVaultInput }) =>
      softwareVaultRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.success(ui.updated);
    },
    onError: (error) => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.error(ui.updateFailed, { description: formatMutationError(error) });
    },
  });
}

export function useDeleteSoftwareVaultEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softwareVaultRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.success(ui.deleted);
    },
    onError: (error) => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.error(ui.deleteFailed, { description: formatMutationError(error) });
    },
  });
}

export function useToggleDefaultStack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isDefault }: { id: string; isDefault: boolean }) =>
      softwareVaultRepository.update(id, { is_default_stack: isDefault }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["software-vault"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.success(ui.updated);
    },
    onError: (error) => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.softwareVault;
      toast.error(ui.updateFailed, { description: formatMutationError(error) });
    },
  });
}
