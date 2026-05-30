"use client";

/**
 * React Query hooks for the Asset Intelligence Hub evidence layer
 * (asset images + linked documents). Query keys are scoped per asset so a
 * single asset's media can be refetched without touching the whole list.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assetImagesRepository,
  assetDocumentsRepository,
  type CreateAssetImageInput,
  type CreateAssetDocumentInput,
} from "@/lib/repositories/asset-media";
import type { AssetDocumentRole } from "@/types/asset-intelligence";

export const assetImagesKey = (assetId: string) =>
  ["asset-images", assetId] as const;
export const assetDocumentsKey = (assetId: string) =>
  ["asset-documents", assetId] as const;

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

/** All primary images for the current user, keyed by `asset_id`. */
export function usePrimaryAssetImages() {
  return useQuery({
    queryKey: ["asset-images", "primary-all"] as const,
    queryFn: async () => {
      const rows = await assetImagesRepository.listPrimaryForUser();
      const map = new Map<string, string>();
      for (const row of rows) map.set(row.asset_id, row.image_url);
      return map;
    },
  });
}

export function useAssetImages(assetId: string | null) {
  return useQuery({
    queryKey: assetImagesKey(assetId ?? "none"),
    queryFn: () => assetImagesRepository.listForAsset(assetId as string),
    enabled: Boolean(assetId),
  });
}

export function useCreateAssetImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetImageInput) =>
      assetImagesRepository.create(input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: assetImagesKey(vars.asset_id) });
    },
  });
}

export function useSetPrimaryAssetImage(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      assetImagesRepository.setPrimary(assetId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetImagesKey(assetId) });
    },
  });
}

export function useDeleteAssetImage(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => assetImagesRepository.delete(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetImagesKey(assetId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export function useAssetDocuments(assetId: string | null) {
  return useQuery({
    queryKey: assetDocumentsKey(assetId ?? "none"),
    queryFn: () => assetDocumentsRepository.listForAsset(assetId as string),
    enabled: Boolean(assetId),
  });
}

export function useCreateAssetDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAssetDocumentInput) =>
      assetDocumentsRepository.create(input),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: assetDocumentsKey(vars.asset_id),
      });
    },
  });
}

export function useUpdateAssetDocumentRole(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: AssetDocumentRole }) =>
      assetDocumentsRepository.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetDocumentsKey(assetId) });
    },
  });
}

export function useDeleteAssetDocument(assetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => assetDocumentsRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetDocumentsKey(assetId) });
    },
  });
}
