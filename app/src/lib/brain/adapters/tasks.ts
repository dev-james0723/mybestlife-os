/**
 * Tasks adapter — emits `task` nodes and project_reference edges from
 * `tasks.project_id`. Tasks linked to a goal go via `brain_relations` since
 * the schema has no `goal_id` column.
 */

import type { Task } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy, truncate } from "./_shared";

export function tasksToGraph(input: {
  rows: Task[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const t of rows) {
    const id = nodeId("task", t.id);
    nodes.push({
      id,
      userId: input.userId,
      label: truncate(t.title || "Untitled task"),
      type: "task",
      taskId: t.id,
      description: t.description ?? undefined,
      tags: t.tags ?? [],
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      metadata: {
        status: t.status,
        priority: t.priority,
        due_date: t.due_date,
      },
    });

    if (t.project_id) {
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("project", t.project_id),
          sourceType: "task",
          targetType: "project",
          type: "project_reference",
          weight: 0.6,
        }),
      );
    }
  }

  return { nodes, edges };
}
