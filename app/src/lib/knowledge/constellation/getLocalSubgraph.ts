/**
 * Local-graph extraction (Obsidian "Local Graph" inspiration).
 *
 * Given a center node, returns the BFS subgraph up to the requested
 * depth. Edges are kept iff both endpoints are within the visited set.
 */

import type {
  ConstellationDepth,
  ConstellationEdge,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";

export type LocalSubgraphInput = ConstellationGraphData & {
  centerNodeId: string;
  depth: ConstellationDepth;
};

export type LocalSubgraphByDepthResult = {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
  nodeDepthMap: Map<string, number>;
  edgeDepthMap: Map<string, number>;
  parentIdMap: Map<string, string | null>;
};

function classifyEdgeDepth(da: number, db: number): 1 | 2 | 3 {
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

type AdjEntry = { nbr: string; edgeId: string };

/**
 * BFS subgraph with per-node depth (center = 0), BFS-tree parents for
 * layout, and per-edge visual depth (1 = touches center, 2 = bridges
 * depth-1↔2 or similar, 3 = outer).
 */
export function getLocalSubgraphByDepth(
  input: LocalSubgraphInput,
): LocalSubgraphByDepthResult {
  const { nodes, edges, centerNodeId, depth } = input;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  if (!nodeById.has(centerNodeId)) {
    return {
      nodes: [],
      edges: [],
      nodeDepthMap: new Map(),
      edgeDepthMap: new Map(),
      parentIdMap: new Map(),
    };
  }

  const adj = new Map<string, AdjEntry[]>();
  const addAdj = (a: string, b: string, edgeId: string) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ nbr: b, edgeId });
  };
  for (const e of edges) {
    addAdj(e.source, e.target, e.id);
    addAdj(e.target, e.source, e.id);
  }
  for (const [, list] of adj) {
    list.sort((u, v) =>
      u.edgeId.localeCompare(v.edgeId) || u.nbr.localeCompare(v.nbr),
    );
  }

  const nodeDepthMap = new Map<string, number>();
  const parentIdMap = new Map<string, string | null>();
  nodeDepthMap.set(centerNodeId, 0);
  parentIdMap.set(centerNodeId, null);

  let frontier = [centerNodeId];
  for (let d = 1; d <= depth; d++) {
    const next: string[] = [];
    const seenNext = new Set<string>();
    for (const id of frontier) {
      for (const { nbr } of adj.get(id) ?? []) {
        if (!nodeById.has(nbr)) continue;
        if (!nodeDepthMap.has(nbr)) {
          nodeDepthMap.set(nbr, d);
          parentIdMap.set(nbr, id);
          if (!seenNext.has(nbr)) {
            seenNext.add(nbr);
            next.push(nbr);
          }
        }
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }

  const visited = new Set(nodeDepthMap.keys());
  const outNodes = nodes.filter((n) => visited.has(n.id));
  const outEdges = edges.filter(
    (e) => visited.has(e.source) && visited.has(e.target),
  );

  const edgeDepthMap = new Map<string, number>();
  for (const e of outEdges) {
    const da = nodeDepthMap.get(e.source) ?? 99;
    const db = nodeDepthMap.get(e.target) ?? 99;
    edgeDepthMap.set(e.id, classifyEdgeDepth(da, db));
  }

  return {
    nodes: outNodes,
    edges: outEdges,
    nodeDepthMap,
    edgeDepthMap,
    parentIdMap,
  };
}

/** @deprecated Prefer getLocalSubgraphByDepth when depth styling matters. */
export function getLocalSubgraph(
  input: LocalSubgraphInput,
): ConstellationGraphData {
  const { nodes, edges } = getLocalSubgraphByDepth(input);
  return { nodes, edges };
}
