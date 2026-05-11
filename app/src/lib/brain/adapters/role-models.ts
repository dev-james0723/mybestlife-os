/**
 * Role Models adapter — emits `role_model` nodes and edges from the
 * `linked_goal_ids` and `linked_project_ids` array columns.
 */

import type { RoleModel } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function roleModelsToGraph(input: {
  rows: RoleModel[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const r of rows) {
    const id = nodeId("role_model", r.id);
    nodes.push({
      id,
      userId: input.userId,
      label: truncate(r.name || "Unnamed role model"),
      type: "role_model",
      roleModelId: r.id,
      description: r.bio ?? r.description ?? r.admiration_blurb ?? undefined,
      tags: r.tags ?? [],
      category: r.category ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      metadata: {
        is_favorite: r.is_favorite,
      },
    });

    for (const goalId of r.linked_goal_ids ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("goal", goalId),
          sourceType: "role_model",
          targetType: "goal",
          type: "role_model_goal",
          weight: 0.7,
        }),
      );
    }

    for (const projectId of r.linked_project_ids ?? []) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", projectId),
          sourceType: "role_model",
          targetType: "project",
          type: "role_model_project",
          weight: 0.6,
        }),
      );
    }
  }

  return { nodes, edges };
}
