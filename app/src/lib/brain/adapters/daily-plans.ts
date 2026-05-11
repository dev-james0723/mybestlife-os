/**
 * Daily Plans adapter — emits `daily_plan` nodes and edges to tasks
 * referenced inside the plan's `tasks` JSON array (each entry may have an
 * optional `taskId`).
 */

import type { DailyPlan } from "@/types/database";
import type { ConstellationEdge, ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, makeEdge, nodeId, ownedBy } from "./_shared";

export function dailyPlansToGraph(input: {
  rows: DailyPlan[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = [];
  const edges: ConstellationEdge[] = [];

  for (const p of rows) {
    const id = nodeId("daily_plan", p.id);
    nodes.push({
      id,
      userId: input.userId,
      label: `Plan — ${p.plan_date}`,
      type: "daily_plan",
      dailyPlanId: p.id,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      metadata: {
        plan_date: p.plan_date,
        start_time: p.start_time,
        end_time: p.end_time,
      },
    });

    for (const block of p.tasks ?? []) {
      if (!block?.taskId) continue;
      edges.push(
        makeEdge({
          userId: input.userId,
          source: id,
          target: nodeId("task", block.taskId),
          sourceType: "daily_plan",
          targetType: "task",
          // Daily plan blocks pointing at a task are scheduling references.
          type: "timeline_relation",
          weight: 0.45,
        }),
      );
    }
  }

  return { nodes, edges };
}
