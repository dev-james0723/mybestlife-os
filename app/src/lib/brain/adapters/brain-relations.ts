/**
 * Brain Relations adapter — converts persisted rows from the
 * `brain_relations` table into `ConstellationEdge`s. Source/target ids
 * stored in the table are already namespaced (the writer is responsible for
 * passing the canonical id) so no additional prefixing happens here.
 *
 * Hidden / dismissed rows are skipped — they remain in the DB so the user
 * can restore them later but are absent from the rendered graph.
 */

import type { ConstellationEdge } from "@/types/constellation";
import type { BrainRelationRow } from "@/types/brain";
import { type AdapterOutput, edgeId, ownedBy } from "./_shared";

export function brainRelationsToEdges(input: {
  rows: BrainRelationRow[] | undefined;
  userId: string;
}): AdapterOutput {
  const rows = ownedBy(input.rows, input.userId);
  const edges: ConstellationEdge[] = [];
  for (const r of rows) {
    if (r.status === "hidden" || r.status === "dismissed") continue;
    edges.push({
      id: edgeId(r.source_id, r.target_id, r.relation_type),
      userId: r.user_id,
      source: r.source_id,
      target: r.target_id,
      sourceType: r.source_type,
      targetType: r.target_type,
      type: r.relation_type,
      status: r.status,
      weight: r.weight ?? 0.65,
      isManual: r.is_manual,
      isAISuggested: r.is_ai_suggested,
      reason: r.reason ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      metadata: r.metadata ?? undefined,
    });
  }
  return { nodes: [], edges };
}
