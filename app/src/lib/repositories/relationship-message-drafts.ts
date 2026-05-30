/**
 * Relationship message drafts repository — generated follow-up drafts.
 * Drafts are NEVER auto-sent; this only stores text the user can copy/edit.
 */

import { createClient } from "@/lib/supabase/client";
import type { RelationshipMessageDraft } from "@/types/database";
import type { RelationshipMessageDraftInsert } from "@/types/relationship-intelligence";

const SELECT_COLUMNS = [
  "id",
  "user_id",
  "relationship_id",
  "purpose",
  "tone",
  "language",
  "subject",
  "body",
  "status",
  "created_at",
].join(", ");

function mapRow(row: Record<string, unknown>): RelationshipMessageDraft {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    relationship_id: String(row.relationship_id),
    purpose: String(row.purpose ?? "follow_up"),
    tone: String(row.tone ?? "warm"),
    language: String(row.language ?? "en"),
    subject: (row.subject as string | null) ?? null,
    body: String(row.body ?? ""),
    status: String(row.status ?? "draft"),
    created_at: String(row.created_at),
  };
}

export const relationshipMessageDraftsRepository = {
  async getByRelationship(
    relationshipId: string,
  ): Promise<RelationshipMessageDraft[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_message_drafts")
      .select(SELECT_COLUMNS)
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as unknown as Record<string, unknown>));
  },

  async create(
    input: RelationshipMessageDraftInsert,
  ): Promise<RelationshipMessageDraft> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_message_drafts")
      .insert({
        relationship_id: input.relationship_id,
        purpose: input.purpose,
        tone: input.tone,
        language: input.language,
        subject: input.subject ?? null,
        body: input.body,
        status: input.status ?? "draft",
      })
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("relationship_message_drafts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
