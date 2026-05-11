/**
 * Supabase repository for the four Bio Lab tools.
 *
 * One file because the four entities share a domain (regulation toolkit
 * sessions) and a contract (`ai_assisted` + `ai_metadata` columns + same
 * "most recent N for current user" read pattern). Splitting them per-tool
 * would mean four near-identical files.
 *
 * All inserts omit `user_id` and rely on the column DEFAULT auth.uid()
 * established in `20260420000000_bio_lab_sessions.sql`.
 */

import { createClient } from "@/lib/supabase/client";
import type { MindSweepKind, FocusOutcome } from "@/lib/bio-lab/flow-types";

// ============================================================
// Row shapes (DB-side)
// ============================================================

export type BioLabStateScanRow = {
  id: string;
  user_id: string;
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  note: string;
  ai_assisted: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
};

export type BioLabMindSweepItem = {
  text: string;
  kind: MindSweepKind;
  ai_label_confidence: "high" | "low" | null;
};

export type BioLabMindSweepRow = {
  id: string;
  user_id: string;
  items: BioLabMindSweepItem[];
  triage_insight: string | null;
  ai_assisted: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
};

export type BioLabFocusSprintRow = {
  id: string;
  user_id: string;
  intention: string;
  work_seconds: number;
  break_seconds: number;
  outcome: FocusOutcome;
  focus_rating: number | null;
  reflection_note: string;
  ai_assisted: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
};

export type BioLabSystemResetStep = {
  id: string;
  durationSeconds: number;
  skipped: boolean;
};

export type BioLabSystemResetRow = {
  id: string;
  user_id: string;
  steps: BioLabSystemResetStep[];
  ai_assisted: boolean;
  ai_metadata: Record<string, unknown> | null;
  created_at: string;
};

// ============================================================
// Insert input types
// ============================================================

export type CreateStateScanInput = {
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  note: string;
  aiAssisted?: boolean;
  aiMetadata?: Record<string, unknown> | null;
};

export type CreateMindSweepInput = {
  items: BioLabMindSweepItem[];
  triageInsight?: string | null;
  aiAssisted?: boolean;
  aiMetadata?: Record<string, unknown> | null;
};

export type CreateFocusSprintInput = {
  intention: string;
  workSeconds: number;
  breakSeconds: number;
  outcome: FocusOutcome;
  focusRating: number | null;
  reflectionNote: string;
  aiAssisted?: boolean;
  aiMetadata?: Record<string, unknown> | null;
};

export type CreateSystemResetInput = {
  steps: BioLabSystemResetStep[];
  aiAssisted?: boolean;
  aiMetadata?: Record<string, unknown> | null;
};

// ============================================================
// Repository
// ============================================================

const RECENT_LIMIT_DEFAULT = 30;

export const bioLabRepository = {
  // --- State Scan -------------------------------------------------

  async getRecentStateScans(limit = RECENT_LIMIT_DEFAULT): Promise<BioLabStateScanRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_state_scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as BioLabStateScanRow[];
  },

  async createStateScan(input: CreateStateScanInput): Promise<BioLabStateScanRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_state_scans")
      .insert({
        mood: clamp1to5(input.mood),
        energy: clamp1to5(input.energy),
        focus: clamp1to5(input.focus),
        stress: clamp1to5(input.stress),
        note: (input.note ?? "").slice(0, 4000),
        ai_assisted: input.aiAssisted ?? false,
        ai_metadata: input.aiMetadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as BioLabStateScanRow;
  },

  // --- Mind Sweep -------------------------------------------------

  async getRecentMindSweeps(limit = RECENT_LIMIT_DEFAULT): Promise<BioLabMindSweepRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_mind_sweeps")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as BioLabMindSweepRow[];
  },

  async createMindSweep(input: CreateMindSweepInput): Promise<BioLabMindSweepRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_mind_sweeps")
      .insert({
        items: input.items,
        triage_insight: input.triageInsight ?? null,
        ai_assisted: input.aiAssisted ?? false,
        ai_metadata: input.aiMetadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as BioLabMindSweepRow;
  },

  // --- Focus Sprint ----------------------------------------------

  async getRecentFocusSprints(
    limit = RECENT_LIMIT_DEFAULT,
  ): Promise<BioLabFocusSprintRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_focus_sprints")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as BioLabFocusSprintRow[];
  },

  async createFocusSprint(
    input: CreateFocusSprintInput,
  ): Promise<BioLabFocusSprintRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_focus_sprints")
      .insert({
        intention: (input.intention ?? "").slice(0, 500),
        work_seconds: Math.max(1, Math.floor(input.workSeconds)),
        break_seconds: Math.max(0, Math.floor(input.breakSeconds)),
        outcome: input.outcome,
        focus_rating: input.focusRating === null ? null : clamp1to5(input.focusRating),
        reflection_note: (input.reflectionNote ?? "").slice(0, 2000),
        ai_assisted: input.aiAssisted ?? false,
        ai_metadata: input.aiMetadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as BioLabFocusSprintRow;
  },

  // --- System Reset ----------------------------------------------

  async getRecentSystemResets(
    limit = RECENT_LIMIT_DEFAULT,
  ): Promise<BioLabSystemResetRow[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_system_resets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as BioLabSystemResetRow[];
  },

  async createSystemReset(
    input: CreateSystemResetInput,
  ): Promise<BioLabSystemResetRow> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bio_lab_system_resets")
      .insert({
        steps: input.steps,
        ai_assisted: input.aiAssisted ?? false,
        ai_metadata: input.aiMetadata ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as BioLabSystemResetRow;
  },
};

function clamp1to5(n: number): number {
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}
