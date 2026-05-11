"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { careerVaultTagsRepository } from "@/lib/repositories/career-vault-tags";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";

const TAG_LIST_KEY = ["career-vault-tags"] as const;
const FILES_KEY = ["career-vault-files"] as const;

export function useVaultTagUsage() {
  return useQuery({
    queryKey: TAG_LIST_KEY,
    queryFn: careerVaultTagsRepository.listUsage,
  });
}

export function useVaultFilesByTag(tag: string | null | undefined) {
  return useQuery({
    queryKey: ["career-vault-files-by-tag", tag ?? ""] as const,
    queryFn: () => careerVaultTagsRepository.filesByTag(tag as string),
    enabled: !!tag,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: TAG_LIST_KEY });
  qc.invalidateQueries({ queryKey: FILES_KEY });
  qc.invalidateQueries({ queryKey: ["career-vault-files-by-tag"] });
}

export function useRenameVaultTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      careerVaultTagsRepository.rename(from, to),
    onSuccess: (count) => {
      invalidate(qc);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.tags.toasts.renamed(count));
    },
    onError: (err: unknown) => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.tags.toasts.failed);
    },
  });
}

export function useMergeVaultTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sources, target }: { sources: string[]; target: string }) =>
      careerVaultTagsRepository.merge(sources, target),
    onSuccess: (count) => {
      invalidate(qc);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.tags.toasts.merged(count));
    },
    onError: (err: unknown) => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.tags.toasts.failed);
    },
  });
}

export function useDeleteVaultTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tag: string) => careerVaultTagsRepository.remove(tag),
    onSuccess: (count) => {
      invalidate(qc);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.tags.toasts.deleted(count));
    },
    onError: (err: unknown) => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(err instanceof Error ? err.message : copy.tags.toasts.failed);
    },
  });
}
