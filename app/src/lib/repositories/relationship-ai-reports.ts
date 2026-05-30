/**
 * Relationship AI reports repository — cached intelligence reports (one per
 * relationship). We persist so the modal doesn't regenerate on every open
 * (spec §24).
 */

import { createClient } from "@/lib/supabase/client";
import type { RelationshipAiReport, Json } from "@/types/database";
import type { RelationshipIntelligenceReport } from "@/types/relationship-intelligence";

const SELECT_COLUMNS = [
  "id",
  "user_id",
  "relationship_id",
  "report_json",
  "model_used",
  "input_hash",
  "generated_at",
  "updated_at",
].join(", ");

function mapRow(row: Record<string, unknown>): RelationshipAiReport {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    relationship_id: String(row.relationship_id),
    report_json: (row.report_json as Json) ?? null,
    model_used: (row.model_used as string | null) ?? null,
    input_hash: (row.input_hash as string | null) ?? null,
    generated_at: String(row.generated_at),
    updated_at: String(row.updated_at),
  };
}

export const relationshipAiReportsRepository = {
  async getByRelationship(
    relationshipId: string,
  ): Promise<RelationshipAiReport | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_ai_reports")
      .select(SELECT_COLUMNS)
      .eq("relationship_id", relationshipId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as unknown as Record<string, unknown>) : null;
  },

  async upsert(input: {
    relationship_id: string;
    report: RelationshipIntelligenceReport;
    model_used?: string | null;
    input_hash?: string | null;
  }): Promise<RelationshipAiReport> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("relationship_ai_reports")
      .upsert(
        {
          relationship_id: input.relationship_id,
          report_json: input.report as unknown as Json,
          model_used: input.model_used ?? null,
          input_hash: input.input_hash ?? null,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "relationship_id" },
      )
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as unknown as Record<string, unknown>);
  },
};
