/**
 * Connected Brain Engine — canonical data model.
 *
 * This is the *internal* representation that the relationship engine works
 * with. The visual canvas still consumes the older `ConstellationGraphData`
 * shape — `lib/brain/compat.ts` adapts between the two — but every new
 * relationship generator, scorer, and persistence helper speaks `BrainNode`
 * and `BrainEdge` directly.
 *
 * Why a separate model?
 *   - The Brain has a richer node taxonomy (24 types: documents, decisions,
 *     values, life areas, tools, workflows, …) than the old constellation
 *     types could carry without bloating them.
 *   - Edges need first-class `strength` + `confidence` + `reason` +
 *     `sourceMethod` so we can score, filter, and explain every connection.
 *   - The KB Constellation page must remain unchanged. Keeping these models
 *     separate prevents accidental coupling.
 *
 * Multi-user safety: every node and edge is scoped by `userId`. The
 * relationship engine never compares rows owned by different users — it
 * filters defensively even though Supabase RLS already enforces isolation.
 */

import type {
  ConstellationEdgeType,
  ConstellationNodeType,
} from "@/types/constellation";

// ============================================================
// Node taxonomy
// ============================================================

/**
 * Every entity that can appear in the Brain graph. Compared to the old
 * `ConstellationNodeType`, this adds first-class types for documents,
 * notes/memories, decisions, finance items, values, life areas, tools, and
 * workflows — entities the user explicitly asked the graph to understand.
 *
 * `value` and `life_area` are *virtual* anchor nodes — they are not stored
 * in any table; the engine materializes them when 2+ real nodes share the
 * same canonical value or life area.
 */
export type BrainNodeType =
  // ── Knowledge Base ─────────────────────────────────────────────────
  | "knowledge_card"
  | "knowledge_collection"
  | "knowledge_category"
  | "smart_tag"
  // ── Action / planning ──────────────────────────────────────────────
  | "project"
  | "task"
  | "goal"
  | "daily_plan"
  | "habit"
  | "bucket_list_item"
  // ── Capture / reflection ───────────────────────────────────────────
  | "journal_entry"
  | "quote"
  | "gratitude_entry"
  | "idea"
  | "memory"
  | "decision"
  // ── People / relationships ─────────────────────────────────────────
  | "relationship_person"
  | "role_model"
  | "organization"
  // ── Career ─────────────────────────────────────────────────────────
  | "career_project"
  | "career_event"
  // ── Resources & assets ─────────────────────────────────────────────
  | "document"
  | "asset"
  | "finance_item"
  | "event"
  // ── AI / tools ─────────────────────────────────────────────────────
  | "ai_knowledge"
  | "tool"
  | "workflow"
  // ── Wellbeing ──────────────────────────────────────────────────────
  | "health_goal"
  | "about_me"
  // ── Virtual anchors (materialized by the engine) ──────────────────
  | "value"
  | "life_area";

// ============================================================
// Edge taxonomy
// ============================================================

/**
 * Every relationship type the Brain understands.
 *
 * Bucketed by the *kind of evidence* that produced it:
 *   - "explicit_*" / "belongs_to" / "linked_to_*": persisted FK on the
 *     source row. Always confirmed, very high confidence.
 *   - "tagged_with" / "same_*" / "related_theme": canonical-taxonomy
 *     overlap. Confidence depends on tag source quality.
 *   - "mentions" / "connected_to_person": entity extraction on text.
 *   - "same_time_period" / "recurring_pattern": temporal signals.
 *   - "semantic_similarity": embedding distance + LLM rationale.
 *   - "user_confirmed" / "system_suggested": status flavors used when
 *     promoting / demoting suggestions; usually paired with `status`.
 */
export type BrainEdgeType =
  // Strong / explicit
  | "explicit_link"
  | "belongs_to"
  | "part_of_project"
  | "supports_goal"
  | "linked_to_task"
  | "linked_to_finance"
  | "linked_to_asset"
  | "linked_to_career"
  | "linked_to_ai_tool"
  | "generated_from_document"
  | "inspired_by_quote"
  | "created_from_journal"
  | "connected_to_person"
  // Taxonomy / structural
  | "tagged_with"
  | "same_life_area"
  | "same_topic_cluster"
  | "related_theme"
  // Mention / entity
  | "mentions"
  // Temporal / pattern
  | "same_time_period"
  | "recurring_pattern"
  // Semantic
  | "semantic_similarity"
  // Provenance flavors (used together with `status`)
  | "user_confirmed"
  | "system_suggested";

/** How an edge was generated — used for filtering, weighting, and audit. */
export type BrainEdgeSourceMethod =
  | "explicit"
  | "tag"
  | "life_area"
  | "topic_cluster"
  | "entity"
  | "time"
  | "pattern"
  | "embedding"
  | "llm"
  | "user_confirmed"
  | "user_created"
  | "system_suggested";

/**
 * Lifecycle of an edge. `confirmed` / `suggested` / `hidden` are the only
 * states the canvas renders; `rejected` is persisted so the same suggestion
 * never re-appears on subsequent rebuilds.
 */
export type BrainEdgeStatus = "confirmed" | "suggested" | "hidden" | "rejected";

// ============================================================
// Node and edge shapes
// ============================================================

/**
 * A single node in the Brain graph.
 *
 * `sourceId` + `sourceType` point back at the row in the originating table
 * so the detail panel can deep-link the user to the right page. `id` is
 * always the namespaced canonical id (e.g. `"goal:abc-uuid"`); the engine
 * uses these as graph keys.
 */
export type BrainNode = {
  /** Globally unique id, e.g. `"goal:abc"`, `"value:discipline"`. */
  id: string;
  userId: string;
  type: BrainNodeType;

  /** Short, render-ready label. */
  title: string;

  /** Optional one-liner shown under the title. */
  summary?: string;

  /**
   * Longer text used by the relationship engine for entity extraction and
   * embedding. Never rendered directly — keep it small but informative.
   */
  bodyText?: string;

  /** Raw user/AI tags from the source table (un-normalized). */
  tags?: string[];

  /** Normalized canonical tag slugs the engine resolves to ("ai-music"). */
  canonicalTags?: string[];

  /** Top-level taxonomy categories the node belongs to ("technology"). */
  categories?: string[];

  /** Which Life Area anchors this node should attach to. */
  lifeAreas?: string[];

  /** Detected entity slugs found in the body text (people, projects, …). */
  entities?: string[];

  /** Pointer to the underlying source row. */
  sourceId?: string;
  sourceType?: string;

  /** ISO timestamps used by time-proximity scoring. */
  createdAt?: string;
  updatedAt?: string;

  /**
   * Soft-importance hint that biases hub-style placement and orphan
   * filtering. Goals = 1.0, leaf nodes = 0.4. The renderer multiplies it
   * with `connectionCount` to size nodes.
   */
  importance?: number;

  /** Free-form per-node metadata, flowed through to the canvas as-is. */
  metadata?: Record<string, unknown>;
};

/**
 * A single edge in the Brain graph.
 *
 * Every edge MUST carry a `reason` so the user can answer "Why are these
 * two things related in my life?" — that is the core promise of the
 * Connected Brain Engine.
 */
export type BrainEdge = {
  /** Deterministic id: `${type}::${minId}::${maxId}` for undirected edges. */
  id: string;
  userId: string;

  sourceNodeId: string;
  targetNodeId: string;

  sourceNodeType?: BrainNodeType;
  targetNodeType?: BrainNodeType;

  type: BrainEdgeType;

  /** 0–1 — how meaningful this connection is. Drives visual width. */
  strength: number;

  /** 0–1 — how sure the engine is. Drives visual opacity. */
  confidence: number;

  /** Always present. One sentence explaining the relationship. */
  reason: string;

  sourceMethod: BrainEdgeSourceMethod;
  status: BrainEdgeStatus;

  /** Persistence id from `brain_edges` (when sourced from DB). */
  persistenceId?: string;

  createdAt?: string;
  updatedAt?: string;

  /**
   * Evidence used for the edge — kept structured so we can hash it for
   * de-duplication and "rejected suggestions don't reappear" behavior.
   *
   * Examples:
   *   { sharedTags: ["ai-music", "d-festival"] }
   *   { mentions: ["d-festival"] }
   *   { sameLifeArea: "career" }
   *   { sameWeek: "2026-W17" }
   *   { semanticSimilarity: 0.81 }
   */
  evidence?: Record<string, unknown>;

  /** Free-form metadata mirrored into the canvas edge. */
  metadata?: Record<string, unknown>;
};

// ============================================================
// Feature index used by the relationship engine
// ============================================================

/**
 * Feature payload pre-computed once per node so scorers don't repeatedly
 * normalize text. Built by `lib/brain/relationship-engine/featurize.ts`.
 */
export type BrainNodeFeatures = {
  nodeId: string;
  nodeType: BrainNodeType;
  /** Lower-cased title + summary + bodyText concatenation. */
  searchText: string;
  /** Canonical tag slugs (always lowercase, hyphenated). */
  tagSlugs: Set<string>;
  /** Topic cluster slugs (e.g. "ai-music", "personal-growth"). */
  topicClusters: Set<string>;
  /** Life-area slugs ("career", "finance", …). */
  lifeAreas: Set<string>;
  /** Detected entity slugs (people, project names, tools, organizations). */
  entitySlugs: Set<string>;
  /** Source-table refs (e.g. project ids the row already explicitly links to). */
  explicitRefs: Set<string>;
  /** ISO date `YYYY-MM-DD` for time-proximity bucketing, if known. */
  dateBucket?: string;
};

// ============================================================
// Diagnostics
// ============================================================

/**
 * Output of `lib/brain/diagnostics/analyzeBrainGraph.ts` — used by the
 * dev-only diagnostics panel and (optionally) console logs to track how
 * the relationship engine improves the graph over time.
 */
export type BrainGraphDiagnostics = {
  totalNodes: number;
  totalEdges: number;
  /** Nodes with zero incident edges. */
  orphanCount: number;
  /** Percentage of orphans (0–1). */
  orphanRate: number;
  /** Number of weakly-connected components. */
  componentCount: number;
  /** Sizes of the top 5 components by node count. */
  topComponentSizes: number[];
  /** Average node degree across all nodes. */
  averageDegree: number;
  /** Highest single-node degree. */
  maxDegree: number;
  /** Per-node-type counts. */
  nodesByType: Record<string, number>;
  /** Per-edge-type counts. */
  edgesByType: Record<string, number>;
  /** Per-source-method counts (explicit / tag / entity / …). */
  edgesBySourceMethod: Record<string, number>;
  /** Per-domain isolation: how many nodes of this domain have no edges. */
  isolatedNodesByDomain: Record<string, number>;
};

// ============================================================
// Compatibility re-exports
// ============================================================

/**
 * Older types kept available so callers don't need two separate imports
 * during the migration.
 */
export type { ConstellationNodeType, ConstellationEdgeType };
