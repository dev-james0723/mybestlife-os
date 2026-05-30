/**
 * Relationship interactions repository — logged touchpoints with a person.
 * Follows the `relationshipsRepository` conventions (explicit SELECT columns,
 * mapRow coercion, PATCH-style payloads).
 */

import { createClient } from "@/lib/supabase/client";
import type { RelationshipInteraction, Json } from "@/types/database";
import type { RelationshipInteractionInsert } from "@/types/relationship-intelligence";

const SELECT_COLUMNS = [
  "id",
  "user_id",
  "relationship_id",
  "interaction_date",
  "interaction_type",
  "raw_note",
  "summary",
  "extracted_json",
  "created_at",
  "updated_at",
].join(", ");

function mapRow(row: Record<string, unknown>): RelationshipInteraction {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    relationship_id: String(row.relationship_id),
    interaction_date: String(row.interaction_date),
    interaction_type: String(row.interaction_type ?? "other"),
    raw_note: String(row.raw_note ?? ""),
    summary: String(row.summary ?? ""),
    extracted_json: (row.extracted_json as Json | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const relationshipInteractionsRepository = {
  async getByRelationship(
    relationshipId: string,
  ): Promise<RelationshipInteraction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_interactions")
      .select(SELECT_COLUMNS)
      .eq("relationship_id", relationshipId)
      .order("interaction_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as unknown as Record<string, unknown>));
  },

  async create(
    input: RelationshipInteractionInsert,
  ): Promise<RelationshipInteraction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_interactions")
      .insert({
        relationship_id: input.relationship_id,
        interaction_date: input.interaction_date,
        interaction_type: input.interaction_type,
        raw_note: input.raw_note,
        summary: input.summary,
        extracted_json: input.extracted_json ?? null,
      })
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("relationship_interactions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
