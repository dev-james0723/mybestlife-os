/**
 * Brain relations repository — Supabase access layer for `brain_relations`.
 *
 * The `brain_relations` table stores manual and AI-suggested cross-module
 * edges (goal → habit, quote → goal, etc.) that are NOT covered by an
 * existing FK column on the source row. RLS enforces user scoping so this
 * module never threads `user_id` through queries.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  ConstellationEdgeType,
  ConstellationNodeType,
} from "@/types/constellation";
import type { BrainRelationInsert, BrainRelationRow } from "@/types/brain";

function mapRow(row: Record<string, unknown>): BrainRelationRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    source_id: String(row.source_id),
    source_type: row.source_type as ConstellationNodeType,
    target_id: String(row.target_id),
    target_type: row.target_type as ConstellationNodeType,
    relation_type: row.relation_type as ConstellationEdgeType,
    status: (row.status as BrainRelationRow["status"]) ?? "confirmed",
    weight: typeof row.weight === "number" ? row.weight : null,
    is_manual: Boolean(row.is_manual),
    is_ai_suggested: Boolean(row.is_ai_suggested),
    reason: (row.reason as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Postgres / PostgREST error codes meaning "relation does not exist" — i.e.
 * the migration hasn't been applied to this Supabase project yet.
 *
 *   * `42P01` is the canonical PostgreSQL error class for "undefined_table".
 *   * `PGRST205` is PostgREST's "could not find the table" wrapper.
 *
 * The Brain treats these as "no relations exist yet" rather than a hard
 * failure so the page works locally even before the user runs `db:push`.
 */
function isMissingTableError(error: { code?: string; message?: string }): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("not found in schema cache")
  );
}

export const brainRelationsRepository = {
  /** List all brain relations the current user owns (RLS-scoped). */
  async list(): Promise<BrainRelationRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_relations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      if (isMissingTableError(error)) {
        // Table not migrated yet — treat as empty so the rest of the
        // Brain still renders.
        return [];
      }
      throw error;
    }
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  /** Create a manual cross-module link. `user_id` is filled by `DEFAULT auth.uid()`. */
  async create(input: BrainRelationInsert): Promise<BrainRelationRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_relations")
      .insert({
        source_id: input.source_id,
        source_type: input.source_type,
        target_id: input.target_id,
        target_type: input.target_type,
        relation_type: input.relation_type,
        status: input.status ?? "confirmed",
        weight: input.weight ?? null,
        is_manual: input.is_manual ?? true,
        is_ai_suggested: input.is_ai_suggested ?? false,
        reason: input.reason ?? null,
        metadata: input.metadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  /**
   * Upsert a relation by (source, target, relation_type). Used by the AI
   * suggestion pipeline so re-running the model never produces duplicates.
   */
  async upsert(input: BrainRelationInsert): Promise<BrainRelationRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_relations")
      .upsert(
        {
          source_id: input.source_id,
          source_type: input.source_type,
          target_id: input.target_id,
          target_type: input.target_type,
          relation_type: input.relation_type,
          status: input.status ?? "confirmed",
          weight: input.weight ?? null,
          is_manual: input.is_manual ?? false,
          is_ai_suggested: input.is_ai_suggested ?? false,
          reason: input.reason ?? null,
          metadata: input.metadata ?? null,
        },
        {
          onConflict:
            "user_id,source_id,source_type,target_id,target_type,relation_type",
        },
      )
      .select()
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async updateStatus(
    id: string,
    status: BrainRelationRow["status"],
  ): Promise<BrainRelationRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_relations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("brain_relations").delete().eq("id", id);
    if (error) throw error;
  },
};
