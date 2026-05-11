/**
 * Orphan detection — nodes whose graph degree is below a threshold.
 *
 * The orphan resolver asks: "which nodes in the user's brain are not yet
 * meaningfully connected to anything?" and then suggests connections.
 * The threshold is configurable because the user might want to surface
 * "weakly connected" nodes (degree 1) as well as true orphans (degree 0).
 */

import type { BrainEdge, BrainNode } from "@/types/brain-graph";
import type { BrainGraphData } from "@/lib/brain/compat";

export type OrphanInput = BrainGraphData & {
  /** Nodes with degree <= this are considered orphans. Default 0. */
  maxDegree?: number;
  /**
   * Node types to skip — by default we skip the synthetic anchor types
   * (`life_area`, `value`, `smart_tag`) because they are produced by the
   * engine itself and "orphan" anchors aren't meaningful.
   */
  skipTypes?: ReadonlySet<string>;
};

const DEFAULT_SKIP_TYPES = new Set<string>([
  "life_area",
  "value",
  "smart_tag",
  "knowledge_category",
]);

export type OrphanReport = {
  /** All nodes whose degree is at or below the threshold. */
  orphans: BrainNode[];
  /** Per-node degree map — useful for the UI's badge counts. */
  degree: Map<string, number>;
};

export function findOrphans(input: OrphanInput): OrphanReport {
  const skip = input.skipTypes ?? DEFAULT_SKIP_TYPES;
  const max = input.maxDegree ?? 0;

  const degree = new Map<string, number>();
  for (const n of input.nodes) degree.set(n.id, 0);
  for (const e of input.edges) {
    if (e.status === "rejected" || e.status === "hidden") continue;
    degree.set(e.sourceNodeId, (degree.get(e.sourceNodeId) ?? 0) + 1);
    degree.set(e.targetNodeId, (degree.get(e.targetNodeId) ?? 0) + 1);
  }

  const orphans: BrainNode[] = [];
  for (const n of input.nodes) {
    if (skip.has(n.type)) continue;
    const d = degree.get(n.id) ?? 0;
    if (d <= max) orphans.push(n);
  }

  // Sort by importance descending so high-importance orphans (e.g. an
  // active goal with no connections) bubble to the top.
  orphans.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

  return { orphans, degree };
}

/** Filter helper: orphans visible to the canvas (hidden/rejected dropped). */
export function visibleEdges(edges: BrainEdge[]): BrainEdge[] {
  return edges.filter((e) => e.status !== "rejected" && e.status !== "hidden");
}
