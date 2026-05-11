/**
 * Connected Brain Engine — central graph builder.
 *
 * Pipeline (per user, per render):
 *
 *   1. Featurize every BrainNode (one-time per node tokenization).
 *   2. Run explicit-edge generator (FK/linked_*_ids; very high confidence).
 *   3. Run taxonomy generators (tag clusters, life areas, values) —
 *      synthesize anchor nodes when a cluster has 2+ members.
 *   4. Run entity-mention generator over body text.
 *   5. Run time-proximity generator (gentle; emits hidden by default).
 *   6. Merge in any persisted edges from `brain_edges` (DB).
 *   7. Dedupe overlapping edges, keeping the strongest evidence and
 *      promoting status as evidence accumulates.
 *   8. Drop edges whose endpoints don't exist after node materialization.
 *   9. Compute connectionCount + per-node degree.
 *
 * The output is `BrainGraphData`. The caller (`buildBrainData.ts`) maps
 * it through `compat.brainGraphToConstellationGraph` for the canvas.
 */

import type {
  BrainEdge,
  BrainNode,
} from "@/types/brain-graph";
import type { BrainGraphData } from "@/lib/brain/compat";

import type { HabitLink } from "@/lib/habits/types";
import { computeEvidenceHashSync } from "@/lib/brain/evidenceHash";
import { featurizeAll, buildFeatureIndex } from "./featurize";
import { generateExplicitEdges } from "./generateExplicitEdges";
import { generateHabitLinkEdges } from "./generateHabitLinkEdges";
import { generateTaxonomyEdges } from "./generateTaxonomyEdges";
import { generateEntityEdges } from "./generateEntityEdges";
import { generateTimeEdges } from "./generateTimeEdges";
import {
  STRENGTH_THRESHOLDS,
  dedupeBetweenSamePair,
  mergeEdges,
} from "./scoreEdge";

export type BuildBrainGraphOptions = {
  /** Hard cap on emitted nodes (sorted by connection count desc). */
  maxNodes?: number;
  /** Drop nodes with no edges (calmer canvas). */
  hideOrphanNodes?: boolean;
  /** Minimum strength for an edge to be visible (suggested or stronger). */
  minStrength?: number;
  /**
   * Skip generators by name. Used for diagnostics ("how many edges came
   * from explicit-only?"). Defaults: all enabled.
   */
  disable?: {
    explicit?: boolean;
    taxonomy?: boolean;
    entity?: boolean;
    time?: boolean;
  };
};

export type BuildBrainGraphInput = {
  userId: string;
  nodes: BrainNode[];
  /** Persisted edges from `brain_edges` / legacy `brain_relations`. */
  persistedEdges?: BrainEdge[];
  /** Habit polymorphic links (`habit_links` table). */
  habitLinks?: HabitLink[];
  /**
   * Hashes of suggestions the user has previously rejected. Newly-
   * generated edges whose canonical evidence hash matches one of these
   * are dropped before scoring/dedup.
   */
  rejectedEvidenceHashes?: ReadonlySet<string>;
  options?: BuildBrainGraphOptions;
};

export const DEFAULT_BUILD_OPTIONS: Required<
  Omit<BuildBrainGraphOptions, "disable">
> = {
  maxNodes: 4000,
  hideOrphanNodes: false,
  minStrength: STRENGTH_THRESHOLDS.SUGGEST - 0.05,
};

export function buildBrainGraph(input: BuildBrainGraphInput): BrainGraphData {
  const opts = {
    ...DEFAULT_BUILD_OPTIONS,
    ...(input.options ?? {}),
  };
  const disable = input.options?.disable ?? {};
  const userId = input.userId;
  const userNodes = input.nodes.filter((n) => n.userId === userId);

  // ── Step 1: featurize + index ─────────────────────────────────────
  const features = featurizeAll(userNodes);
  const index = buildFeatureIndex(features);

  // ── Step 2: explicit edges ────────────────────────────────────────
  const knownIdsBeforeAnchors = new Set(userNodes.map((n) => n.id));
  const explicit = disable.explicit
    ? []
    : [
        ...generateExplicitEdges({ nodes: userNodes, userId }),
        ...generateHabitLinkEdges({
          rows: input.habitLinks,
          userId,
          knownNodeIds: knownIdsBeforeAnchors,
        }),
      ];

  // ── Step 3: taxonomy / anchor edges ───────────────────────────────
  const taxonomy = disable.taxonomy
    ? { anchorNodes: [], edges: [] }
    : generateTaxonomyEdges({ nodes: userNodes, index, userId });

  // ── Step 4: entity-mention edges ──────────────────────────────────
  // Use the FULL node set (including taxonomy anchors) so that "mentions
  // <project>" still resolves when only the project node exists.
  const allNodesAfterAnchors: BrainNode[] = [
    ...userNodes,
    ...taxonomy.anchorNodes,
  ];
  // Re-featurize the new anchor nodes too so they appear in the index.
  if (taxonomy.anchorNodes.length > 0) {
    const extra = featurizeAll(taxonomy.anchorNodes);
    for (const f of extra) index.byNodeId.set(f.nodeId, f);
  }

  const entity = disable.entity
    ? []
    : generateEntityEdges({ nodes: userNodes, index, userId });

  // ── Step 5: time edges ────────────────────────────────────────────
  const time = disable.time
    ? []
    : generateTimeEdges({ nodes: userNodes, index, userId });

  // ── Step 6: persisted edges ───────────────────────────────────────
  const persisted = input.persistedEdges ?? [];

  // ── Step 7: merge + dedupe ────────────────────────────────────────
  const allEdgesRaw: BrainEdge[] = [
    ...explicit,
    ...taxonomy.edges,
    ...entity,
    ...time,
    ...persisted,
  ];
  // Drop newly-generated suggestions whose canonical hash matches a row
  // the user has previously rejected. Confirmed/persistence-loaded edges
  // bypass this — only freshly engine-generated suggestions are filtered.
  const rejectedHashes = input.rejectedEvidenceHashes;
  const rejectionFiltered =
    rejectedHashes && rejectedHashes.size > 0
      ? allEdgesRaw.filter((e) => {
          if (e.status === "confirmed") return true;
          // The persisted edges already carry persistenceId; skip them too.
          if (e.persistenceId) return true;
          const hash = computeEvidenceHashSync({
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            relationshipType: e.type,
            evidence: e.evidence ?? null,
          });
          return !rejectedHashes.has(hash);
        })
      : allEdgesRaw;
  const dedupedByPair = dedupeBetweenSamePair(rejectionFiltered);

  // Dedupe by edge id too (different types between same nodes coexist;
  // but two identical (id, type) collapse via mergeEdges).
  const byId = new Map<string, BrainEdge>();
  for (const e of dedupedByPair) {
    const cur = byId.get(e.id);
    if (cur) byId.set(e.id, mergeEdges(cur, e));
    else byId.set(e.id, e);
  }

  // ── Step 8: drop edges missing endpoints ──────────────────────────
  const knownIds = new Set(allNodesAfterAnchors.map((n) => n.id));
  const validEdges: BrainEdge[] = [];
  for (const e of byId.values()) {
    if (!knownIds.has(e.sourceNodeId) || !knownIds.has(e.targetNodeId)) {
      continue;
    }
    if (e.strength < opts.minStrength && e.status !== "confirmed") continue;
    validEdges.push(e);
  }

  // ── Step 9: connection counts ─────────────────────────────────────
  const counts = new Map<string, number>();
  for (const e of validEdges) {
    counts.set(e.sourceNodeId, (counts.get(e.sourceNodeId) ?? 0) + 1);
    counts.set(e.targetNodeId, (counts.get(e.targetNodeId) ?? 0) + 1);
  }
  let outNodes: BrainNode[] = allNodesAfterAnchors.map((n) => {
    const cur = counts.get(n.id) ?? 0;
    return {
      ...n,
      metadata: {
        ...(n.metadata ?? {}),
        connectionCount: cur,
      },
    };
  });

  if (opts.hideOrphanNodes) {
    outNodes = outNodes.filter((n) => {
      const cnt = (n.metadata as { connectionCount?: number } | undefined)
        ?.connectionCount ?? 0;
      return cnt > 0;
    });
  }

  if (outNodes.length > opts.maxNodes) {
    outNodes = [...outNodes]
      .sort((a, b) => {
        const aCnt =
          (a.metadata as { connectionCount?: number } | undefined)
            ?.connectionCount ?? 0;
        const bCnt =
          (b.metadata as { connectionCount?: number } | undefined)
            ?.connectionCount ?? 0;
        return bCnt - aCnt;
      })
      .slice(0, opts.maxNodes);
  }

  const keptIds = new Set(outNodes.map((n) => n.id));
  const finalEdges = validEdges.filter(
    (e) => keptIds.has(e.sourceNodeId) && keptIds.has(e.targetNodeId),
  );

  return { nodes: outNodes, edges: finalEdges };
}
