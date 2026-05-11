/**
 * Software adapter — emits `software` nodes from `software_vault`.
 */

import type { SoftwareVaultEntry } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function softwareToGraph(input: {
  rows: SoftwareVaultEntry[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((s): ConstellationNode => ({
    id: nodeId("software", s.id),
    userId: input.userId,
    label: truncate(s.app_name || "Unnamed software"),
    type: "software",
    softwareId: s.id,
    description: s.summary ?? s.why_i_use_it ?? undefined,
    category: s.category ?? undefined,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    metadata: {
      status: s.status,
      priority: s.priority,
      cost_type: s.cost_type,
    },
  }));
  return { nodes, edges: [] };
}
