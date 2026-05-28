import type { CaptureKind, Idea, Json } from "@/types/database";
import { IDEA_CATEGORIES, type IdeaCategorySlug } from "./constants";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asJsonArray(value: unknown): Json[] {
  if (!Array.isArray(value)) return [];
  return value as Json[];
}

function coerceIsoTimestamp(v: unknown, fallbackIso: string): string {
  if (typeof v !== "string" || !v.trim()) return fallbackIso;
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? fallbackIso : v;
}

function coerceCategory(value: unknown): IdeaCategorySlug {
  const c = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (IDEA_CATEGORIES.includes(c as IdeaCategorySlug)) return c as IdeaCategorySlug;
  return "random";
}

function coerceStatus(v: unknown): Idea["status"] {
  if (v === "captured" || v === "reviewed" || v === "archived") return v;
  return "captured";
}

function coerceSourceType(v: unknown): Idea["source_type"] {
  return v === "voice" ? "voice" : "text";
}

function coerceCaptureKind(v: unknown): CaptureKind {
  if (v === "idea" || v === "task" || v === "note" || v === "goal") return v;
  return "idea";
}

/**
 * Coerce a Supabase (or partial) row into a safe `Idea` for UI + TanStack Query.
 * Never throws; missing fields get stable defaults.
 */
export function normalizeIdea(row: unknown): Idea {
  const r = (row ?? {}) as Partial<Idea> & Record<string, unknown>;
  const fallbackTime = new Date().toISOString();

  return {
    id: typeof r.id === "string" ? r.id : "",
    user_id: typeof r.user_id === "string" ? r.user_id : "",

    content: typeof r.content === "string" ? r.content : "",

    source_type: coerceSourceType(r.source_type),
    capture_kind: coerceCaptureKind(r.capture_kind),

    voice_transcript:
      r.voice_transcript === null || typeof r.voice_transcript === "string"
        ? (r.voice_transcript as string | null)
        : null,

    linked_project_ids: asStringArray(r.linked_project_ids),
    linked_task_ids: asStringArray(r.linked_task_ids),
    linked_goal_ids: asStringArray(r.linked_goal_ids),
    linked_idea_ids: asStringArray(r.linked_idea_ids),

    status: coerceStatus(r.status),

    created_at: coerceIsoTimestamp(r.created_at, fallbackTime),
    updated_at: coerceIsoTimestamp(r.updated_at, fallbackTime),

    title: typeof r.title === "string" && r.title.trim() ? r.title : null,

    category: coerceCategory(r.category),

    ai_tags: asStringArray(r.ai_tags),
    manual_tags: asStringArray(r.manual_tags),
    destinations: asStringArray(r.destinations),
    attachments: asJsonArray(r.attachments),

    ai_suggestions: (r.ai_suggestions ?? null) as Json | null,

    processing_step: typeof r.processing_step === "string" ? r.processing_step : null,

    linked_knowledge_item_ids: asStringArray(r.linked_knowledge_item_ids),
    linked_node_ids: asStringArray(r.linked_node_ids),
    related_resource_refs: asJsonArray(r.related_resource_refs),
  };
}
