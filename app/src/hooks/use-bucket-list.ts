"use client";

import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  bucketDreamAiReportsRepository,
  bucketDreamImagesRepository,
  bucketFlightQuotesRepository,
  bucketIntegrationsRepository,
  bucketItemsRepository,
  bucketReflectionsRepository,
  bucketSettingsRepository,
  runBucketListSeed,
  type CreateBucketReflectionInput,
  type CreateDreamImageInput,
  type RecordFlightQuoteInput,
  type UploadDreamImageInput,
  type UpsertIntegrationInput,
} from "@/lib/repositories/bucket-list";
import type {
  BucketDreamImageRecord,
  BucketHighlights,
  BucketItem,
  BucketStats,
  CreateBucketItemInput,
  UpdateBucketItemInput,
} from "@/types/bucket-list";

// ─── Keys ─────────────────────────────────────────────────────────────────────

export const bucketQueryKeys = {
  all: ["bucket-list"] as const,
  items: () => ["bucket-list", "items"] as const,
  item: (id: string) => ["bucket-list", "item", id] as const,
  integrations: (bucketId: string) =>
    ["bucket-list", "integrations", bucketId] as const,
  reflections: (bucketId: string) =>
    ["bucket-list", "reflections", bucketId] as const,
  images: (bucketId: string) =>
    ["bucket-list", "images", bucketId] as const,
  report: (bucketId: string) =>
    ["bucket-list", "report", bucketId] as const,
  flightLatest: (bucketId: string) =>
    ["bucket-list", "flight", bucketId, "latest"] as const,
  flightHistory: (bucketId: string) =>
    ["bucket-list", "flight", bucketId, "history"] as const,
  settings: () => ["bucket-list", "settings"] as const,
};

// ─── Items ────────────────────────────────────────────────────────────────────

export function useBucketItems() {
  return useQuery({
    queryKey: bucketQueryKeys.items(),
    queryFn: bucketItemsRepository.getAll,
  });
}

export function useBucketItem(id: string | null | undefined) {
  return useQuery({
    queryKey: id ? bucketQueryKeys.item(id) : bucketQueryKeys.item("__none"),
    queryFn: () => {
      if (!id) throw new Error("Missing bucket item id");
      return bucketItemsRepository.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function useCreateBucketItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBucketItemInput) =>
      bucketItemsRepository.create(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      qc.setQueryData(bucketQueryKeys.item(data.id), data);
      toast.success("Dream captured", {
        description: data.title,
      });
    },
    onError: () => {
      toast.error("Could not save that dream");
    },
  });
}

export function useUpdateBucketItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBucketItemInput }) =>
      bucketItemsRepository.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      qc.setQueryData(bucketQueryKeys.item(data.id), data);
    },
    onError: () => {
      toast.error("Could not update that dream");
    },
  });
}

export function useDeleteBucketItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bucketItemsRepository.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      toast.success("Dream archived");
    },
    onError: () => {
      toast.error("Could not delete that dream");
    },
  });
}

export function useMarkBucketCompleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bucketItemsRepository.markCompleted(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      qc.setQueryData(bucketQueryKeys.item(data.id), data);
      toast.success("Dream realized", {
        description: "It's a memory now.",
      });
    },
  });
}

// ─── First-visit seed ─────────────────────────────────────────────────────────

export function useRunBucketSeedOnce() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: runBucketListSeed,
    onSuccess: (count) => {
      if (count > 0) {
        qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      }
    },
  });
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export function useBucketIntegrations(bucketId: string | null | undefined) {
  return useQuery({
    queryKey: bucketId
      ? bucketQueryKeys.integrations(bucketId)
      : bucketQueryKeys.integrations("__none"),
    queryFn: () => {
      if (!bucketId) return [];
      return bucketIntegrationsRepository.listForBucket(bucketId);
    },
    enabled: Boolean(bucketId),
  });
}

export function useUpsertBucketIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertIntegrationInput) =>
      bucketIntegrationsRepository.upsert(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.integrations(variables.bucket_item_id),
      });
    },
  });
}

export function useDeleteBucketIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; bucketItemId: string }) =>
      bucketIntegrationsRepository.remove(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.integrations(variables.bucketItemId),
      });
    },
  });
}

// ─── Reflections ──────────────────────────────────────────────────────────────

export function useBucketReflections(bucketId: string | null | undefined) {
  return useQuery({
    queryKey: bucketId
      ? bucketQueryKeys.reflections(bucketId)
      : bucketQueryKeys.reflections("__none"),
    queryFn: () => {
      if (!bucketId) return [];
      return bucketReflectionsRepository.listForBucket(bucketId);
    },
    enabled: Boolean(bucketId),
  });
}

export function useCreateBucketReflection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBucketReflectionInput) =>
      bucketReflectionsRepository.create(input),
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.reflections(data.bucket_item_id),
      });
      toast.success("Reflection saved");
    },
  });
}

// ─── Dream images (gallery) ─────────────────────────────────────────────────────

export function useDreamImages(bucketId: string | null | undefined) {
  return useQuery({
    queryKey: bucketId
      ? bucketQueryKeys.images(bucketId)
      : bucketQueryKeys.images("__none"),
    queryFn: () => {
      if (!bucketId) return [];
      return bucketDreamImagesRepository.listForBucket(bucketId);
    },
    enabled: Boolean(bucketId),
  });
}

/** Invalidate the image gallery plus the item/items so a synced cover repaints. */
function invalidateImagesAndItem(
  qc: ReturnType<typeof useQueryClient>,
  bucketItemId: string,
) {
  qc.invalidateQueries({ queryKey: bucketQueryKeys.images(bucketItemId) });
  qc.invalidateQueries({ queryKey: bucketQueryKeys.item(bucketItemId) });
  qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
}

export function useUploadDreamImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDreamImageInput) =>
      bucketDreamImagesRepository.upload(input),
    onSuccess: (data) => {
      invalidateImagesAndItem(qc, data.bucket_item_id);
      toast.success("Image added");
    },
    onError: () => toast.error("Could not upload that image"),
  });
}

export function useCreateDreamImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDreamImageInput) =>
      bucketDreamImagesRepository.create(input),
    onSuccess: (data) => invalidateImagesAndItem(qc, data.bucket_item_id),
    onError: () => toast.error("Could not add that image"),
  });
}

export function useUpdateDreamImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      bucketItemId: string;
      data: Parameters<typeof bucketDreamImagesRepository.update>[1];
    }) => bucketDreamImagesRepository.update(id, data),
    onSuccess: (_data, variables) =>
      invalidateImagesAndItem(qc, variables.bucketItemId),
  });
}

export function useDeleteDreamImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (image: BucketDreamImageRecord) =>
      bucketDreamImagesRepository.remove(image),
    onSuccess: (_data, image) => {
      invalidateImagesAndItem(qc, image.bucket_item_id);
      toast.success("Image removed");
    },
    onError: () => toast.error("Could not remove that image"),
  });
}

export function useSetPrimaryDreamImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (image: BucketDreamImageRecord) =>
      bucketDreamImagesRepository.setPrimary(image),
    onSuccess: (_data, image) => {
      invalidateImagesAndItem(qc, image.bucket_item_id);
      toast.success("Cover updated");
    },
    onError: () => toast.error("Could not set that cover"),
  });
}

// ─── Dream intelligence report (cached) ─────────────────────────────────────────

export function useDreamReport(bucketId: string | null | undefined) {
  return useQuery({
    queryKey: bucketId
      ? bucketQueryKeys.report(bucketId)
      : bucketQueryKeys.report("__none"),
    queryFn: () => {
      if (!bucketId) return null;
      return bucketDreamAiReportsRepository.getForBucket(bucketId);
    },
    enabled: Boolean(bucketId),
  });
}

// ─── Flight quotes ────────────────────────────────────────────────────────────

export function useLatestFlightQuote(bucketId: string | null | undefined) {
  return useQuery({
    queryKey: bucketId
      ? bucketQueryKeys.flightLatest(bucketId)
      : bucketQueryKeys.flightLatest("__none"),
    queryFn: () => {
      if (!bucketId) return null;
      return bucketFlightQuotesRepository.latestForBucket(bucketId);
    },
    enabled: Boolean(bucketId),
  });
}

export function useRecordFlightQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecordFlightQuoteInput) =>
      bucketFlightQuotesRepository.record(input),
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.flightLatest(data.bucket_item_id),
      });
      qc.invalidateQueries({
        queryKey: bucketQueryKeys.flightHistory(data.bucket_item_id),
      });
    },
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function useBucketSettings() {
  return useQuery({
    queryKey: bucketQueryKeys.settings(),
    queryFn: bucketSettingsRepository.getOrCreate,
  });
}

export function useUpdateBucketSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bucketSettingsRepository.update,
    onSuccess: (data) => {
      qc.setQueryData(bucketQueryKeys.settings(), data);
    },
  });
}

export function useClearBucketSeeds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: bucketSettingsRepository.markSeedsCleared,
    onSuccess: (data) => {
      qc.setQueryData(bucketQueryKeys.settings(), data);
      qc.invalidateQueries({ queryKey: bucketQueryKeys.items() });
      toast.success("Seed dreams cleared");
    },
  });
}

// ─── Derived stats + highlights ───────────────────────────────────────────────

export function useBucketStats(items: BucketItem[] | undefined): BucketStats {
  return useMemo(() => {
    const list = items ?? [];
    return {
      total: list.length,
      completed: list.filter((b) => b.status === "completed").length,
      active: list.filter(
        (b) =>
          b.status === "active" ||
          b.status === "planning" ||
          b.status === "exploring",
      ).length,
      funded: list.filter(
        (b) => b.status === "funded" || b.status === "scheduled" || b.status === "booked",
      ).length,
      dreaming: list.filter((b) => b.status === "dreaming").length,
    };
  }, [items]);
}

function msFromNow(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const t = new Date(isoDate).getTime();
  if (Number.isNaN(t)) return null;
  return t - Date.now();
}

export function useBucketHighlights(
  items: BucketItem[] | undefined,
): BucketHighlights {
  return useMemo(() => {
    const list = (items ?? []).filter((b) => b.status !== "archived");
    const notDone = list.filter((b) => b.status !== "completed");

    // Closest to reality: uses target_date (soonest upcoming, non-past).
    const withTarget = notDone
      .filter((b) => b.target_date || b.target_month)
      .map((b) => {
        const iso = b.target_date
          ? b.target_date
          : b.target_month
            ? `${b.target_month}-01`
            : null;
        return { item: b, due: iso ? msFromNow(iso) : null };
      })
      .filter((x) => x.due !== null && x.due! > 0)
      .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
    const closestToReality = withTarget[0]?.item ?? null;

    // Push this week: featured OR high-priority + active/planning.
    const pushCandidates = notDone
      .filter(
        (b) =>
          b.is_featured ||
          b.priority === "high" ||
          b.status === "active" ||
          b.status === "planning",
      )
      .sort((a, b) => {
        const af = a.is_featured ? 0 : 1;
        const bf = b.is_featured ? 0 : 1;
        if (af !== bf) return af - bf;
        const scoreStatus = (s: BucketItem["status"]) =>
          s === "active" ? 0 : s === "planning" ? 1 : 2;
        return scoreStatus(a.status) - scoreStatus(b.status);
      });
    const pushThisWeek =
      pushCandidates.find((b) => b.id !== closestToReality?.id) ??
      pushCandidates[0] ??
      null;

    // Latest completion.
    const completed = list
      .filter((b) => b.status === "completed" && b.completed_at)
      .sort((a, b) =>
        (b.completed_at ?? "").localeCompare(a.completed_at ?? ""),
      );
    const latestCompletion = completed[0] ?? null;

    // Travel deal: travel item with latest_live_price within the exploratory band.
    const travelDeal =
      list
        .filter(
          (b) =>
            b.type === "travel" &&
            b.flight_watch_enabled &&
            b.latest_live_price != null,
        )
        .sort((a, b) => (a.latest_live_price ?? 0) - (b.latest_live_price ?? 0))[0] ??
      null;

    return { closestToReality, pushThisWeek, latestCompletion, travelDeal };
  }, [items]);
}
