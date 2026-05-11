"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  careerRepository,
  type CreateCareerAssetInput,
  type UpdateCareerAssetInput,
} from "@/lib/repositories/career";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

export function useCareerAssets() {
  return useQuery({
    queryKey: ["career-assets"],
    queryFn: careerRepository.getAll,
  });
}

export function useCareerAsset(id: string) {
  return useQuery({
    queryKey: ["career-assets", id],
    queryFn: () => careerRepository.getById(id),
    enabled: !!id,
  });
}

export function useCreateCareerAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCareerAssetInput) => careerRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-assets"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.career;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.career;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateCareerAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCareerAssetInput }) =>
      careerRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-assets"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.career;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.career;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteCareerAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => careerRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["career-assets"] });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.career;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.career;
      toast.error(ui.deleteFailed);
    },
  });
}
