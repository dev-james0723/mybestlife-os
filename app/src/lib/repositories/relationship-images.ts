/**
 * Relationship images repository — the multi-image memory layer
 * (profile photo / 合照 / event photo / business card / screenshot / …).
 */

import { createClient } from "@/lib/supabase/client";
import type { RelationshipImage, Json } from "@/types/database";
import type { RelationshipImageInsert } from "@/types/relationship-intelligence";

const SELECT_COLUMNS = [
  "id",
  "user_id",
  "relationship_id",
  "image_url",
  "image_type",
  "caption",
  "ai_caption",
  "event_date",
  "location",
  "related_project_id",
  "is_primary",
  "extracted_json",
  "created_at",
  "updated_at",
].join(", ");

function mapRow(row: Record<string, unknown>): RelationshipImage {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    relationship_id: String(row.relationship_id),
    image_url: String(row.image_url ?? ""),
    image_type: String(row.image_type ?? "memory_photo"),
    caption: (row.caption as string | null) ?? null,
    ai_caption: (row.ai_caption as string | null) ?? null,
    event_date: (row.event_date as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    related_project_id: (row.related_project_id as string | null) ?? null,
    is_primary: Boolean(row.is_primary),
    extracted_json: (row.extracted_json as Json | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export const relationshipImagesRepository = {
  async getByRelationship(
    relationshipId: string,
  ): Promise<RelationshipImage[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_images")
      .select(SELECT_COLUMNS)
      .eq("relationship_id", relationshipId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as unknown as Record<string, unknown>));
  },

  async create(input: RelationshipImageInsert): Promise<RelationshipImage> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_images")
      .insert({
        relationship_id: input.relationship_id,
        image_url: input.image_url,
        image_type: input.image_type,
        caption: input.caption ?? null,
        ai_caption: input.ai_caption ?? null,
        event_date: input.event_date ?? null,
        location: input.location ?? null,
        related_project_id: input.related_project_id ?? null,
        is_primary: input.is_primary ?? false,
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
      .from("relationship_images")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
