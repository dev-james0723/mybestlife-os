"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assetsRepository,
  type CreateAssetInput,
  type UpdateAssetInput,
} from "@/lib/repositories/assets";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import type { Asset } from "@/types/assets";

const ASSETS_QUERY_KEY = ["assets"] as const;

export function useAssets() {
  return useQuery({
    queryKey: ASSETS_QUERY_KEY,
    queryFn: assetsRepository.getAll,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetInput) => assetsRepository.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.success(ui.created);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.error(ui.createFailed);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssetInput }) =>
      assetsRepository.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.success(ui.updated);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.error(ui.updateFailed);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.success(ui.deleted);
    },
    onError: () => {
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.error(ui.deleteFailed);
    },
  });
}

/**
 * Optimistic favorite toggle.
 *
 * - onMutate: snapshot current list, patch `is_favorite` locally so the star
 *   flips instantly.
 * - onError: restore the snapshot and surface a toast.
 * - onSettled: refetch to reconcile with server truth.
 *
 * No success toast: a favorite star flip is a high-frequency, low-value
 * action — a toast would be noisy.
 */
export function useToggleAssetFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      assetsRepository.setFavorite(id, value),

    onMutate: async ({ id, value }) => {
      await queryClient.cancelQueries({ queryKey: ASSETS_QUERY_KEY });
      const previous = queryClient.getQueryData<Asset[]>(ASSETS_QUERY_KEY);

      if (previous) {
        queryClient.setQueryData<Asset[]>(
          ASSETS_QUERY_KEY,
          previous.map((a) =>
            a.id === id ? { ...a, is_favorite: value } : a,
          ),
        );
      }

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData<Asset[]>(ASSETS_QUERY_KEY, ctx.previous);
      }
      const ui = getMiscUiCopy(useAppStore.getState().language).toasts.assets;
      toast.error(ui.favoriteFailed);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ASSETS_QUERY_KEY });
    },
  });
}
