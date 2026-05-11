"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerVaultRepository,
  type UpdateVaultFileInput,
} from "@/lib/repositories/career-vault";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultFile, VaultFileMetadata } from "@/types/career-vault";
import { useAuth } from "@/hooks/use-auth";

const ROOT_KEY = ["career-vault-files"] as const;

/**
 * Waits for client auth hydration before querying. Without this, the first
 * fetch can run before the browser Supabase client reads session cookies,
 * which can surface as a failed request or empty/error states on /career/vault.
 */
export function useCareerVaultFiles() {
  const auth = useAuth();
  const query = useQuery({
    queryKey: ROOT_KEY,
    queryFn: careerVaultRepository.list,
    enabled: !auth.isLoading && !!auth.user,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
  });
  return { ...query, authLoading: auth.isLoading };
}

export function useCareerVaultFile(id: string | null | undefined) {
  const auth = useAuth();
  return useQuery({
    queryKey: ["career-vault-file", id],
    queryFn: () => careerVaultRepository.getById(id as string),
    enabled: !!id && !auth.isLoading && !!auth.user,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
  });
}

export function useUploadVaultFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, metadata }: { file: File; metadata: VaultFileMetadata }) =>
      careerVaultRepository.create(file, metadata),
    onSuccess: (created) => {
      queryClient.setQueryData<CareerVaultFile[] | undefined>(ROOT_KEY, (prev) =>
        prev ? [created, ...prev] : [created],
      );
      queryClient.invalidateQueries({ queryKey: ROOT_KEY });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.toasts.uploaded);
    },
    onError: (error: unknown) => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      const message = error instanceof Error ? error.message : copy.errors.uploadFailed;
      toast.error(message);
    },
  });
}

export function useUpdateVaultFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateVaultFileInput }) =>
      careerVaultRepository.update(id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData<CareerVaultFile[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.map((f) => (f.id === updated.id ? updated : f)) : prev,
      );
      queryClient.setQueryData(["career-vault-file", updated.id], updated);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.toasts.updated);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.toasts.updateFailed);
    },
  });
}

export function useDeleteVaultFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerVaultRepository.delete(id),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<CareerVaultFile[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.filter((f) => f.id !== id) : prev,
      );
      queryClient.removeQueries({ queryKey: ["career-vault-file", id] });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.toasts.deleted);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.toasts.deleteFailed);
    },
  });
}

export function useToggleVaultStar() {
  const update = useUpdateVaultFile();
  return (file: CareerVaultFile) =>
    update.mutate({ id: file.id, updates: { is_starred: !file.is_starred } });
}
