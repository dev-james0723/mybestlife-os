/**
 * Filtering layer for the Constellation View.
 *
 * Pure: takes nodes + edges + a filter object and returns a new pair.
 * The filter design follows the rule "search helps focus, it does not
 * collapse the graph by itself" — the search query is used to build a
 * `matchedNodeIds` Set, but actual hide/show decisions come from the
 * boolean toggles. The Toolbar uses the search match set to highlight
 * + center camera on the first match.
 */

import type {
  ConstellationEdge,
  ConstellationFilters,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";

export type FilterConstellationInput = ConstellationGraphData & {
  filters?: ConstellationFilters;
};

export type FilteredConstellationData = ConstellationGraphData & {
  /** Nodes that match the search query, used for highlight/focus. */
  matchedNodeIds: Set<string>;
};

function lower(value: string | undefined): string {
  return (value ?? "").toLowerCase();
}

function nodeMatchesSearch(node: ConstellationNode, q: string): boolean {
  if (!q) return false;
  const ql = q.toLowerCase();
  if (lower(node.label).includes(ql)) return true;
  if (lower(node.description).includes(ql)) return true;
  if (lower(node.collectionName).includes(ql)) return true;
  if (lower(node.sourceType).includes(ql)) return true;
  if (lower(node.category).includes(ql)) return true;
  if (node.tags?.some((t) => t.toLowerCase().includes(ql))) return true;
  return false;
}

export function filterConstellationData(
  input: FilterConstellationInput,
): FilteredConstellationData {
  const { nodes, edges, filters } = input;
  const f: ConstellationFilters = filters ?? {};

  const matchedNodeIds = new Set<string>();
  const search = (f.search ?? "").trim();
  if (search) {
    for (const n of nodes) {
      if (nodeMatchesSearch(n, search)) matchedNodeIds.add(n.id);
    }
  }

  let outNodes: ConstellationNode[] = [...nodes];

  if (f.nodeTypes && f.nodeTypes.length > 0) {
    const set = new Set(f.nodeTypes);
    outNodes = outNodes.filter((n) => set.has(n.type));
  }

  if (f.showCategoryNodes === false)
    outNodes = outNodes.filter((n) => n.type !== "category");
  if (f.showTagNodes === false)
    outNodes = outNodes.filter((n) => n.type !== "tag");
  if (f.showCollectionNodes === false)
    outNodes = outNodes.filter((n) => n.type !== "collection");
  if (f.showSourceNodes === false)
    outNodes = outNodes.filter((n) => n.type !== "source");
  if (f.showProjectNodes === false)
    outNodes = outNodes.filter((n) => n.type !== "project");
  if (f.showEntityNodes === false)
    outNodes = outNodes.filter(
      (n) =>
        n.type !== "person" &&
        n.type !== "organization" &&
        n.type !== "concept",
    );

  if (f.collectionIds && f.collectionIds.length > 0) {
    const set = new Set(f.collectionIds);
    outNodes = outNodes.filter(
      (n) =>
        n.type !== "collection" || (n.collectionId !== undefined && set.has(n.collectionId)),
    );
  }
  if (f.tagIds && f.tagIds.length > 0) {
    const set = new Set(f.tagIds.map((s) => s.toLowerCase()));
    outNodes = outNodes.filter(
      (n) =>
        n.type !== "tag" || (n.tagId !== undefined && set.has(n.tagId.toLowerCase())),
    );
  }
  if (f.sourceTypes && f.sourceTypes.length > 0) {
    const set = new Set(f.sourceTypes);
    outNodes = outNodes.filter(
      (n) =>
        n.type !== "source" || (n.sourceType !== undefined && set.has(n.sourceType)),
    );
  }
  if (f.projectIds && f.projectIds.length > 0) {
    const set = new Set(f.projectIds);
    outNodes = outNodes.filter(
      (n) =>
        n.type !== "project" || (n.projectId !== undefined && set.has(n.projectId)),
    );
  }

  if (f.dateFrom || f.dateTo) {
    const fromMs = f.dateFrom ? new Date(f.dateFrom).getTime() : undefined;
    const toMs = f.dateTo ? new Date(f.dateTo).getTime() : undefined;
    outNodes = outNodes.filter((n) => {
      // Only enforce date filters on knowledge nodes; other types are
      // structural.
      if (n.type !== "knowledge") return true;
      const t = n.createdAt ? new Date(n.createdAt).getTime() : undefined;
      if (t === undefined || Number.isNaN(t)) return true;
      if (fromMs !== undefined && t < fromMs) return false;
      if (toMs !== undefined && t > toMs) return false;
      return true;
    });
  }

  if (typeof f.minConnectionCount === "number" && f.minConnectionCount > 0) {
    outNodes = outNodes.filter(
      (n) => (n.connectionCount ?? 0) >= (f.minConnectionCount ?? 0),
    );
  }

  // Edge filtering ---------------------------------------------------
  const keptIds = new Set(outNodes.map((n) => n.id));
  let outEdges: ConstellationEdge[] = edges.filter(
    (e) => keptIds.has(e.source) && keptIds.has(e.target),
  );

  if (f.relationTypes && f.relationTypes.length > 0) {
    const set = new Set(f.relationTypes);
    outEdges = outEdges.filter((e) => set.has(e.type));
  }

  if (f.showSemanticLinks === false) {
    outEdges = outEdges.filter((e) => e.type !== "semantic_similarity");
  }

  if (f.showAISuggestedLinks === false) {
    outEdges = outEdges.filter((e) => e.type !== "ai_suggested_link");
  }

  if (f.showManualLinksOnly) {
    outEdges = outEdges.filter(
      (e) => e.type === "manual_link" || e.type === "explicit_link",
    );
  }

  if (
    typeof f.minSemanticConfidence === "number" &&
    f.minSemanticConfidence > 0
  ) {
    outEdges = outEdges.filter((e) => {
      if (e.type !== "semantic_similarity" && e.type !== "ai_suggested_link") {
        return true;
      }
      return (e.confidence ?? 0) >= (f.minSemanticConfidence ?? 0);
    });
  }

  // Hide-orphan after edge filtering, otherwise we'd see empty bubbles.
  if (f.hideOrphanNodes) {
    const used = new Set<string>();
    for (const e of outEdges) {
      used.add(e.source);
      used.add(e.target);
    }
    outNodes = outNodes.filter((n) => used.has(n.id));
  }

  return {
    nodes: outNodes,
    edges: outEdges,
    matchedNodeIds,
  };
}
