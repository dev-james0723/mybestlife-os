/**
 * Explicit-edge generator.
 *
 * Walks every `BrainNode` and produces edges from any FK or linked-id
 * fields the source rows already carry:
 *
 *   - tasks.project_id              → task → project (part_of_project)
 *   - quotes.linked_goal_id         → quote → goal (inspired_by_quote)
 *   - role_models.linked_goal_ids   → role_model → goal (supports_goal)
 *   - role_models.linked_project_ids→ role_model → project (linked_to_career)
 *   - ideas.linked_project_ids      → idea → project (part_of_project)
 *   - ideas.linked_knowledge_item_ids → idea → knowledge_card (generated_from_document)
 *   - journal.linked_project_ids    → journal → project (created_from_journal)
 *   - journal.linked_task_ids       → journal → task (linked_to_task)
 *   - bucket_items.linked_project_id→ bucket → project (part_of_project)
 *   - bucket_items.linked_task_ids  → bucket → task (linked_to_task)
 *   - notes.project_id              → memory → project (part_of_project)
 *   - assets.document_id            → asset → document (generated_from_document)
 *   - daily_plans.tasks[].taskId    → daily_plan → task (linked_to_task)
 *   - relationships.linked_project_id → person → project (linked_to_career)
 *
 * All explicit edges have strength 0.95 / confidence 0.98 and status
 * "confirmed" — they reflect actual user-set FKs.
 */

import type { BrainEdge, BrainNode, BrainNodeType } from "@/types/brain-graph";
import { makeBrainNodeId } from "@/lib/brain/compat";
import { buildEdge } from "./scoreEdge";

const EXPLICIT_DEFAULTS = {
  strength: 0.95,
  confidence: 0.98,
} as const;

/**
 * Convenience: build a single explicit edge if the target node id resolves
 * to a real BrainNode.
 */
function explicitEdge(args: {
  userId: string;
  source: BrainNode;
  targetType: BrainNodeType;
  targetSourceId: string;
  edgeType:
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
    | "connected_to_person";
  reason: string;
  knownIds: Set<string>;
}): BrainEdge | null {
  const targetId = makeBrainNodeId(args.targetType, args.targetSourceId);
  if (!args.knownIds.has(targetId)) return null;
  return buildEdge({
    userId: args.userId,
    sourceNodeId: args.source.id,
    targetNodeId: targetId,
    sourceNodeType: args.source.type,
    targetNodeType: args.targetType,
    type: args.edgeType,
    strength: EXPLICIT_DEFAULTS.strength,
    confidence: EXPLICIT_DEFAULTS.confidence,
    reason: args.reason,
    sourceMethod: "explicit",
    status: "confirmed",
    evidence: {
      explicitField: args.edgeType,
      sourceTable: args.source.sourceType,
    },
  });
}

/**
 * Iterate over every node and emit explicit edges from its metadata.
 * Knows the canonical metadata keys produced by the normalize layer.
 */
export function generateExplicitEdges(input: {
  nodes: BrainNode[];
  userId: string;
}): BrainEdge[] {
  const knownIds = new Set(input.nodes.map((n) => n.id));
  const out: BrainEdge[] = [];

  function pushIfPresent(edge: BrainEdge | null) {
    if (edge) out.push(edge);
  }

  for (const node of input.nodes) {
    const meta = (node.metadata ?? {}) as Record<string, unknown>;

    // tasks.project_id
    if (node.type === "task" && typeof meta.project_id === "string") {
      pushIfPresent(
        explicitEdge({
          userId: input.userId,
          source: node,
          targetType: "project",
          targetSourceId: meta.project_id,
          edgeType: "part_of_project",
          reason: `Task is part of project (project_id link).`,
          knownIds,
        }),
      );
    }

    // notes.project_id (note → memory)
    if (node.type === "memory" && typeof meta.project_id === "string") {
      pushIfPresent(
        explicitEdge({
          userId: input.userId,
          source: node,
          targetType: "project",
          targetSourceId: meta.project_id,
          edgeType: "part_of_project",
          reason: `Note belongs to a project.`,
          knownIds,
        }),
      );
    }

    // quotes.linked_goal_id
    if (node.type === "quote" && typeof meta.linked_goal_id === "string") {
      pushIfPresent(
        explicitEdge({
          userId: input.userId,
          source: node,
          targetType: "goal",
          targetSourceId: meta.linked_goal_id,
          edgeType: "inspired_by_quote",
          reason: `Quote is explicitly linked to this goal.`,
          knownIds,
        }),
      );
    }

    // role_models.linked_goal_ids[]
    if (node.type === "role_model" && Array.isArray(meta.linked_goal_ids)) {
      for (const id of meta.linked_goal_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "goal",
            targetSourceId: id,
            edgeType: "supports_goal",
            reason: `Role model linked to goal.`,
            knownIds,
          }),
        );
      }
    }

    // role_models.linked_project_ids[]
    if (node.type === "role_model" && Array.isArray(meta.linked_project_ids)) {
      for (const id of meta.linked_project_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "project",
            targetSourceId: id,
            edgeType: "linked_to_career",
            reason: `Role model linked to project.`,
            knownIds,
          }),
        );
      }
    }

    // ideas.linked_project_ids[]
    if (node.type === "idea" && Array.isArray(meta.linked_project_ids)) {
      for (const id of meta.linked_project_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "project",
            targetSourceId: id,
            edgeType: "part_of_project",
            reason: `Idea linked to a project.`,
            knownIds,
          }),
        );
      }
    }

    // ideas.linked_knowledge_item_ids[]
    if (
      node.type === "idea" &&
      Array.isArray(meta.linked_knowledge_item_ids)
    ) {
      for (const id of meta.linked_knowledge_item_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "knowledge_card",
            targetSourceId: id,
            edgeType: "generated_from_document",
            reason: `Idea references a knowledge item.`,
            knownIds,
          }),
        );
      }
    }

    // ideas.linked_task_ids[]
    if (node.type === "idea" && Array.isArray(meta.linked_task_ids)) {
      for (const id of meta.linked_task_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "task",
            targetSourceId: id,
            edgeType: "linked_to_task",
            reason: `Idea linked to task.`,
            knownIds,
          }),
        );
      }
    }

    // journal.linked_project_ids[]
    if (
      node.type === "journal_entry" &&
      Array.isArray(meta.linked_project_ids)
    ) {
      for (const id of meta.linked_project_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "project",
            targetSourceId: id,
            edgeType: "created_from_journal",
            reason: `Journal entry references this project.`,
            knownIds,
          }),
        );
      }
    }

    // journal.linked_task_ids[]
    if (node.type === "journal_entry" && Array.isArray(meta.linked_task_ids)) {
      for (const id of meta.linked_task_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "task",
            targetSourceId: id,
            edgeType: "linked_to_task",
            reason: `Journal entry references this task.`,
            knownIds,
          }),
        );
      }
    }

    // daily_plans.tasks[].taskId + free_tasks[].taskId
    if (node.type === "daily_plan" && Array.isArray(meta.linked_task_ids)) {
      for (const id of meta.linked_task_ids) {
        if (typeof id !== "string") continue;
        pushIfPresent(
          explicitEdge({
            userId: input.userId,
            source: node,
            targetType: "task",
            targetSourceId: id,
            edgeType: "linked_to_task",
            reason: `Daily plan schedules this task.`,
            knownIds,
          }),
        );
      }
    }

    // bucket_items.linked_project_id
    if (
      node.type === "bucket_list_item" &&
      typeof meta.linked_project_id === "string"
    ) {
      pushIfPresent(
        explicitEdge({
          userId: input.userId,
          source: node,
          targetType: "project",
          targetSourceId: meta.linked_project_id,
          edgeType: "part_of_project",
          reason: `Bucket-list item linked to project.`,
          knownIds,
        }),
      );
    }

    // assets.document_id
    if (node.type === "asset" && typeof meta.document_id === "string") {
      pushIfPresent(
        explicitEdge({
          userId: input.userId,
          source: node,
          targetType: "document",
          targetSourceId: meta.document_id,
          edgeType: "generated_from_document",
          reason: `Asset has a backing document.`,
          knownIds,
        }),
      );
    }

    // relationships.linked_project_id
    if (
      node.type === "relationship_person" &&
      typeof meta.linked_project_id === "string"
    ) {
      pushIfPresent(
        explicitEdge({
          userId: input.userId,
          source: node,
          targetType: "project",
          targetSourceId: meta.linked_project_id,
          edgeType: "linked_to_career",
          reason: `Person linked to project.`,
          knownIds,
        }),
      );
    }
  }

  return out;
}
