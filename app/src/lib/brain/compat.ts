/**
 * Compatibility layer: BrainNode/BrainEdge ↔ ConstellationNode/ConstellationEdge.
 *
 * The Brain page reuses the existing `ConstellationCanvas` renderer to avoid
 * forking a 1,000-line force-graph component. The internal Brain model is
 * richer (24 node types, 24 edge types, first-class strength/confidence/
 * reason), so this file translates one direction at the rendering boundary.
 *
 * Why a translation layer instead of merging the models?
 *   - The KB Constellation page must keep working unchanged.
 *   - The Brain's new node types ("document", "decision", "value",
 *     "life_area", "tool", "workflow", …) don't exist on the canvas — we
 *     map them onto the closest existing visual bucket.
 *   - New edge types ("mentions", "same_life_area", "recurring_pattern",
 *     "user_confirmed", …) get the same treatment.
 *
 * Multi-user safety: this is a pure transformation. RLS scoping happens at
 * the data-fetch layer; nothing here reads or writes Supabase.
 */

import type {
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationGraphData,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";
import type {
  BrainEdge,
  BrainEdgeType,
  BrainNode,
  BrainNodeType,
} from "@/types/brain-graph";

/** Result type for the Brain engine — kept separate from canvas data. */
export type BrainGraphData = {
  nodes: BrainNode[];
  edges: BrainEdge[];
};

// ============================================================
// Node mapping
// ============================================================

/**
 * Each `BrainNodeType` maps to a `ConstellationNodeType` that already has a
 * color, base size, and rendering style. New Brain-only types (document,
 * decision, value, …) reuse a sensible existing visual.
 */
const NODE_TYPE_MAP: Record<BrainNodeType, ConstellationNodeType> = {
  // KB
  knowledge_card: "knowledge",
  knowledge_collection: "collection",
  knowledge_category: "category",
  smart_tag: "tag",
  // Action / planning
  project: "project",
  task: "task",
  goal: "goal",
  daily_plan: "daily_plan",
  habit: "habit",
  bucket_list_item: "bucket_item",
  // Capture / reflection
  journal_entry: "journal_entry",
  quote: "quote",
  gratitude_entry: "gratitude",
  idea: "idea",
  // Memory + decision render as journal/idea (no dedicated visual yet).
  memory: "journal_entry",
  decision: "idea",
  // People
  relationship_person: "person",
  role_model: "role_model",
  organization: "organization",
  // Career
  career_project: "project",
  career_event: "career_event",
  // Resources
  document: "asset",
  asset: "asset",
  finance_item: "finance_goal",
  // Generic timeline events render alongside career events.
  event: "career_event",
  // AI / tools
  ai_knowledge: "ai_prompt",
  tool: "software",
  workflow: "software",
  // Wellbeing
  health_goal: "health_goal",
  about_me: "about_me",
  // Virtual anchors — fallbacks borrow KB visuals.
  value: "concept",
  life_area: "category",
};

/**
 * Each `BrainEdgeType` maps to a `ConstellationEdgeType` with an existing
 * stroke style. We reuse `manual_link` / `ai_suggested_link` /
 * `semantic_similarity` / `shared_tag` / etc. to avoid bloating the canvas
 * style table with Brain-only entries.
 */
const EDGE_TYPE_MAP: Record<BrainEdgeType, ConstellationEdgeType> = {
  // Strong / explicit
  explicit_link: "explicit_link",
  belongs_to: "explicit_link",
  part_of_project: "project_reference",
  supports_goal: "goal_project",
  linked_to_task: "goal_task",
  linked_to_finance: "explicit_link",
  linked_to_asset: "explicit_link",
  linked_to_career: "career_project",
  linked_to_ai_tool: "explicit_link",
  generated_from_document: "explicit_link",
  inspired_by_quote: "quote_goal",
  created_from_journal: "journal_project",
  connected_to_person: "person_reference",
  // Taxonomy / structural
  tagged_with: "shared_tag",
  same_life_area: "category_reference",
  same_topic_cluster: "shared_tag",
  related_theme: "domain_tag",
  // Mention / entity
  mentions: "manual_link",
  // Temporal / pattern
  same_time_period: "timeline_relation",
  recurring_pattern: "domain_tag",
  // Semantic
  semantic_similarity: "semantic_similarity",
  // Provenance flavors
  user_confirmed: "manual_link",
  system_suggested: "ai_suggested_link",
};

// ============================================================
// Conversions
// ============================================================

/** Convert a BrainNode into the canvas's ConstellationNode shape. */
export function brainNodeToConstellationNode(node: BrainNode): ConstellationNode {
  const visualType = NODE_TYPE_MAP[node.type];
  return {
    id: node.id,
    userId: node.userId,
    label: node.title || "Untitled",
    type: visualType,
    description: node.summary,
    tags: node.tags,
    category: node.categories?.[0],
    importance: node.importance,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    metadata: {
      ...(node.metadata ?? {}),
      brainType: node.type,
      brainSourceId: node.sourceId,
      brainSourceType: node.sourceType,
      brainLifeAreas: node.lifeAreas,
      brainCanonicalTags: node.canonicalTags,
    },
  };
}

/** Convert a BrainEdge into the canvas's ConstellationEdge shape. */
export function brainEdgeToConstellationEdge(edge: BrainEdge): ConstellationEdge {
  const visualType = EDGE_TYPE_MAP[edge.type];
  return {
    id: edge.id,
    userId: edge.userId,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceType: edge.sourceNodeType
      ? NODE_TYPE_MAP[edge.sourceNodeType]
      : undefined,
    targetType: edge.targetNodeType
      ? NODE_TYPE_MAP[edge.targetNodeType]
      : undefined,
    type: visualType,
    status:
      edge.status === "rejected"
        ? "dismissed"
        : edge.status === "hidden"
          ? "hidden"
          : edge.status === "suggested"
            ? "suggested"
            : "confirmed",
    weight: edge.strength,
    confidence: edge.confidence,
    reason: edge.reason,
    isManual:
      edge.sourceMethod === "user_created" ||
      edge.sourceMethod === "user_confirmed" ||
      edge.sourceMethod === "explicit",
    isAISuggested:
      edge.sourceMethod === "embedding" ||
      edge.sourceMethod === "llm" ||
      edge.sourceMethod === "system_suggested",
    isConfirmed: edge.status === "confirmed",
    createdAt: edge.createdAt,
    updatedAt: edge.updatedAt,
    metadata: {
      ...(edge.metadata ?? {}),
      brainType: edge.type,
      brainSourceMethod: edge.sourceMethod,
      brainEvidence: edge.evidence,
    },
  };
}

/** Bulk convert a BrainGraphData into a ConstellationGraphData. */
export function brainGraphToConstellationGraph(
  graph: BrainGraphData,
): ConstellationGraphData {
  return {
    nodes: graph.nodes.map(brainNodeToConstellationNode),
    edges: graph.edges.map(brainEdgeToConstellationEdge),
  };
}

// ============================================================
// Reverse helpers (looking up Brain metadata from a canvas node)
// ============================================================

/** Read the original BrainNodeType back out of a canvas node's metadata. */
export function getBrainTypeFromCanvasNode(
  node: ConstellationNode,
): BrainNodeType | undefined {
  const v = (node.metadata as { brainType?: string } | undefined)?.brainType;
  return v as BrainNodeType | undefined;
}

/** Read the original BrainEdgeType back out of a canvas edge's metadata. */
export function getBrainTypeFromCanvasEdge(
  edge: ConstellationEdge,
): BrainEdgeType | undefined {
  const v = (edge.metadata as { brainType?: string } | undefined)?.brainType;
  return v as BrainEdgeType | undefined;
}

/** Read the original sourceMethod from a canvas edge's metadata. */
export function getBrainSourceMethodFromCanvasEdge(
  edge: ConstellationEdge,
): string | undefined {
  return (edge.metadata as { brainSourceMethod?: string } | undefined)?.brainSourceMethod;
}

// ============================================================
// Helpers used by the engine
// ============================================================

/** Stable namespaced node id. */
export function makeBrainNodeId(type: BrainNodeType, sourceId: string): string {
  return `${type}::${sourceId}`;
}

/** Stable undirected edge id (sorts source+target so direction doesn't matter). */
export function makeBrainEdgeId(
  type: BrainEdgeType,
  a: string,
  b: string,
): string {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return `${type}::${lo}::${hi}`;
}
