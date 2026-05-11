/**
 * Goals adapter — Goals are the gravity wells of the Brain. They emit
 * `goal` nodes only; outbound edges (goal → habit, goal → project, …) are
 * derived by the *other* adapters that own the FK column. Keeping the
 * direction one-way prevents double-counting.
 */

import type { Goal } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function goalsToGraph(input: {
  rows: Goal[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((g): ConstellationNode => ({
    id: nodeId("goal", g.id),
    userId: input.userId,
    label: truncate(g.name || "Untitled goal"),
    type: "goal",
    goalId: g.id,
    description: g.description ?? undefined,
    category: g.category ?? undefined,
    importance: g.status === "active" ? 1.0 : 0.6,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    metadata: {
      status: g.status,
      target_date: g.target_date,
    },
  }));
  return { nodes, edges: [] };
}
