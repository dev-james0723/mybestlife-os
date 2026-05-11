/**
 * Relationships repository — thin Supabase wrapper for the redesigned
 * personal-CRM table (see migration 20260419140000_relationships_redesign).
 *
 * Conventions match `roleModelsRepository`:
 *   - Explicit SELECT columns (vs `*`) so the wire shape is locked.
 *   - `mapRow` coerces the loose `Record<string, unknown>` from supabase-js
 *     into the strict `Relationship` shape, normalizing nulls & arrays.
 *   - `buildPayload` only forwards keys the caller actually provided, so a
 *     PATCH-style update never accidentally clears a column.
 */

import { createClient } from "@/lib/supabase/client";
import type { Relationship } from "@/types/database";
import type {
  RelationshipInsert,
  RelationshipUpdate,
} from "@/types/relationship";

const SELECT_COLUMNS = [
  "id",
  "user_id",
  "person_name",
  "photo_url",
  "category",
  "relationship_strength",
  "email",
  "phone",
  "last_contact_date",
  "last_interaction_notes",
  "next_action",
  "next_action_date",
  "commitments_made",
  "preferences_and_details",
  "general_notes",
  "tags",
  "linked_project_id",
  "is_favorite",
  "created_at",
  "updated_at",
].join(", ");

function mapRow(row: Record<string, unknown>): Relationship {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    person_name: String(row.person_name ?? ""),
    photo_url: (row.photo_url as string | null) ?? null,
    category: String(row.category ?? "other"),
    relationship_strength: String(row.relationship_strength ?? "new"),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    last_contact_date: (row.last_contact_date as string | null) ?? null,
    last_interaction_notes:
      (row.last_interaction_notes as string | null) ?? null,
    next_action: (row.next_action as string | null) ?? null,
    next_action_date: (row.next_action_date as string | null) ?? null,
    commitments_made: (row.commitments_made as string | null) ?? null,
    preferences_and_details:
      (row.preferences_and_details as string | null) ?? null,
    general_notes: (row.general_notes as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    linked_project_id: (row.linked_project_id as string | null) ?? null,
    is_favorite: Boolean(row.is_favorite),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/** Forward only the keys the caller actually set. */
function buildPayload(
  input: Partial<RelationshipInsert>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.person_name !== undefined) out.person_name = input.person_name;
  if (input.photo_url !== undefined) out.photo_url = input.photo_url;
  if (input.category !== undefined) out.category = input.category;
  if (input.relationship_strength !== undefined)
    out.relationship_strength = input.relationship_strength;
  if (input.email !== undefined) out.email = input.email;
  if (input.phone !== undefined) out.phone = input.phone;
  if (input.last_contact_date !== undefined)
    out.last_contact_date = input.last_contact_date;
  if (input.last_interaction_notes !== undefined)
    out.last_interaction_notes = input.last_interaction_notes;
  if (input.next_action !== undefined) out.next_action = input.next_action;
  if (input.next_action_date !== undefined)
    out.next_action_date = input.next_action_date;
  if (input.commitments_made !== undefined)
    out.commitments_made = input.commitments_made;
  if (input.preferences_and_details !== undefined)
    out.preferences_and_details = input.preferences_and_details;
  if (input.general_notes !== undefined)
    out.general_notes = input.general_notes;
  if (input.tags !== undefined) out.tags = input.tags;
  if (input.linked_project_id !== undefined)
    out.linked_project_id = input.linked_project_id;
  if (input.is_favorite !== undefined) out.is_favorite = input.is_favorite;
  return out;
}

export const relationshipsRepository = {
  async getAll(): Promise<Relationship[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationships")
      .select(SELECT_COLUMNS)
      // Server-side sort is just a stable seed — the gallery applies its
      // own client-side sort (lastContactDate desc → person_name asc) via
      // useMemo. Ordering by created_at keeps the cache deterministic.
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) =>
      mapRow(row as unknown as Record<string, unknown>),
    );
  },

  async getById(id: string): Promise<Relationship> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationships")
      .select(SELECT_COLUMNS)
      .eq("id", id)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async create(input: RelationshipInsert): Promise<Relationship> {
    const supabase = createClient();
    const payload = buildPayload(input);

    // Defaults the DB also enforces — surfaced here so optimistic snapshots
    // don't have to know about server-side defaults.
    if (input.tags === undefined) payload.tags = [];
    if (input.relationship_strength === undefined)
      payload.relationship_strength = "new";
    if (input.is_favorite === undefined) payload.is_favorite = false;

    const { data, error } = await supabase
      .from("relationships")
      .insert(payload)
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async update(id: string, input: RelationshipUpdate): Promise<Relationship> {
    const supabase = createClient();
    const payload = buildPayload(input);
    // updated_at is also maintained by trg_relationships_updated_at, but
    // setting it client-side keeps optimistic snapshots in sync with what
    // the server will write.
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("relationships")
      .update(payload)
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async toggleFavorite(id: string, next: boolean): Promise<Relationship> {
    return this.update(id, { is_favorite: next });
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("relationships")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
