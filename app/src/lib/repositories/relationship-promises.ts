/**
 * Relationship promises repository — tracked commitments ("Promise Keeper").
 */

import { createClient } from "@/lib/supabase/client";
import type { RelationshipPromise } from "@/types/database";
import type {
  RelationshipPromiseInsert,
  RelationshipPromiseUpdate,
} from "@/types/relationship-intelligence";

const SELECT_COLUMNS = [
  "id",
  "user_id",
  "relationship_id",
  "promise_text",
  "due_date",
  "status",
  "source_interaction_id",
  "created_at",
  "updated_at",
].join(", ");

function mapRow(row: Record<string, unknown>): RelationshipPromise {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    relationship_id: String(row.relationship_id),
    promise_text: String(row.promise_text ?? ""),
    due_date: (row.due_date as string | null) ?? null,
    status: String(row.status ?? "open"),
    source_interaction_id: (row.source_interaction_id as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const relationshipPromisesRepository = {
  /** All promises for the current user, across every relationship. */
  async getAll(): Promise<RelationshipPromise[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_promises")
      .select(SELECT_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as unknown as Record<string, unknown>));
  },

  async create(input: RelationshipPromiseInsert): Promise<RelationshipPromise> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_promises")
      .insert({
        relationship_id: input.relationship_id,
        promise_text: input.promise_text,
        due_date: input.due_date ?? null,
        status: input.status ?? "open",
        source_interaction_id: input.source_interaction_id ?? null,
      })
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async update(
    id: string,
    input: RelationshipPromiseUpdate,
  ): Promise<RelationshipPromise> {
    const supabase = createClient();
    const payload: Record<string, unknown> = {};
    if (input.promise_text !== undefined) payload.promise_text = input.promise_text;
    if (input.due_date !== undefined) payload.due_date = input.due_date;
    if (input.status !== undefined) payload.status = input.status;
    const { data, error } = await supabase
      .from("relationship_promises")
      .update(payload)
      .eq("id", id)
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("relationship_promises")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
