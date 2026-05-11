/**
 * Bridge: `brain_edges` rows → BrainEdge.
 *
 * Newer (post-Connected-Brain-Engine) persistence. Rows store full
 * scoring + evidence and use Brain-namespaced node ids ("goal::abc").
 *
 * Mapping is therefore mostly direct.
 */

import type { BrainEdge } from "@/types/brain-graph";
import type { BrainEdgeRow } from "@/lib/brain/edges";
import { makeBrainEdgeId } from "@/lib/brain/compat";

export function brainEdgeRowsToBrainEdges(input: {
  rows: BrainEdgeRow[] | undefined;
  userId: string;
  knownNodeIds: ReadonlySet<string>;
}): BrainEdge[] {
  if (!input.rows) return [];
  const out: BrainEdge[] = [];
  for (const row of input.rows) {
    if (row.user_id !== input.userId) continue;
    if (!input.knownNodeIds.has(row.source_node_id)) continue;
    if (!input.knownNodeIds.has(row.target_node_id)) continue;
    out.push({
      id: makeBrainEdgeId(
        row.relationship_type,
        row.source_node_id,
        row.target_node_id,
      ),
      userId: row.user_id,
      sourceNodeId: row.source_node_id,
      targetNodeId: row.target_node_id,
      sourceNodeType: row.source_node_type,
      targetNodeType: row.target_node_type,
      type: row.relationship_type,
      strength: row.strength,
      confidence: row.confidence,
      reason: row.reason,
      sourceMethod: row.source_method,
      status: row.status,
      persistenceId: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      evidence: row.evidence ?? undefined,
      metadata: row.metadata ?? undefined,
    });
  }
  return out;
}

/**
 * Compute the set of evidence hashes for rejected rows. The relationship
 * engine consults this set to drop newly-generated suggestions whose
 * canonical hash matches a previously rejected one.
 */
export function rejectedEvidenceHashes(rows: BrainEdgeRow[] | undefined): Set<string> {
  const out = new Set<string>();
  if (!rows) return out;
  for (const r of rows) {
    if (r.status !== "rejected") continue;
    if (r.evidence_hash && r.evidence_hash.length > 0) out.add(r.evidence_hash);
  }
  return out;
}
