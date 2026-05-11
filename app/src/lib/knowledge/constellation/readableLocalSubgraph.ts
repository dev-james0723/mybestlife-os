/**
 * Progressive disclosure for Local Orbit: cap nodes per depth tier so the
 * canvas stays readable while the full subgraph remains available for counts.
 */

import type {
  ConstellationDepth,
  ConstellationEdge,
  ConstellationNode,
} from "@/types/constellation";
import type { LocalSubgraphByDepthResult } from "@/lib/knowledge/constellation/getLocalSubgraph";

export type ReadableLocalOrbitStats = {
  /** Nodes in the full BFS subgraph before capping (same depth setting as view). */
  availableNodes: number;
  availableEdges: number;
  /** Nodes/edges actually sent to the canvas after caps + edge filter. */
  canvasNodes: number;
  canvasEdges: number;
};

export type ReadableLocalOrbitResult = LocalSubgraphByDepthResult & {
  stats: ReadableLocalOrbitStats;
};

function edgeScore(e: ConstellationEdge): number {
  const w = typeof e.weight === "number" ? e.weight : 0;
  const c = typeof e.confidence === "number" ? e.confidence : 1;
  return w * c;
}

function pickBestEdgeBetween(
  a: string,
  b: string,
  edges: readonly ConstellationEdge[],
): ConstellationEdge | null {
  let best: ConstellationEdge | null = null;
  let bestS = -1;
  for (const e of edges) {
    if (
      (e.source === a && e.target === b) ||
      (e.source === b && e.target === a)
    ) {
      const s = edgeScore(e);
      if (s > bestS) {
        bestS = s;
        best = e;
      }
    }
  }
  return best;
}

function nodeRank(n: ConstellationNode): number {
  const imp = n.importance ?? 0.5;
  const conn = Math.min(48, n.connectionCount ?? 0);
  return imp * 0.35 + conn / 48 * 0.35 + 0.3;
}

/** Rank direct neighbors (depth 1) for inclusion when over cap. */
function scoreDirectNeighbor(
  centerId: string,
  childId: string,
  nodesById: Map<string, ConstellationNode>,
  edges: readonly ConstellationEdge[],
): number {
  const n = nodesById.get(childId);
  const e = pickBestEdgeBetween(centerId, childId, edges);
  const es = e ? edgeScore(e) : 0;
  return es * 0.62 + (n ? nodeRank(n) : 0) * 0.38;
}

function refineChildScore(
  parentId: string,
  child: ConstellationNode,
  edges: readonly ConstellationEdge[],
): number {
  const e = pickBestEdgeBetween(parentId, child.id, edges);
  const es = e ? edgeScore(e) : 0;
  return es * 0.55 + nodeRank(child) * 0.45;
}

const CAPS: Record<
  ConstellationDepth,
  { d1: number; d2PerD1: number; d3PerD2: number }
> = {
  1: { d1: 20, d2PerD1: 5, d3PerD2: 2 },
  2: { d1: 20, d2PerD1: 5, d3PerD2: 2 },
  3: { d1: 12, d2PerD1: 3, d3PerD2: 2 },
};

/**
 * True when this edge is the BFS tree link or touches the center (radial spine).
 */
export function isLocalOrbitSpineEdge(
  e: ConstellationEdge,
  centerId: string,
  parentIdMap: ReadonlyMap<string, string | null>,
): boolean {
  const a = e.source;
  const b = e.target;
  if (a === centerId || b === centerId) return true;
  return parentIdMap.get(a) === b || parentIdMap.get(b) === a;
}

/**
 * Drop non-tree cross-links between depth≥2 endpoints to reduce hairballs.
 */
export function filterLocalOrbitCrossEdges(
  edges: readonly ConstellationEdge[],
  nodeDepthMap: ReadonlyMap<string, number>,
  parentIdMap: ReadonlyMap<string, string | null>,
  centerId: string,
  viewDepth: ConstellationDepth,
): ConstellationEdge[] {
  if (viewDepth <= 1) return [...edges];
  const out: ConstellationEdge[] = [];
  for (const e of edges) {
    const da = nodeDepthMap.get(e.source) ?? 0;
    const db = nodeDepthMap.get(e.target) ?? 0;
    if (
      da >= 2 &&
      db >= 2 &&
      !isLocalOrbitSpineEdge(e, centerId, parentIdMap)
    ) {
      continue;
    }
    out.push(e);
  }
  return out;
}

/**
 * Apply progressive caps to an already-extracted local subgraph (same depth
 * as the user's orbit depth selector).
 */
export function applyReadableLocalOrbitLimits(
  full: LocalSubgraphByDepthResult,
  centerNodeId: string,
  viewDepth: ConstellationDepth,
  nodesById: Map<string, ConstellationNode>,
): ReadableLocalOrbitResult {
  const caps = CAPS[viewDepth];
  const {
    nodeDepthMap: dm,
    parentIdMap: pm,
    edges: allEdges,
  } = full;

  const availableNodes = full.nodes.length;
  const availableEdges = full.edges.length;

  const kept = new Set<string>([centerNodeId]);

  const d1Ids = [...dm.entries()]
    .filter(([, d]) => d === 1)
    .map(([id]) => id)
    .sort((a, b) => {
      const sa = scoreDirectNeighbor(centerNodeId, a, nodesById, allEdges);
      const sb = scoreDirectNeighbor(centerNodeId, b, nodesById, allEdges);
      return sb - sa || b.localeCompare(a);
    });

  const topD1 = d1Ids.slice(0, caps.d1);
  for (const id of topD1) kept.add(id);

  if (viewDepth >= 2) {
    for (const p of topD1) {
      const d2kids = [...dm.entries()]
        .filter(([id, d]) => d === 2 && pm.get(id) === p)
        .map(([id]) => id)
        .sort((a, b) => {
          const na = nodesById.get(a);
          const nb = nodesById.get(b);
          if (!na || !nb) return a.localeCompare(b);
          return refineChildScore(p, nb, allEdges) - refineChildScore(p, na, allEdges);
        });
      for (const id of d2kids.slice(0, caps.d2PerD1)) {
        kept.add(id);
      }
    }
  }

  if (viewDepth >= 3) {
    const keptD2 = [...kept].filter((id) => dm.get(id) === 2);
    for (const p of keptD2) {
      const d3kids = [...dm.entries()]
        .filter(([id, d]) => d === 3 && pm.get(id) === p)
        .map(([id]) => id)
        .sort((a, b) => {
          const na = nodesById.get(a);
          const nb = nodesById.get(b);
          if (!na || !nb) return a.localeCompare(b);
          return refineChildScore(p, nb, allEdges) - refineChildScore(p, na, allEdges);
        });
      for (const id of d3kids.slice(0, caps.d3PerD2)) {
        kept.add(id);
      }
    }
  }

  const nodes = full.nodes.filter((n) => kept.has(n.id));
  let edges = full.edges.filter((e) => kept.has(e.source) && kept.has(e.target));
  edges = filterLocalOrbitCrossEdges(edges, dm, pm, centerNodeId, viewDepth);

  const nodeDepthMap = new Map<string, number>();
  const parentIdMap = new Map<string, string | null>();
  for (const id of kept) {
    nodeDepthMap.set(id, dm.get(id) ?? 0);
    parentIdMap.set(id, pm.get(id) ?? null);
  }

  const edgeDepthMap = new Map<string, number>();
  for (const e of edges) {
    const da = nodeDepthMap.get(e.source) ?? 99;
    const db = nodeDepthMap.get(e.target) ?? 99;
    edgeDepthMap.set(
      e.id,
      classifyEdgeDepthForLocal(da, db),
    );
  }

  return {
    nodes,
    edges,
    nodeDepthMap,
    edgeDepthMap,
    parentIdMap,
    stats: {
      availableNodes,
      availableEdges,
      canvasNodes: nodes.length,
      canvasEdges: edges.length,
    },
  };
}

function classifyEdgeDepthForLocal(da: number, db: number): 1 | 2 | 3 {
  if (da === 0 || db === 0) return 1;
  const hi = Math.max(da, db);
  const lo = Math.min(da, db);
  if (hi === 1) return 1;
  if (hi === 2 && lo === 1) return 2;
  if (hi === 2 && lo === 2) return 2;
  if (hi === 3 && lo === 2) return 3;
  if (hi === 3 && lo === 1) return 2;
  return 3;
}

/**
 * “Major hub” — may show a label at depth 3 when not hovering.
 */
export function isLocalOrbitMajorHub(node: ConstellationNode): boolean {
  if (
    node.type === "category" ||
    node.type === "project" ||
    node.type === "collection" ||
    node.type === "goal"
  ) {
    return true;
  }
  if ((node.connectionCount ?? 0) >= 14) return true;
  if ((node.importance ?? 0) >= 0.85) return true;
  return false;
}
