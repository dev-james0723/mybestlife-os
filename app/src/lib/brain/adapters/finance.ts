/**
 * Finance adapter — emits `finance_goal` nodes from `finance_savings_goals`.
 * Accounts, transactions and budgets are intentionally omitted (too high
 * cardinality and not meaningful as graph nodes).
 */

import type { SavingsGoal } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function financeToGraph(input: {
  rows: SavingsGoal[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((g): ConstellationNode => ({
    id: nodeId("finance_goal", g.id),
    userId: input.userId,
    label: truncate(g.name || "Untitled savings goal"),
    type: "finance_goal",
    financeGoalId: g.id,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    metadata: {
      target_amount: g.target_amount,
      current_amount: g.current_amount,
      deadline: g.deadline,
    },
  }));
  return { nodes, edges: [] };
}
