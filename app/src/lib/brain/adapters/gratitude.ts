/**
 * Gratitude adapter — emits `gratitude` nodes from `grateful_things`.
 * Cross-module links (e.g. gratitude → person) are stored in
 * `brain_relations` since the table has no FK columns.
 */

import type { GratefulThing } from "@/types/database";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function gratitudeToGraph(input: {
  rows: GratefulThing[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((g): ConstellationNode => ({
    id: nodeId("gratitude", g.id),
    userId: input.userId,
    label: truncate(g.content || "Gratitude entry", 70),
    type: "gratitude",
    gratitudeId: g.id,
    description: g.content,
    category: g.category ?? undefined,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    metadata: {
      entry_date: g.entry_date,
      is_favorite: g.is_favorite,
    },
  }));
  return { nodes, edges: [] };
}
