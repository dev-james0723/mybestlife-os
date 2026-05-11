/**
 * Bridge: legacy `brain_relations` rows → BrainEdge.
 *
 * The Brain previously persisted edges in `brain_relations` keyed by
 * (source_id, source_type, target_id, target_type, relation_type). The
 * new engine speaks `BrainEdge` with sourceNodeId/targetNodeId already
 * namespaced (e.g. `goal::abc`).
 *
 * Mapping rules:
 *   - Old `source_type`/`target_type` are constellation-level types
 *     (`goal`, `task`, …). We map them to BrainNodeType using a small
 *     table — most are direct.
 *   - Old `relation_type` is constellation-level. We map to BrainEdgeType
 *     using a coarse buckets table, defaulting to `explicit_link`.
 *   - Status pass-through (`confirmed` / `suggested` / `hidden` /
 *     `dismissed` → `confirmed` / `suggested` / `hidden` / `rejected`).
 *
 * Edges whose endpoints are unknown to the current node set are dropped
 * — the build pipeline rebuilds the graph from scratch every render, so
 * stale ids should not produce orphan edges.
 */

import type {
  BrainEdge,
  BrainEdgeSourceMethod,
  BrainEdgeStatus,
  BrainEdgeType,
  BrainNodeType,
} from "@/types/brain-graph";
import type { BrainRelationRow } from "@/types/brain";
import { makeBrainEdgeId, makeBrainNodeId } from "@/lib/brain/compat";

const NODE_TYPE_MAP: Record<string, BrainNodeType> = {
  knowledge: "knowledge_card",
  category: "knowledge_category",
  tag: "smart_tag",
  collection: "knowledge_collection",
  source: "knowledge_card",
  project: "project",
  person: "relationship_person",
  organization: "organization",
  concept: "value",
  goal: "goal",
  habit: "habit",
  journal_entry: "journal_entry",
  quote: "quote",
  bucket_item: "bucket_list_item",
  task: "task",
  role_model: "role_model",
  idea: "idea",
  health_goal: "health_goal",
  career_event: "career_event",
  finance_goal: "finance_item",
  gratitude: "gratitude_entry",
  asset: "asset",
  ai_prompt: "ai_knowledge",
  software: "tool",
  daily_plan: "daily_plan",
  about_me: "about_me",
};

const EDGE_TYPE_MAP: Record<string, BrainEdgeType> = {
  explicit_link: "explicit_link",
  manual_link: "user_confirmed",
  ai_suggested_link: "system_suggested",
  shared_tag: "tagged_with",
  same_collection: "belongs_to",
  same_source: "tagged_with",
  semantic_similarity: "semantic_similarity",
  category_reference: "tagged_with",
  project_reference: "linked_to_career",
  person_reference: "connected_to_person",
  organization_reference: "connected_to_person",
  concept_reference: "related_theme",
  timeline_relation: "same_time_period",
  goal_task: "supports_goal",
  goal_habit: "supports_goal",
  goal_project: "supports_goal",
  goal_bucket: "supports_goal",
  quote_goal: "inspired_by_quote",
  role_model_goal: "supports_goal",
  role_model_project: "linked_to_career",
  idea_project: "part_of_project",
  idea_knowledge: "generated_from_document",
  habit_goal: "supports_goal",
  habit_project: "linked_to_career",
  habit_task: "linked_to_task",
  habit_knowledge: "tagged_with",
  journal_project: "created_from_journal",
  journal_task: "linked_to_task",
  bucket_project: "part_of_project",
  bucket_task: "linked_to_task",
  career_project: "linked_to_career",
  gratitude_person: "connected_to_person",
  domain_tag: "related_theme",
};

function mapStatus(status: BrainRelationRow["status"]): BrainEdgeStatus {
  switch (status) {
    case "dismissed":
      return "rejected";
    case "hidden":
      return "hidden";
    case "suggested":
      return "suggested";
    default:
      return "confirmed";
  }
}

function mapSourceMethod(row: BrainRelationRow): BrainEdgeSourceMethod {
  if (row.is_manual) return "user_created";
  if (row.is_ai_suggested) return "system_suggested";
  return "explicit";
}

export function brainRelationsToBrainEdges(input: {
  rows: BrainRelationRow[] | undefined;
  userId: string;
  /** Nodes that exist in the current build — edges referencing other ids
   * are dropped here so we never render dangling edges. */
  knownNodeIds: ReadonlySet<string>;
}): BrainEdge[] {
  if (!input.rows) return [];
  const out: BrainEdge[] = [];
  for (const row of input.rows) {
    if (row.user_id !== input.userId) continue;
    const sNodeType = NODE_TYPE_MAP[row.source_type] ?? "memory";
    const tNodeType = NODE_TYPE_MAP[row.target_type] ?? "memory";
    const sourceNodeId = makeBrainNodeId(sNodeType, row.source_id);
    const targetNodeId = makeBrainNodeId(tNodeType, row.target_id);
    if (!input.knownNodeIds.has(sourceNodeId)) continue;
    if (!input.knownNodeIds.has(targetNodeId)) continue;

    const edgeType = EDGE_TYPE_MAP[row.relation_type] ?? "explicit_link";
    out.push({
      id: makeBrainEdgeId(edgeType, sourceNodeId, targetNodeId),
      userId: row.user_id,
      sourceNodeId,
      targetNodeId,
      sourceNodeType: sNodeType,
      targetNodeType: tNodeType,
      type: edgeType,
      strength: row.weight ?? 0.7,
      confidence: 0.85,
      reason: row.reason ?? "Persisted relationship.",
      sourceMethod: mapSourceMethod(row),
      status: mapStatus(row.status),
      persistenceId: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      evidence: { persistedAs: row.relation_type },
      metadata: row.metadata ?? undefined,
    });
  }
  return out;
}
