/**
 * `brain_edges` repository.
 *
 * The Connected Brain Engine writes:
 *   - confirmed user-created edges (manual links between two nodes)
 *   - confirmed user-acknowledged suggestions
 *   - rejected suggestions (so they don't reappear)
 *
 * Reads:
 *   - all rows for the current user (RLS-scoped)
 *   - rejected rows are kept so the orphan resolver can filter them out
 *
 * Multi-user safety: every query relies on Supabase RLS scoping by
 * `auth.uid()`. We never thread `user_id` through queries.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  BrainEdgeSourceMethod,
  BrainEdgeStatus,
  BrainEdgeType,
  BrainNodeType,
} from "@/types/brain-graph";

/** Postgres / PostgREST signals "missing table". Treat as empty. */
function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { code?: string; message?: string };
  if (e.code === "42P01" || e.code === "PGRST205") return true;
  const msg = String(e.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("not found in schema cache")
  );
}

export type BrainEdgeRow = {
  id: string;
  user_id: string;
  source_node_id: string;
  source_node_type: BrainNodeType;
  target_node_id: string;
  target_node_type: BrainNodeType;
  relationship_type: BrainEdgeType;
  strength: number;
  confidence: number;
  reason: string;
  source_method: BrainEdgeSourceMethod;
  status: BrainEdgeStatus;
  evidence: Record<string, unknown> | null;
  evidence_hash: string | null;
  is_manual: boolean;
  is_ai_suggested: boolean;
  auto_generated: boolean;
  metadata: Record<string, unknown> | null;
  last_scored_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BrainEdgeInsert = {
  source_node_id: string;
  source_node_type: BrainNodeType;
  target_node_id: string;
  target_node_type: BrainNodeType;
  relationship_type: BrainEdgeType;
  strength: number;
  confidence: number;
  reason: string;
  source_method: BrainEdgeSourceMethod;
  status?: BrainEdgeStatus;
  evidence?: Record<string, unknown> | null;
  evidence_hash?: string | null;
  is_manual?: boolean;
  is_ai_suggested?: boolean;
  auto_generated?: boolean;
  metadata?: Record<string, unknown> | null;
};

export const brainEdgesRepository = {
  /** All edges owned by the current user. Returns [] if table doesn't exist. */
  async list(): Promise<BrainEdgeRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_edges")
      .select("*")
      .order("strength", { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data ?? []) as BrainEdgeRow[];
  },

  /** Insert a single edge (commonly: manual link from the user). */
  async create(input: BrainEdgeInsert): Promise<BrainEdgeRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_edges")
      .insert({
        source_node_id: input.source_node_id,
        source_node_type: input.source_node_type,
        target_node_id: input.target_node_id,
        target_node_type: input.target_node_type,
        relationship_type: input.relationship_type,
        strength: input.strength,
        confidence: input.confidence,
        reason: input.reason,
        source_method: input.source_method,
        status: input.status ?? "confirmed",
        evidence: input.evidence ?? null,
        evidence_hash: input.evidence_hash ?? null,
        is_manual: input.is_manual ?? input.source_method === "user_created",
        is_ai_suggested:
          input.is_ai_suggested ??
          (input.source_method === "embedding" ||
            input.source_method === "llm" ||
            input.source_method === "system_suggested"),
        auto_generated: input.auto_generated ?? false,
        metadata: input.metadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as BrainEdgeRow;
  },

  /**
   * Upsert a batch of suggestions on the unique
   * (user_id, source_node_id, target_node_id, relationship_type, source_method)
   * triple. Returns the rows post-upsert.
   */
  async upsertMany(rows: BrainEdgeInsert[]): Promise<BrainEdgeRow[]> {
    if (rows.length === 0) return [];
    const supabase = createClient();
    const payload = rows.map((r) => ({
      source_node_id: r.source_node_id,
      source_node_type: r.source_node_type,
      target_node_id: r.target_node_id,
      target_node_type: r.target_node_type,
      relationship_type: r.relationship_type,
      strength: r.strength,
      confidence: r.confidence,
      reason: r.reason,
      source_method: r.source_method,
      status: r.status ?? "suggested",
      evidence: r.evidence ?? null,
      evidence_hash: r.evidence_hash ?? null,
      is_manual: r.is_manual ?? false,
      is_ai_suggested: r.is_ai_suggested ?? false,
      auto_generated: r.auto_generated ?? true,
      metadata: r.metadata ?? null,
    }));
    const { data, error } = await supabase
      .from("brain_edges")
      .upsert(payload, {
        onConflict:
          "user_id,source_node_id,target_node_id,relationship_type,source_method",
      })
      .select();
    if (error) throw error;
    return (data ?? []) as BrainEdgeRow[];
  },

  /** Move a row to confirmed status (with optional user_confirmed method). */
  async confirm(
    id: string,
    options: { recordAsUserConfirmed?: boolean } = {},
  ): Promise<BrainEdgeRow> {
    const supabase = createClient();
    const update: Record<string, unknown> = { status: "confirmed" };
    if (options.recordAsUserConfirmed) {
      update.is_manual = true;
      update.source_method = "user_confirmed";
    }
    const { data, error } = await supabase
      .from("brain_edges")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as BrainEdgeRow;
  },

  /**
   * Reject a suggestion. The row is kept so subsequent rebuilds know not
   * to re-suggest the same evidence.
   */
  async reject(id: string): Promise<BrainEdgeRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_edges")
      .update({ status: "rejected" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as BrainEdgeRow;
  },

  /** Hide a row from the canvas without rejecting it (re-show later possible). */
  async hide(id: string): Promise<BrainEdgeRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_edges")
      .update({ status: "hidden" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as BrainEdgeRow;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("brain_edges").delete().eq("id", id);
    if (error) throw error;
  },

  /** Rejected-suggestion content hashes — used by the orphan resolver. */
  async listRejectedHashes(): Promise<string[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("brain_edges")
      .select("evidence_hash")
      .eq("status", "rejected")
      .not("evidence_hash", "is", null);
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data ?? [])
      .map((r) => (r as { evidence_hash: string | null }).evidence_hash)
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  },
};
