/**
 * Assets adapter — emits `asset` nodes from `assets`. Documents are not
 * promoted to first-class graph nodes (too low signal); they remain on
 * the Resources page.
 */

import type { Asset } from "@/types/assets";
import type { ConstellationNode } from "@/types/constellation";
import { type AdapterOutput, nodeId, ownedBy, truncate } from "./_shared";

export function assetsToGraph(input: {
  rows: Asset[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const nodes: ConstellationNode[] = rows.map((a): ConstellationNode => ({
    id: nodeId("asset", a.id),
    userId: input.userId,
    label: truncate(a.name || "Unnamed asset"),
    type: "asset",
    assetId: a.id,
    category: a.category_key ?? a.category ?? undefined,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    metadata: {
      value: a.value,
      current_value: a.current_value,
    },
  }));
  return { nodes, edges: [] };
}
