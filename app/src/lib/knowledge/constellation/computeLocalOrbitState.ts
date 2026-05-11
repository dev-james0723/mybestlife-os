/**
 * Single source of truth for Local Orbit (BFS depth mode): ring membership,
 * counts, and representative edges for the inspection panel. Graph layout
 * positions are computed separately in `computeLocalSubgraphRingLayout` but
 * use the same depth maps from `getLocalSubgraphByDepth`.
 */

import type {
  ConstellationDepth,
  ConstellationEdge,
  ConstellationNode,
  ConstellationNodeType,
} from "@/types/constellation";

export type LocalOrbitRingMember = {
  node: ConstellationNode;
  /** Best edge explaining how this node attaches into the local tree */
  edge: ConstellationEdge;
  score: number;
  /** BFS hop distance from center (1, 2, or 3) */
  depth: number;
};

export type LocalOrbitRingGroups = {
  /** Depth 1 — direct neighbors of the center */
  inner: LocalOrbitRingMember[];
  /** Depth 2 — second hop */
  middle: LocalOrbitRingMember[];
  /** Depth 3 — third hop */
  outer: LocalOrbitRingMember[];
};

export type LocalOrbitState = {
  centerNode: ConstellationNode;
  maxDepth: ConstellationDepth;
  /**
   * Full local neighborhood (typically depth-3 BFS) for the side panel:
   * ring lists reflect everything that exists, not just the canvas subset.
   */
  availabilityNodes: ConstellationNode[];
  availabilityEdges: ConstellationEdge[];
  ringGroups: LocalOrbitRingGroups;
  counts: {
    /** Nodes in the full neighborhood used for panel + availability. */
    totalAvailableNodes: number;
    totalAvailableEdges: number;
    /** Nodes/edges actually drawn on the canvas (after readability caps). */
    canvasNodes: number;
    canvasEdges: number;
    innerRingCount: number;
    middleRingCount: number;
    outerRingCount: number;
  };
};

const TEXT_HEAVY_TYPES: ReadonlySet<ConstellationNodeType> = new Set([
  "quote",
  "journal_entry",
  "knowledge",
  "idea",
  "daily_plan",
]);

function edgeScore(edge: ConstellationEdge): number {
  const w = typeof edge.weight === "number" ? edge.weight : 0;
  const c = typeof edge.confidence === "number" ? edge.confidence : 1;
  return w * c;
}

function findEdgesBetween(
  edges: readonly ConstellationEdge[],
  a: string,
  b: string,
): ConstellationEdge[] {
  const out: ConstellationEdge[] = [];
  for (const e of edges) {
    if (
      (e.source === a && e.target === b) ||
      (e.source === b && e.target === a)
    ) {
      out.push(e);
    }
  }
  return out;
}

function pickStrongestEdge(candidates: ConstellationEdge[]): ConstellationEdge | null {
  if (candidates.length === 0) return null;
  let best = candidates[0]!;
  let bestS = edgeScore(best);
  for (let i = 1; i < candidates.length; i++) {
    const e = candidates[i]!;
    const s = edgeScore(e);
    if (s > bestS) {
      bestS = s;
      best = e;
    }
  }
  return best;
}

/**
 * Representative edge for a node in the local subgraph: prefer the BFS
 * parent link, else any strongest incident edge in the subgraph.
 */
export function pickLocalOrbitRepresentativeEdge(
  nodeId: string,
  centerId: string,
  parentId: string | null | undefined,
  edges: readonly ConstellationEdge[],
): ConstellationEdge | null {
  if (parentId !== null && parentId !== undefined) {
    const tree = findEdgesBetween(edges, nodeId, parentId);
    const e = pickStrongestEdge(tree);
    if (e) return e;
  }
  const toCenter = findEdgesBetween(edges, nodeId, centerId);
  const c = pickStrongestEdge(toCenter);
  if (c) return c;
  const incident = edges.filter((e) => e.source === nodeId || e.target === nodeId);
  return pickStrongestEdge(incident);
}

export function computeLocalOrbitState(input: {
  centerNodeId: string;
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  nodeDepthMap: ReadonlyMap<string, number>;
  parentIdMap: ReadonlyMap<string, string | null>;
  maxDepth: ConstellationDepth;
  /**
   * Optional counts for what the canvas actually renders when using progressive disclosure.
   */
  canvasSubset?: { nodeCount: number; edgeCount: number };
}): LocalOrbitState | null {
  const center = input.nodes.find((n) => n.id === input.centerNodeId);
  if (!center) return null;

  const inner: LocalOrbitRingMember[] = [];
  const middle: LocalOrbitRingMember[] = [];
  const outer: LocalOrbitRingMember[] = [];

  for (const n of input.nodes) {
    if (n.id === input.centerNodeId) continue;
    const d = input.nodeDepthMap.get(n.id);
    if (d === undefined || d < 1) continue;
    const parent = input.parentIdMap.get(n.id);
    const edge = pickLocalOrbitRepresentativeEdge(
      n.id,
      input.centerNodeId,
      parent,
      input.edges,
    );
    if (!edge) continue;
    const score = edgeScore(edge);
    const member: LocalOrbitRingMember = { node: n, edge, score, depth: d };
    if (d === 1) inner.push(member);
    else if (d === 2) middle.push(member);
    else outer.push(member);
  }

  const byScore = (a: LocalOrbitRingMember, b: LocalOrbitRingMember) =>
    b.score - a.score;
  inner.sort(byScore);
  middle.sort(byScore);
  outer.sort(byScore);

  return {
    centerNode: center,
    maxDepth: input.maxDepth,
    availabilityNodes: input.nodes,
    availabilityEdges: input.edges,
    ringGroups: { inner, middle, outer },
    counts: {
      totalAvailableNodes: input.nodes.length,
      totalAvailableEdges: input.edges.length,
      canvasNodes: input.canvasSubset?.nodeCount ?? input.nodes.length,
      canvasEdges: input.canvasSubset?.edgeCount ?? input.edges.length,
      innerRingCount: inner.length,
      middleRingCount: middle.length,
      outerRingCount: outer.length,
    },
  };
}

/**
 * Canvas / panel: shorten long labels, especially quotes and long notes.
 */
export function truncateLabelForLocalOrbitCanvas(
  node: ConstellationNode,
  graphDepth: number | undefined,
): string {
  const raw = node.label;
  const heavy =
    TEXT_HEAVY_TYPES.has(node.type) ||
    raw.length > 52 ||
    raw.includes("\n");
  let maxChars = 34;
  if (heavy) {
    if (graphDepth === 3) maxChars = 20;
    else if (graphDepth === 2) maxChars = 26;
    else maxChars = 30;
  }
  const oneLine = raw.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxChars) return oneLine;
  return `${oneLine.slice(0, Math.max(1, maxChars - 1))}…`;
}
