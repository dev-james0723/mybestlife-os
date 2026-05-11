/**
 * Brain graph diagnostics.
 *
 * Quantifies "is the user's brain actually connected?" so we can measure
 * whether each phase of the relationship engine actually reduces orphans
 * and grows meaningful connectivity. Used by the dev-only diagnostics
 * panel in `BrainView` and by future automated tests.
 *
 * The function is pure — pass in nodes + edges, get a diagnostics object
 * back. No I/O.
 */

import type {
  BrainEdge,
  BrainGraphDiagnostics,
  BrainNode,
} from "@/types/brain-graph";
import type { BrainGraphData } from "@/lib/brain/compat";

/**
 * Compute connectivity, type distribution, and orphan stats for a Brain
 * graph. Runs in O(N + E). Suitable for graphs up to ~10k nodes.
 */
export function analyzeBrainGraph(
  graph: BrainGraphData,
): BrainGraphDiagnostics {
  const { nodes, edges } = graph;

  // ── Build adjacency for component / degree stats ─────────────────────
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    if (!adj.has(e.sourceNodeId)) adj.set(e.sourceNodeId, new Set());
    if (!adj.has(e.targetNodeId)) adj.set(e.targetNodeId, new Set());
    adj.get(e.sourceNodeId)!.add(e.targetNodeId);
    adj.get(e.targetNodeId)!.add(e.sourceNodeId);
  }

  // ── Per-type counts ──────────────────────────────────────────────────
  const nodesByType: Record<string, number> = {};
  for (const n of nodes) {
    nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
  }

  const edgesByType: Record<string, number> = {};
  const edgesBySourceMethod: Record<string, number> = {};
  for (const e of edges) {
    edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
    edgesBySourceMethod[e.sourceMethod] =
      (edgesBySourceMethod[e.sourceMethod] ?? 0) + 1;
  }

  // ── Degree stats ─────────────────────────────────────────────────────
  let totalDegree = 0;
  let maxDegree = 0;
  let orphanCount = 0;
  const isolatedByDomain = new Map<string, number>();
  for (const n of nodes) {
    const deg = adj.get(n.id)?.size ?? 0;
    totalDegree += deg;
    if (deg > maxDegree) maxDegree = deg;
    if (deg === 0) {
      orphanCount += 1;
      isolatedByDomain.set(n.type, (isolatedByDomain.get(n.type) ?? 0) + 1);
    }
  }
  const averageDegree = nodes.length > 0 ? totalDegree / nodes.length : 0;

  // ── Connected components (BFS) ───────────────────────────────────────
  const seen = new Set<string>();
  const componentSizes: number[] = [];
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    let size = 0;
    const stack: string[] = [n.id];
    while (stack.length > 0) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      size += 1;
      const nbrs = adj.get(id);
      if (!nbrs) continue;
      for (const m of nbrs) {
        if (!seen.has(m)) stack.push(m);
      }
    }
    componentSizes.push(size);
  }
  componentSizes.sort((a, b) => b - a);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    orphanCount,
    orphanRate: nodes.length > 0 ? orphanCount / nodes.length : 0,
    componentCount: componentSizes.length,
    topComponentSizes: componentSizes.slice(0, 5),
    averageDegree,
    maxDegree,
    nodesByType,
    edgesByType,
    edgesBySourceMethod,
    isolatedNodesByDomain: Object.fromEntries(isolatedByDomain.entries()),
  };
}

/**
 * Format a diagnostics object as a single-line summary for console logs
 * and developer tooltips. Does not include per-type breakdowns.
 */
export function summarizeBrainDiagnostics(
  diag: BrainGraphDiagnostics,
): string {
  const orphanPct = (diag.orphanRate * 100).toFixed(1);
  const avgDeg = diag.averageDegree.toFixed(2);
  return (
    `${diag.totalNodes} nodes · ${diag.totalEdges} edges · ` +
    `${diag.orphanCount} orphans (${orphanPct}%) · ` +
    `${diag.componentCount} components (largest ${diag.topComponentSizes[0] ?? 0}) · ` +
    `avg degree ${avgDeg} · max degree ${diag.maxDegree}`
  );
}

/**
 * Helper for delta tracking — useful for "did phase N improve the graph?"
 * dashboards.
 */
export function deltaBrainDiagnostics(
  before: BrainGraphDiagnostics,
  after: BrainGraphDiagnostics,
): {
  orphanChange: number;
  edgeChange: number;
  componentChange: number;
} {
  return {
    orphanChange: after.orphanCount - before.orphanCount,
    edgeChange: after.totalEdges - before.totalEdges,
    componentChange: after.componentCount - before.componentCount,
  };
}

/**
 * Compute a single-edge diagnostic (used inside the relationship engine
 * during scoring to log how often each evidence path produced edges).
 */
export function describeEdge(edge: BrainEdge): string {
  return `[${edge.sourceMethod}/${edge.type}] s=${edge.strength.toFixed(
    2,
  )} c=${edge.confidence.toFixed(2)} ${edge.sourceNodeId}↔${edge.targetNodeId}`;
}

/** Tiny helper — finds the orphan nodes in a graph (degree === 0). */
export function findOrphanNodes(graph: BrainGraphData): BrainNode[] {
  const incident = new Set<string>();
  for (const e of graph.edges) {
    incident.add(e.sourceNodeId);
    incident.add(e.targetNodeId);
  }
  return graph.nodes.filter((n) => !incident.has(n.id));
}
