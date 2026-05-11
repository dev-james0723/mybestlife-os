/**
 * Density filtering for the Brain canvas.
 *
 * The toolbar lets the user pick one of:
 *   - All Connections
 *   - Strong Only        (strength >= 0.75 OR explicit)
 *   - Explicit Only      (sourceMethod === 'explicit' / 'user_*')
 *   - Suggested Only     (status === 'suggested')
 *   - Orphans Only       (nodes with degree 0; edges all hidden so we
 *                         render orphans alone)
 *   - Domain pair filters: Knowledge↔Projects, Projects↔Tasks, etc.
 *
 * The filter is pure — pass in nodes + edges + mode, get back a filtered
 * pair. The renderer treats it like any other constellation graph data.
 */

import type {
  ConstellationEdge,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import type { BrainDensityMode } from "@/stores/brain-store";
import {
  getBrainSourceMethodFromCanvasEdge,
  getBrainTypeFromCanvasNode,
} from "@/lib/brain/compat";
import type { BrainNodeType } from "@/types/brain-graph";

export type DensityInput = ConstellationGraphData & {
  mode: BrainDensityMode;
};

/**
 * Returns a sub-graph filtered by density mode. Always preserves
 * confirmed/manual edges; only suggestion-quality edges are filtered out.
 */
export function applyDensityMode(input: DensityInput): ConstellationGraphData {
  const { nodes, edges, mode } = input;
  if (mode === "all") return { nodes, edges };

  if (mode === "strong_only") {
    return {
      nodes,
      edges: edges.filter((e) => isStrong(e)),
    };
  }

  if (mode === "explicit_only") {
    return {
      nodes,
      edges: edges.filter((e) => isExplicit(e)),
    };
  }

  if (mode === "suggested_only") {
    return {
      nodes,
      edges: edges.filter((e) => e.status === "suggested"),
    };
  }

  if (mode === "orphans_only") {
    const incident = new Set<string>();
    for (const e of edges) {
      if (e.status === "dismissed" || e.status === "hidden") continue;
      incident.add(e.source);
      incident.add(e.target);
    }
    const orphanNodes = nodes.filter((n) => !incident.has(n.id));
    return { nodes: orphanNodes, edges: [] };
  }

  // Domain pair filters.
  const pair = DOMAIN_PAIR_MODES[mode];
  if (pair) {
    return filterByDomainPair(nodes, edges, pair.aTypes, pair.bTypes);
  }

  return { nodes, edges };
}

// ============================================================
// Strength / explicitness checks
// ============================================================

function isStrong(edge: ConstellationEdge): boolean {
  // Confirmed + manual edges always count as strong.
  if (edge.isManual) return true;
  if (edge.isConfirmed) return true;
  const w = typeof edge.weight === "number" ? edge.weight : 0;
  return w >= 0.75;
}

function isExplicit(edge: ConstellationEdge): boolean {
  const method = getBrainSourceMethodFromCanvasEdge(edge);
  return (
    method === "explicit" ||
    method === "user_created" ||
    method === "user_confirmed"
  );
}

// ============================================================
// Domain pair filters
// ============================================================

const DOMAIN_PAIR_MODES: Partial<
  Record<
    BrainDensityMode,
    {
      aTypes: ReadonlySet<BrainNodeType>;
      bTypes: ReadonlySet<BrainNodeType>;
    }
  >
> = {
  knowledge_to_projects: {
    aTypes: new Set([
      "knowledge_card",
      "knowledge_collection",
      "knowledge_category",
      "smart_tag",
      "document",
    ]),
    bTypes: new Set(["project", "career_project"]),
  },
  projects_to_tasks: {
    aTypes: new Set(["project", "career_project"]),
    bTypes: new Set(["task", "daily_plan"]),
  },
  journal_to_people: {
    aTypes: new Set(["journal_entry", "gratitude_entry"]),
    bTypes: new Set([
      "relationship_person",
      "role_model",
      "organization",
    ]),
  },
  quotes_to_values: {
    aTypes: new Set(["quote"]),
    bTypes: new Set(["value", "goal"]),
  },
  finance_to_goals: {
    aTypes: new Set(["finance_item", "asset"]),
    bTypes: new Set(["goal", "bucket_list_item"]),
  },
  documents_to_knowledge: {
    aTypes: new Set(["document"]),
    bTypes: new Set([
      "knowledge_card",
      "knowledge_collection",
      "knowledge_category",
    ]),
  },
  ai_to_projects: {
    aTypes: new Set(["ai_knowledge", "tool", "workflow"]),
    bTypes: new Set(["project", "career_project"]),
  },
};

/** Filter to a sub-graph where every edge spans the given two domain sets. */
function filterByDomainPair(
  nodes: ConstellationNode[],
  edges: ConstellationEdge[],
  aTypes: ReadonlySet<BrainNodeType>,
  bTypes: ReadonlySet<BrainNodeType>,
): ConstellationGraphData {
  // For each node, look up its underlying BrainNodeType from metadata.
  const brainTypeOf = new Map<string, BrainNodeType | undefined>();
  for (const n of nodes) {
    brainTypeOf.set(n.id, getBrainTypeFromCanvasNode(n));
  }
  function inA(id: string): boolean {
    const t = brainTypeOf.get(id);
    return !!t && aTypes.has(t);
  }
  function inB(id: string): boolean {
    const t = brainTypeOf.get(id);
    return !!t && bTypes.has(t);
  }
  const keptEdges = edges.filter(
    (e) =>
      (inA(e.source) && inB(e.target)) || (inA(e.target) && inB(e.source)),
  );
  // Keep nodes that participate in any kept edge, plus the nodes from the
  // two domain sets so anchors stay visible even if no qualifying edge
  // exists for a given node.
  const keptIds = new Set<string>();
  for (const e of keptEdges) {
    keptIds.add(e.source);
    keptIds.add(e.target);
  }
  for (const n of nodes) {
    const t = brainTypeOf.get(n.id);
    if (t && (aTypes.has(t) || bTypes.has(t))) keptIds.add(n.id);
  }
  const keptNodes = nodes.filter((n) => keptIds.has(n.id));
  return { nodes: keptNodes, edges: keptEdges };
}

// ============================================================
// Helpers exported for the canvas (visual emphasis)
// ============================================================

/**
 * Map a numeric weight to a visual stroke class. The canvas already has
 * its own weight-aware styling, but we surface this constant for the UI
 * legend to keep visual intent in one place.
 */
export const VISUAL_STRENGTH = {
  STRONG: 0.75,
  MEDIUM: 0.55,
  WEAK: 0.4,
} as const;

/** Friendly label per density mode (used by the toolbar chips). */
export const DENSITY_MODE_LABEL: Record<BrainDensityMode, string> = {
  all: "All Connections",
  strong_only: "Strong Only",
  explicit_only: "Explicit",
  suggested_only: "Suggested",
  orphans_only: "Orphans",
  knowledge_to_projects: "Knowledge ↔ Projects",
  projects_to_tasks: "Projects ↔ Tasks",
  journal_to_people: "Journal ↔ People",
  quotes_to_values: "Quotes ↔ Values",
  finance_to_goals: "Finance ↔ Goals",
  documents_to_knowledge: "Docs ↔ Knowledge",
  ai_to_projects: "AI ↔ Projects",
};

/** Order of density chips in the toolbar (matches the target image). */
export const DENSITY_MODE_ORDER: BrainDensityMode[] = [
  "all",
  "strong_only",
  "suggested_only",
  "orphans_only",
];

/** "More density modes" — surfaced in the filters drawer. */
export const DENSITY_MODE_ADVANCED: BrainDensityMode[] = [
  "explicit_only",
  "knowledge_to_projects",
  "projects_to_tasks",
  "journal_to_people",
  "quotes_to_values",
  "finance_to_goals",
  "documents_to_knowledge",
  "ai_to_projects",
];
