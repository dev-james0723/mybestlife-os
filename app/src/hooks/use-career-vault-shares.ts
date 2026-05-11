"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerVaultSharesRepository,
  type UpdateShareInput,
} from "@/lib/repositories/career-vault-shares";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type {
  CareerVaultShare,
  CreateShareInput,
  ShareAccessLog,
} from "@/types/career-vault";

const ROOT_KEY = ["career-vault-shares"] as const;

export function useCareerVaultShares() {
  return useQuery<CareerVaultShare[]>({
    queryKey: ROOT_KEY,
    queryFn: careerVaultSharesRepository.list,
  });
}

export function useCareerVaultSharesForFile(fileId: string | null | undefined) {
  return useQuery<CareerVaultShare[]>({
    queryKey: ["career-vault-shares", "file", fileId],
    queryFn: () => careerVaultSharesRepository.listForFile(fileId as string),
    enabled: !!fileId,
  });
}

export function useShareAccessLogs(shareId: string | null | undefined) {
  return useQuery<ShareAccessLog[]>({
    queryKey: ["share-access-logs", shareId],
    queryFn: () => careerVaultSharesRepository.listAccessLogs(shareId as string),
    enabled: !!shareId,
  });
}

export function useCreateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateShareInput) =>
      careerVaultSharesRepository.create(input),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
      if (created.file_id) {
        qc.invalidateQueries({
          queryKey: ["career-vault-shares", "file", created.file_id],
        });
      }
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.shares.toasts.created);
    },
    onError: (error: unknown) => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      const msg = error instanceof Error ? error.message : copy.shares.toasts.createFailed;
      toast.error(msg);
    },
  });
}

export function useUpdateShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateShareInput }) =>
      careerVaultSharesRepository.update(id, updates),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
      if (updated.file_id) {
        qc.invalidateQueries({
          queryKey: ["career-vault-shares", "file", updated.file_id],
        });
      }
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.shares.toasts.updated);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.shares.toasts.updateFailed);
    },
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerVaultSharesRepository.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.shares.toasts.revoked);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.shares.toasts.updateFailed);
    },
  });
}

export function useDeleteShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerVaultSharesRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.shares.toasts.deleted);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.shares.toasts.updateFailed);
    },
  });
}
