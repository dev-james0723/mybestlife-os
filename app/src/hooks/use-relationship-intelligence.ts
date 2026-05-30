"use client";

/**
 * Hooks for the Relationship Intelligence Hub child data: promises,
 * interactions, images, message drafts, and the cached AI report.
 *
 * Follows the existing `use-relationships` conventions (TanStack Query,
 * invalidate-on-settle). Promises are also fetched in aggregate so the page
 * dashboard ("Promise Debt", "Who Needs Me This Week") can reason across the
 * whole network without N queries.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { relationshipInteractionsRepository } from "@/lib/repositories/relationship-interactions";
import { relationshipPromisesRepository } from "@/lib/repositories/relationship-promises";
import { relationshipImagesRepository } from "@/lib/repositories/relationship-images";
import { relationshipMessageDraftsRepository } from "@/lib/repositories/relationship-message-drafts";
import { relationshipAiReportsRepository } from "@/lib/repositories/relationship-ai-reports";
import type {
  RelationshipPromiseInsert,
  RelationshipPromiseUpdate,
  RelationshipInteractionInsert,
  RelationshipImageInsert,
  RelationshipMessageDraftInsert,
} from "@/types/relationship-intelligence";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const ALL_PROMISES_KEY: QueryKey = ["relationship-promises"];
const interactionsKey = (id: string): QueryKey => [
  "relationship-interactions",
  id,
];
const imagesKey = (id: string): QueryKey => ["relationship-images", id];
const draftsKey = (id: string): QueryKey => ["relationship-drafts", id];
const reportKey = (id: string): QueryKey => ["relationship-ai-report", id];

// ---------------------------------------------------------------------------
// Promises
// ---------------------------------------------------------------------------

/** Every promise across the network — powers cards + page dashboard. */
export function useAllRelationshipPromises() {
  return useQuery({
    queryKey: ALL_PROMISES_KEY,
    queryFn: relationshipPromisesRepository.getAll,
  });
}

export function useCreateRelationshipPromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipPromiseInsert) =>
      relationshipPromisesRepository.create(input),
    onSettled: () => qc.invalidateQueries({ queryKey: ALL_PROMISES_KEY }),
  });
}

export function useUpdateRelationshipPromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RelationshipPromiseUpdate }) =>
      relationshipPromisesRepository.update(id, data),
    onSettled: () => qc.invalidateQueries({ queryKey: ALL_PROMISES_KEY }),
  });
}

export function useDeleteRelationshipPromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => relationshipPromisesRepository.delete(id),
    onSettled: () => qc.invalidateQueries({ queryKey: ALL_PROMISES_KEY }),
  });
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export function useRelationshipInteractions(relationshipId: string | null) {
  return useQuery({
    queryKey: interactionsKey(relationshipId ?? "none"),
    queryFn: () =>
      relationshipInteractionsRepository.getByRelationship(relationshipId!),
    enabled: Boolean(relationshipId),
  });
}

export function useCreateRelationshipInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipInteractionInsert) =>
      relationshipInteractionsRepository.create(input),
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: interactionsKey(input.relationship_id) });
    },
  });
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export function useRelationshipImages(relationshipId: string | null) {
  return useQuery({
    queryKey: imagesKey(relationshipId ?? "none"),
    queryFn: () =>
      relationshipImagesRepository.getByRelationship(relationshipId!),
    enabled: Boolean(relationshipId),
  });
}

export function useCreateRelationshipImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipImageInsert) =>
      relationshipImagesRepository.create(input),
    onSettled: (_data, _err, input) =>
      qc.invalidateQueries({ queryKey: imagesKey(input.relationship_id) }),
  });
}

export function useDeleteRelationshipImage(relationshipId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => relationshipImagesRepository.delete(id),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: imagesKey(relationshipId ?? "none") }),
  });
}

// ---------------------------------------------------------------------------
// Message drafts
// ---------------------------------------------------------------------------

export function useRelationshipDrafts(relationshipId: string | null) {
  return useQuery({
    queryKey: draftsKey(relationshipId ?? "none"),
    queryFn: () =>
      relationshipMessageDraftsRepository.getByRelationship(relationshipId!),
    enabled: Boolean(relationshipId),
  });
}

export function useCreateRelationshipDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RelationshipMessageDraftInsert) =>
      relationshipMessageDraftsRepository.create(input),
    onSettled: (_data, _err, input) =>
      qc.invalidateQueries({ queryKey: draftsKey(input.relationship_id) }),
  });
}

// ---------------------------------------------------------------------------
// AI report (cached)
// ---------------------------------------------------------------------------

export function useRelationshipAiReport(relationshipId: string | null) {
  return useQuery({
    queryKey: reportKey(relationshipId ?? "none"),
    queryFn: () =>
      relationshipAiReportsRepository.getByRelationship(relationshipId!),
    enabled: Boolean(relationshipId),
  });
}

export function relationshipAiReportKey(relationshipId: string): QueryKey {
  return reportKey(relationshipId);
}
