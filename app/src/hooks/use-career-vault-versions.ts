"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  careerVaultVersionsRepository,
  type CreateVersionInput,
  type RestoreVersionInput,
} from "@/lib/repositories/career-vault-versions";
import { useAppStore } from "@/stores/app-store";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { CareerVaultFile } from "@/types/career-vault";

const ROOT_KEY = ["career-vault-files"] as const;

function versionsKey(fileId: string | null | undefined) {
  return ["career-vault-versions", fileId ?? ""] as const;
}

export function useFileVersions(fileId: string | null | undefined) {
  return useQuery({
    queryKey: versionsKey(fileId),
    queryFn: () => careerVaultVersionsRepository.list(fileId as string),
    enabled: !!fileId,
  });
}

export function useVersion(versionId: string | null | undefined) {
  return useQuery({
    queryKey: ["career-vault-version", versionId ?? ""] as const,
    queryFn: () => careerVaultVersionsRepository.getById(versionId as string),
    enabled: !!versionId,
  });
}

function invalidateFile(
  qc: ReturnType<typeof useQueryClient>,
  file: CareerVaultFile,
) {
  qc.setQueryData<CareerVaultFile[] | undefined>(ROOT_KEY, (prev) =>
    prev ? prev.map((f) => (f.id === file.id ? file : f)) : prev,
  );
  qc.setQueryData(["career-vault-file", file.id], file);
  qc.invalidateQueries({ queryKey: versionsKey(file.id) });
}

export function useCreateVersion(retentionLimit: number | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      const result = await careerVaultVersionsRepository.createVersion(input);
      // Retention cleanup happens after the new version is recorded so we
      // only ever remove strictly-older snapshots. If the user hasn't loaded
      // preferences yet we leave all versions in place.
      if (retentionLimit && retentionLimit > 0) {
        await careerVaultVersionsRepository
          .trimToRetentionLimit(input.fileId, retentionLimit)
          .catch(() => undefined);
      }
      return result;
    },
    onSuccess: ({ file }) => {
      invalidateFile(qc, file);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(
        copy.versions.toasts.versionSaved(file.current_version),
      );
    },
    onError: (err: unknown) => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(
        err instanceof Error ? err.message : copy.versions.toasts.saveFailed,
      );
    },
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RestoreVersionInput) =>
      careerVaultVersionsRepository.restoreVersion(input),
    onSuccess: ({ file }) => {
      invalidateFile(qc, file);
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.success(copy.versions.toasts.restored(file.current_version));
    },
    onError: () => {
      const copy = getCareerVaultCopy(useAppStore.getState().language);
      toast.error(copy.versions.toasts.restoreFailed);
    },
  });
}

export function useDeleteVersion(fileId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      careerVaultVersionsRepository.deleteVersion(versionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: versionsKey(fileId) });
    },
  });
}
