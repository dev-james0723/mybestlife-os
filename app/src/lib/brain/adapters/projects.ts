/**
 * Projects adapter — emits `project` nodes for the Brain.
 *
 * Note: the KB constellation already supports `project` nodes via its own
 * `projects` input (see `buildConstellationData.ts`). For the Brain we own
 * the project node namespace via `nodeId("project", id)` — the KB engine
 * uses a different prefix (`proj:`) so there is no collision.
 *
 * Project ↔ Knowledge edges are still produced by the KB engine; here we
 * only create the project node so that all the cross-module adapters
 * (tasks, ideas, role_models, …) can link into it.
 */

import type { Project } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function projectsToGraph(input: {
  rows: Project[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((p): ConstellationNode => ({
    id: nodeId("project", p.id),
    userId: input.userId,
    label: truncate(p.name || "Untitled project"),
    type: "project",
    projectId: p.id,
    description: p.description ?? undefined,
    tags: p.tags ?? [],
    importance: p.status === "active" ? 0.9 : 0.6,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    metadata: {
      status: p.status,
      priority: p.priority,
    },
  }));
  return { nodes, edges: [] };
}
