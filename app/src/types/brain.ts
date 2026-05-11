/**
 * Life OS Brain — domain grouping types.
 *
 * The Brain is a global cross-module graph that connects every feature in the
 * app (Goals, Habits, Quotes, Projects, Tasks, …). It reuses
 * {@link ConstellationNodeType} and {@link ConstellationEdgeType} as the wire
 * format so the same `ConstellationCanvas` renderer works without changes.
 *
 * The {@link BrainDomain} grouping is purely a UI concept used by the Brain
 * Legend to group node types into life domains for at-a-glance toggling.
 *
 * Multi-user safety: every Brain query relies on Supabase RLS scoping by
 * `auth.uid()` — no `user_id` parameter is threaded through the data layer.
 */

import type {
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";

/** A persisted cross-domain relation row from `brain_relations`. */
export type BrainRelationRow = {
  id: string;
  user_id: string;
  source_id: string;
  source_type: ConstellationNodeType;
  target_id: string;
  target_type: ConstellationNodeType;
  relation_type: ConstellationEdgeType;
  status: "confirmed" | "suggested" | "hidden" | "dismissed";
  weight: number | null;
  is_manual: boolean;
  is_ai_suggested: boolean;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

/** Insert shape for {@link BrainRelationRow}. `user_id` is filled by RLS default. */
export type BrainRelationInsert = {
  source_id: string;
  source_type: ConstellationNodeType;
  target_id: string;
  target_type: ConstellationNodeType;
  relation_type: ConstellationEdgeType;
  status?: BrainRelationRow["status"];
  weight?: number | null;
  is_manual?: boolean;
  is_ai_suggested?: boolean;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * High-level life domains used to group nodes in the Brain Legend. Each
 * domain owns a set of {@link ConstellationNodeType} values; toggling a
 * domain in the Legend hides/shows every node of that type at once.
 */
export type BrainDomain =
  | "knowledge"
  | "growth"
  | "relationships"
  | "career"
  | "life"
  | "health"
  | "finance"
  | "tools";

/**
 * Map of {@link BrainDomain} → {@link ConstellationNodeType}s. The order
 * inside each array is the display order in the Legend.
 */
export const BRAIN_DOMAIN_NODE_MAP: Record<
  BrainDomain,
  ConstellationNodeType[]
> = {
  knowledge: ["knowledge", "category", "tag", "collection", "source", "concept"],
  growth: ["goal", "habit", "daily_plan", "bucket_item"],
  relationships: ["person", "role_model", "organization"],
  career: ["project", "career_event", "idea", "task"],
  life: ["journal_entry", "quote", "gratitude", "about_me"],
  health: ["health_goal"],
  finance: ["finance_goal"],
  tools: ["asset", "ai_prompt", "software"],
};

/** Reverse lookup — what {@link BrainDomain} does a node type belong to? */
export const NODE_TYPE_TO_DOMAIN: Record<ConstellationNodeType, BrainDomain> =
  (() => {
    const out = {} as Record<ConstellationNodeType, BrainDomain>;
    for (const [domain, types] of Object.entries(BRAIN_DOMAIN_NODE_MAP) as [
      BrainDomain,
      ConstellationNodeType[],
    ][]) {
      for (const t of types) out[t] = domain;
    }
    return out;
  })();

/** Default visibility state — every domain visible at first paint. */
export const DEFAULT_DOMAIN_TOGGLES: Record<BrainDomain, boolean> = {
  knowledge: true,
  growth: true,
  relationships: true,
  career: true,
  life: true,
  health: true,
  finance: true,
  tools: true,
};

/** Display label per domain (English defaults; i18n is handled at the UI layer). */
export const BRAIN_DOMAIN_LABEL: Record<BrainDomain, string> = {
  knowledge: "Knowledge",
  growth: "Personal Growth",
  relationships: "Relationships",
  career: "Career & Work",
  life: "Life Quality",
  health: "Health",
  finance: "Finance",
  tools: "Assets & Tools",
};

/**
 * Adapter contract — every domain adapter must export this shape so
 * {@link buildBrainData} can call them uniformly.
 */
export type BrainAdapterOutput = {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
};

/** Re-exports for callers that want to import everything from one place. */
export type {
  ConstellationNode,
  ConstellationEdge,
  ConstellationNodeType,
  ConstellationEdgeType,
};
