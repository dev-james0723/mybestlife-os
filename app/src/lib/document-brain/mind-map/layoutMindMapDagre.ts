import dagre from "dagre";
import type { DraftMindMapEdge, DraftMindMapNode } from "@/lib/document-brain/mind-map/mindMapTypes";

const NODE_W = 220;
const NODE_H = 72;

/**
 * Left-to-right layout for mind map drafts using dagre.
 */
export function layoutMindMapDagre(nodes: DraftMindMapNode[], edges: DraftMindMapEdge[]): DraftMindMapNode[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    ranksep: 90,
    nodesep: 36,
    marginx: 40,
    marginy: 40,
  });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of edges) {
    if (g.hasNode(e.source_node_id) && g.hasNode(e.target_node_id)) {
      g.setEdge(e.source_node_id, e.target_node_id);
    }
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) {
      return { ...n, position_x: n.position_x ?? 0, position_y: n.position_y ?? 0 };
    }
    const x = pos.x - NODE_W / 2;
    const y = pos.y - NODE_H / 2;
    return { ...n, position_x: x, position_y: y };
  });
}
