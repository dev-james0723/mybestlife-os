/**
 * Health adapter — emits `health_goal` nodes from `health_goals`. Daily
 * logs and metrics are intentionally omitted (too high cardinality for the
 * graph); they remain the domain of the Health page itself.
 */

import type { HealthGoal } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function healthToGraph(input: {
  rows: HealthGoal[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((g): ConstellationNode => ({
    id: nodeId("health_goal", g.id),
    userId: input.userId,
    label: truncate(`${g.metric_type}: ${g.target_value} ${g.unit}`),
    type: "health_goal",
    healthGoalId: g.id,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    metadata: {
      metric_type: g.metric_type,
      target_value: g.target_value,
      period: g.period,
    },
  }));
  return { nodes, edges: [] };
}
