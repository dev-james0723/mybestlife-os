/**
 * Shared helpers for Brain domain adapters.
 *
 * Adapters convert per-module rows (Goals, Habits, Quotes, …) into the
 * canvas-ready `ConstellationNode` and `ConstellationEdge` shapes consumed by
 * the existing constellation renderer. Every adapter exports a single
 * `toGraph()` function that returns `{ nodes, edges }` so the orchestrator
 * (`buildBrainData.ts`) can call them uniformly.
 */

import type {
  ConstellationEdge,
  ConstellationEdgeType,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";

/** Stable namespace prefix per node type — keeps node ids globally unique. */
export const NODE_ID_PREFIX = {
  goal: "goal:",
  habit: "habit:",
  daily_plan: "dailyplan:",
  bucket_item: "bucket:",
  role_model: "rolemodel:",
  career_event: "career:",
  idea: "idea:",
  task: "task:",
  journal_entry: "journal:",
  quote: "quote:",
  gratitude: "gratitude:",
  about_me: "aboutme:",
  health_goal: "healthgoal:",
  finance_goal: "financegoal:",
  asset: "asset:",
  ai_prompt: "aiprompt:",
  software: "software:",
  // KB types — Project + Person reused here for the Brain. Knowledge,
  // Category, Tag, Collection, Source, Concept, Organization namespaces are
  // owned by `buildConstellationData` and we intentionally do NOT redefine
  // them here.
  project: "project:",
  person: "person:",
} as const;

/** Build a stable node id given a type and an entity id. */
export function nodeId(type: keyof typeof NODE_ID_PREFIX, id: string): string {
  return `${NODE_ID_PREFIX[type]}${id}`;
}

/** Build a deterministic edge id so duplicate edges get deduplicated. */
export function edgeId(
  source: string,
  target: string,
  type: ConstellationEdgeType,
): string {
  return `${type}::${source}::${target}`;
}

/** Truncate long content for use as a node label. */
export function truncate(text: string, max = 60): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

/**
 * Build a ConstellationEdge with sensible Brain defaults. Every cross-module
 * edge is `confirmed` and `weight` ~0.65 so they render visibly without
 * dominating the canvas.
 */
export function makeEdge(params: {
  userId: string;
  source: string;
  target: string;
  sourceType: ConstellationNodeType;
  targetType: ConstellationNodeType;
  type: ConstellationEdgeType;
  weight?: number;
  reason?: string;
}): ConstellationEdge {
  const {
    userId,
    source,
    target,
    sourceType,
    targetType,
    type,
    weight = 0.65,
    reason,
  } = params;
  return {
    id: edgeId(source, target, type),
    userId,
    source,
    target,
    sourceType,
    targetType,
    type,
    status: "confirmed",
    weight,
    reason,
  };
}

/** Adapter return shape — one struct per module. */
export type AdapterOutput = {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
};

/** Filter a list of rows to those owned by the current user (defense in depth). */
export function ownedBy<T extends { user_id: string }>(
  rows: T[] | undefined,
  userId: string,
): T[] {
  if (!rows) return [];
  return rows.filter((r) => r.user_id === userId);
}
