/**
 * Score helpers for the relationship engine.
 *
 * Each generator (explicit, taxonomy, entity, time, semantic) creates
 * candidate edges with raw signal strengths. This file provides a single
 * place that:
 *   - clamps signals to [0, 1]
 *   - combines multiple signals into a single (strength, confidence) pair
 *   - chooses a canonical reason from the strongest evidence
 *   - assigns the appropriate `status` based on thresholds
 *
 * Thresholds (per the plan):
 *   - strength >= 0.85 && confidence >= 0.85 → "high-confidence suggestion"
 *     (auto-confirm only when user opts in; otherwise renders as suggestion)
 *   - 0.65 <= strength < 0.85 → suggestion
 *   - < 0.65 → hidden by default
 */

import type {
  BrainEdge,
  BrainEdgeSourceMethod,
  BrainEdgeStatus,
  BrainEdgeType,
  BrainNodeType,
} from "@/types/brain-graph";
import { makeBrainEdgeId } from "@/lib/brain/compat";

export const STRENGTH_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.85,
  SUGGEST: 0.65,
  HIDE_BELOW: 0.65,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  HIGH_CONFIDENCE: 0.85,
} as const;

export function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function statusForScore(strength: number, confidence: number): BrainEdgeStatus {
  if (
    strength >= STRENGTH_THRESHOLDS.HIGH_CONFIDENCE &&
    confidence >= CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE
  ) {
    return "suggested";
  }
  if (strength >= STRENGTH_THRESHOLDS.SUGGEST) {
    return "suggested";
  }
  return "hidden";
}

/**
 * Build a `BrainEdge` from raw inputs, clamping scores and producing a
 * deterministic id. The relationship engine always goes through this so
 * shape and semantics stay consistent across signal sources.
 *
 * `evidence` is structured (not free-form) so the persistence layer can
 * later hash it for "rejected suggestions don't reappear" semantics.
 */
export function buildEdge(input: {
  userId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceNodeType?: BrainNodeType;
  targetNodeType?: BrainNodeType;
  type: BrainEdgeType;
  strength: number;
  confidence: number;
  reason: string;
  sourceMethod: BrainEdgeSourceMethod;
  status?: BrainEdgeStatus;
  evidence?: Record<string, unknown>;
}): BrainEdge {
  const strength = clamp01(input.strength);
  const confidence = clamp01(input.confidence);
  return {
    id: makeBrainEdgeId(input.type, input.sourceNodeId, input.targetNodeId),
    userId: input.userId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    sourceNodeType: input.sourceNodeType,
    targetNodeType: input.targetNodeType,
    type: input.type,
    strength,
    confidence,
    reason: input.reason,
    sourceMethod: input.sourceMethod,
    status: input.status ?? statusForScore(strength, confidence),
    evidence: input.evidence,
  };
}

/**
 * Merge two edges between the same two nodes (regardless of type/method).
 * Strategy:
 *   - keep the *strongest* edge as the visible one (renderer reads strength)
 *   - merge evidence keys so explanations from multiple paths are preserved
 *   - prefer "confirmed" status > "suggested" > "hidden"
 *
 * The output edge id is the strongest edge's id so deduplication stays
 * stable across rebuilds.
 */
export function mergeEdges(a: BrainEdge, b: BrainEdge): BrainEdge {
  const stronger = a.strength >= b.strength ? a : b;
  const weaker = stronger === a ? b : a;
  const status = pickStatus(stronger.status, weaker.status);

  return {
    ...stronger,
    status,
    evidence: { ...(weaker.evidence ?? {}), ...(stronger.evidence ?? {}) },
    metadata: { ...(weaker.metadata ?? {}), ...(stronger.metadata ?? {}) },
    reason: stronger.reason || weaker.reason,
  };
}

function pickStatus(
  a: BrainEdgeStatus,
  b: BrainEdgeStatus,
): BrainEdgeStatus {
  // Prefer confirmed > suggested > hidden > rejected.
  const order: BrainEdgeStatus[] = [
    "confirmed",
    "suggested",
    "hidden",
    "rejected",
  ];
  return order[Math.min(order.indexOf(a), order.indexOf(b))];
}

/**
 * Combine a set of "between the same two nodes" edges into one canonical
 * edge plus a list of "extra" edges (kept around for explanations). The
 * canonical edge is the strongest; extras are merged into its evidence.
 */
export function dedupeBetweenSamePair(edges: BrainEdge[]): BrainEdge[] {
  if (edges.length <= 1) return edges;
  const groups = new Map<string, BrainEdge[]>();
  for (const e of edges) {
    const a =
      e.sourceNodeId < e.targetNodeId ? e.sourceNodeId : e.targetNodeId;
    const b =
      e.sourceNodeId < e.targetNodeId ? e.targetNodeId : e.sourceNodeId;
    const key = `${a}::${b}`;
    const cur = groups.get(key);
    if (cur) cur.push(e);
    else groups.set(key, [e]);
  }
  const out: BrainEdge[] = [];
  for (const list of groups.values()) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    let merged = list[0];
    for (let i = 1; i < list.length; i++) merged = mergeEdges(merged, list[i]);
    out.push(merged);
  }
  return out;
}
