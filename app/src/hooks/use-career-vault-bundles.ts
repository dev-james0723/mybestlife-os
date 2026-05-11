"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerVaultBundlesRepository,
  type CreateBundleInput,
  type UpdateBundleInput,
} from "@/lib/repositories/career-vault-bundles";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultBundle, CareerVaultFile } from "@/types/career-vault";

const ROOT_KEY = ["career-vault-bundles"] as const;

export function useCareerVaultBundles() {
  return useQuery<CareerVaultBundle[]>({
    queryKey: ROOT_KEY,
    queryFn: careerVaultBundlesRepository.list,
  });
}

export function useCareerVaultBundle(id: string | null | undefined) {
  return useQuery<CareerVaultBundle>({
    queryKey: ["career-vault-bundle", id],
    queryFn: () => careerVaultBundlesRepository.getById(id as string),
    enabled: !!id,
  });
}

export function useBundleFiles(bundle: CareerVaultBundle | null | undefined) {
  return useQuery<CareerVaultFile[]>({
    queryKey: ["career-vault-bundle-files", bundle?.id, bundle?.file_order],
    queryFn: () => careerVaultBundlesRepository.loadFiles(bundle as CareerVaultBundle),
    enabled: !!bundle,
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBundleInput) =>
      careerVaultBundlesRepository.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.bundles.toasts.created);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.bundles.toasts.createFailed);
    },
  });
}

export function useUpdateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateBundleInput }) =>
      careerVaultBundlesRepository.update(id, updates),
    onSuccess: (updated) => {
      qc.setQueryData<CareerVaultBundle[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.map((b) => (b.id === updated.id ? updated : b)) : prev,
      );
      qc.setQueryData(["career-vault-bundle", updated.id], updated);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.bundles.toasts.updated);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.bundles.toasts.updateFailed);
    },
  });
}

export function useDuplicateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerVaultBundlesRepository.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}

export function useDeleteBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerVaultBundlesRepository.delete(id),
    onSuccess: (_v, id) => {
      qc.setQueryData<CareerVaultBundle[] | undefined>(ROOT_KEY, (prev) =>
        prev ? prev.filter((b) => b.id !== id) : prev,
      );
      qc.removeQueries({ queryKey: ["career-vault-bundle", id] });
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.bundles.toasts.deleted);
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.bundles.toasts.updateFailed);
    },
  });
}

export function useMarkBundleExported() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerVaultBundlesRepository.markExported(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}
