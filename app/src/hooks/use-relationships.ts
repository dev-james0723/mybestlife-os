"use client";

/**
 * Relationships hook — optimistic CRUD against the redesigned table.
 *
 * Why optimistic?
 *   The Relationship sub-tab is a gallery the user scans and acts on
 *   quickly (toggle favorite, log next contact, delete). Round-trip
 *   latency is visible in this layout, so every mutation immediately
 *   updates the local cache and rolls back on error. Pattern follows
 *   the React Query "context-with-snapshot" recipe.
 *
 * Toasts:
 *   - create / update / delete → success + failure toasts (i18n).
 *   - toggleFavorite → silent on success (the star animates instead);
 *     failure still toasts so the user knows the change didn't persist.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { relationshipsRepository } from "@/lib/repositories/relationships";
import type { Relationship } from "@/types/database";
import type {
  RelationshipInsert,
  RelationshipUpdate,
} from "@/types/relationship";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";
import { useAppStore } from "@/stores/app-store";

const RELATIONSHIPS_QUERY_KEY: QueryKey = ["relationships"];

function getToastCopy() {
  return getMiscUiCopy(useAppStore.getState().language).toasts.relationships;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useRelationships() {
  return useQuery({
    queryKey: RELATIONSHIPS_QUERY_KEY,
    queryFn: relationshipsRepository.getAll,
  });
}

// ---------------------------------------------------------------------------
// Create
//
// Optimistic strategy: insert a temporary row with a `temp-{uuid}` id at
// the head of the cache. On success, refetch (invalidate) so the temp
// row is replaced by the canonical server row. On failure, restore the
// cache from the snapshot we took in onMutate.
// ---------------------------------------------------------------------------

type CreateContext = {
  previous: Relationship[] | undefined;
  tempId: string;
};

function buildOptimisticRelationship(
  input: RelationshipInsert,
  tempId: string,
): Relationship {
  const now = new Date().toISOString();
  return {
    id: tempId,
    user_id: input.user_id ?? "",
    person_name: input.person_name,
    photo_url: input.photo_url ?? null,
    category: input.category,
    relationship_strength: input.relationship_strength ?? "new",
    email: input.email ?? null,
    phone: input.phone ?? null,
    last_contact_date: input.last_contact_date ?? null,
    last_interaction_notes: input.last_interaction_notes ?? null,
    next_action: input.next_action ?? null,
    next_action_date: input.next_action_date ?? null,
    commitments_made: input.commitments_made ?? null,
    preferences_and_details: input.preferences_and_details ?? null,
    general_notes: input.general_notes ?? null,
    tags: input.tags ?? [],
    linked_project_id: input.linked_project_id ?? null,
    is_favorite: input.is_favorite ?? false,
    created_at: now,
    updated_at: now,
  };
}

export function useCreateRelationship() {
  const queryClient = useQueryClient();
  return useMutation<Relationship, Error, RelationshipInsert, CreateContext>({
    mutationFn: (input) => relationshipsRepository.create(input),
    async onMutate(input) {
      await queryClient.cancelQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
      const previous = queryClient.getQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
      );
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic = buildOptimisticRelationship(input, tempId);
      queryClient.setQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
        (current) => [optimistic, ...(current ?? [])],
      );
      return { previous, tempId };
    },
    onError(_err, _input, context) {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(RELATIONSHIPS_QUERY_KEY, context.previous);
      }
      toast.error(getToastCopy().createFailed);
    },
    onSuccess() {
      toast.success(getToastCopy().created);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

type UpdateVars = { id: string; data: RelationshipUpdate };
type UpdateContext = { previous: Relationship[] | undefined };

function applyUpdate(
  current: Relationship,
  patch: RelationshipUpdate,
): Relationship {
  return {
    ...current,
    ...patch,
    // Preserve key types when patch sets explicit nulls — the spread
    // above already handles this; we just bump updated_at to reflect
    // what the server will write.
    updated_at: new Date().toISOString(),
  };
}

export function useUpdateRelationship() {
  const queryClient = useQueryClient();
  return useMutation<Relationship, Error, UpdateVars, UpdateContext>({
    mutationFn: ({ id, data }) => relationshipsRepository.update(id, data),
    async onMutate({ id, data }) {
      await queryClient.cancelQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
      const previous = queryClient.getQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
      );
      queryClient.setQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
        (current) =>
          (current ?? []).map((r) => (r.id === id ? applyUpdate(r, data) : r)),
      );
      return { previous };
    },
    onError(_err, _vars, context) {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(RELATIONSHIPS_QUERY_KEY, context.previous);
      }
      toast.error(getToastCopy().updateFailed);
    },
    onSuccess() {
      toast.success(getToastCopy().updated);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Toggle favorite (silent variant of update)
//
// Same optimistic shape as useUpdateRelationship, but suppresses the
// success toast — the visible animation on the card star is feedback
// enough. Failure still toasts so the user notices a sync gap.
// ---------------------------------------------------------------------------

type ToggleFavoriteVars = { id: string; next: boolean };

export function useToggleRelationshipFavorite() {
  const queryClient = useQueryClient();
  return useMutation<Relationship, Error, ToggleFavoriteVars, UpdateContext>({
    mutationFn: ({ id, next }) =>
      relationshipsRepository.toggleFavorite(id, next),
    async onMutate({ id, next }) {
      await queryClient.cancelQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
      const previous = queryClient.getQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
      );
      queryClient.setQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
        (current) =>
          (current ?? []).map((r) =>
            r.id === id ? { ...r, is_favorite: next } : r,
          ),
      );
      return { previous };
    },
    onError(_err, _vars, context) {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(RELATIONSHIPS_QUERY_KEY, context.previous);
      }
      toast.error(getToastCopy().updateFailed);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
    },
  });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

type DeleteContext = { previous: Relationship[] | undefined };

export function useDeleteRelationship() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string, DeleteContext>({
    mutationFn: (id) => relationshipsRepository.delete(id),
    async onMutate(id) {
      await queryClient.cancelQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
      const previous = queryClient.getQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
      );
      queryClient.setQueryData<Relationship[]>(
        RELATIONSHIPS_QUERY_KEY,
        (current) => (current ?? []).filter((r) => r.id !== id),
      );
      return { previous };
    },
    onError(_err, _id, context) {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(RELATIONSHIPS_QUERY_KEY, context.previous);
      }
      toast.error(getToastCopy().deleteFailed);
    },
    onSuccess() {
      toast.success(getToastCopy().deleted);
    },
    onSettled() {
      queryClient.invalidateQueries({ queryKey: RELATIONSHIPS_QUERY_KEY });
    },
  });
}
