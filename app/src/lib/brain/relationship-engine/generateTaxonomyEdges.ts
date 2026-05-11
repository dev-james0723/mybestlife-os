/**
 * Taxonomy-edge generator.
 *
 * Builds three families of edges from canonical Brain taxonomy overlap:
 *
 *   1. Tag-cluster edges. When 2+ nodes share a canonical topic slug
 *      (e.g. both mention `ai-music`), the engine creates a synthetic
 *      `smart_tag` anchor node and connects each member to it.
 *
 *   2. Life-area anchor edges. Each life area mentioned by 2+ nodes
 *      becomes a virtual `life_area` anchor node — the big hubs in the
 *      target image (Career, Finance, Knowledge, …). Members connect via
 *      `same_life_area`.
 *
 *   3. Value anchor edges. Quote/journal/goal/decision nodes that mention
 *      a canonical value (Discipline, Freedom, Gratitude…) connect to a
 *      synthetic `value` anchor.
 *
 * The synthetic anchor pattern keeps the canvas readable: instead of N×N
 * edges between every member of the same cluster, all members connect to
 * one anchor, producing the radial spoke pattern visible in the target
 * image.
 */

import type { BrainEdge, BrainNode } from "@/types/brain-graph";
import { isGenericTopic, getLifeArea, getTopic, getValue, type LifeAreaSlug, type ValueSlug } from "@/lib/brain/taxonomy";
import { matchValuesInText } from "@/lib/brain/taxonomy";
import { makeBrainNodeId } from "@/lib/brain/compat";
import { buildEdge } from "./scoreEdge";
import type { FeatureIndex } from "./featurize";

const MIN_CLUSTER_SIZE = 2;

type AnchorSpec =
  | { kind: "topic"; slug: string }
  | { kind: "life_area"; slug: LifeAreaSlug }
  | { kind: "value"; slug: ValueSlug };

function anchorIdFor(spec: AnchorSpec): string {
  switch (spec.kind) {
    case "topic":
      return makeBrainNodeId("smart_tag", spec.slug);
    case "life_area":
      return makeBrainNodeId("life_area", spec.slug);
    case "value":
      return makeBrainNodeId("value", spec.slug);
  }
}

function anchorTitleFor(spec: AnchorSpec): string {
  switch (spec.kind) {
    case "topic": {
      const topic = getTopic(spec.slug);
      return topic ? topic.name : spec.slug.replace(/-/g, " ");
    }
    case "life_area": {
      const def = getLifeArea(spec.slug);
      return def ? def.name : spec.slug;
    }
    case "value": {
      const v = getValue(spec.slug);
      return v ? v.name : spec.slug;
    }
  }
}

function anchorImportanceFor(spec: AnchorSpec, members: number): number {
  // Bigger anchors should pull more visually. Cap at 1.0.
  if (spec.kind === "life_area") return Math.min(1.0, 0.7 + members * 0.02);
  if (spec.kind === "value") return Math.min(0.85, 0.55 + members * 0.02);
  return Math.min(0.8, 0.45 + members * 0.02);
}

/**
 * Result type — returns both the synthetic anchor nodes and the edges
 * that connect members to those anchors. The caller (buildBrainGraph)
 * merges these into the main node/edge sets.
 */
export type TaxonomyEdgeResult = {
  anchorNodes: BrainNode[];
  edges: BrainEdge[];
};

export function generateTaxonomyEdges(input: {
  nodes: BrainNode[];
  index: FeatureIndex;
  userId: string;
}): TaxonomyEdgeResult {
  const { index, userId } = input;
  const nodeById = index.byNodeId;
  const anchorNodes = new Map<string, BrainNode>();
  const edges: BrainEdge[] = [];

  // ── 1. Topic clusters ───────────────────────────────────────────────
  for (const [slug, members] of index.byTopicCluster) {
    if (members.size < MIN_CLUSTER_SIZE) continue;
    if (isGenericTopic(slug)) continue;
    const spec: AnchorSpec = { kind: "topic", slug };
    const anchorId = anchorIdFor(spec);
    if (!anchorNodes.has(anchorId)) {
      anchorNodes.set(anchorId, makeAnchorNode(spec, members.size, userId));
    }
    for (const memberId of members) {
      const mem = nodeById.get(memberId);
      if (!mem) continue;
      edges.push(
        buildEdge({
          userId,
          sourceNodeId: mem.nodeId,
          targetNodeId: anchorId,
          sourceNodeType: mem.nodeType,
          targetNodeType: "smart_tag",
          type: "tagged_with",
          strength: 0.55,
          confidence: 0.7,
          reason: `Tagged with "${anchorTitleFor(spec)}"`,
          sourceMethod: "tag",
          status: "confirmed",
          evidence: { tagSlug: slug },
        }),
      );
    }
  }

  // ── 2. Life-area anchors ────────────────────────────────────────────
  for (const [slug, members] of index.byLifeArea) {
    if (members.size < MIN_CLUSTER_SIZE) continue;
    const spec: AnchorSpec = { kind: "life_area", slug: slug as LifeAreaSlug };
    const anchorId = anchorIdFor(spec);
    if (!anchorNodes.has(anchorId)) {
      anchorNodes.set(anchorId, makeAnchorNode(spec, members.size, userId));
    }
    for (const memberId of members) {
      const mem = nodeById.get(memberId);
      if (!mem) continue;
      edges.push(
        buildEdge({
          userId,
          sourceNodeId: mem.nodeId,
          targetNodeId: anchorId,
          sourceNodeType: mem.nodeType,
          targetNodeType: "life_area",
          type: "same_life_area",
          // Life area connections are strong because the user has
          // organized the entity under this life area explicitly.
          strength: 0.75,
          confidence: 0.85,
          reason: `Belongs to life area: ${anchorTitleFor(spec)}`,
          sourceMethod: "life_area",
          status: "confirmed",
          evidence: { lifeArea: slug },
        }),
      );
    }
  }

  // ── 3. Value anchors (scan body text for value aliases) ─────────────
  // Only for node types that semantically contain values: quotes,
  // journal entries, goals, decisions, role models. We don't scan tasks
  // or daily plans for values to keep the anchor selective.
  const valueScannableTypes = new Set([
    "quote",
    "journal_entry",
    "goal",
    "decision",
    "role_model",
    "memory",
    "about_me",
    "gratitude_entry",
  ]);
  const valueMembers = new Map<ValueSlug, Set<string>>();
  for (const node of input.nodes) {
    if (!valueScannableTypes.has(node.type)) continue;
    const features = nodeById.get(node.id);
    if (!features) continue;
    const detected = matchValuesInText(features.searchText);
    for (const v of detected) {
      let set = valueMembers.get(v);
      if (!set) {
        set = new Set();
        valueMembers.set(v, set);
      }
      set.add(node.id);
    }
  }
  for (const [slug, members] of valueMembers) {
    if (members.size < MIN_CLUSTER_SIZE) continue;
    const spec: AnchorSpec = { kind: "value", slug };
    const anchorId = anchorIdFor(spec);
    if (!anchorNodes.has(anchorId)) {
      anchorNodes.set(anchorId, makeAnchorNode(spec, members.size, userId));
    }
    for (const memberId of members) {
      const mem = nodeById.get(memberId);
      if (!mem) continue;
      edges.push(
        buildEdge({
          userId,
          sourceNodeId: mem.nodeId,
          targetNodeId: anchorId,
          sourceNodeType: mem.nodeType,
          targetNodeType: "value",
          type: "related_theme",
          strength: 0.65,
          confidence: 0.75,
          reason: `Mentions value: ${anchorTitleFor(spec)}`,
          sourceMethod: "tag",
          status: "confirmed",
          evidence: { value: slug },
        }),
      );
    }
  }

  return {
    anchorNodes: [...anchorNodes.values()],
    edges,
  };
}

function makeAnchorNode(
  spec: AnchorSpec,
  members: number,
  userId: string,
): BrainNode {
  const id = anchorIdFor(spec);
  const title = anchorTitleFor(spec);
  const importance = anchorImportanceFor(spec, members);
  return {
    id,
    userId,
    type:
      spec.kind === "life_area"
        ? "life_area"
        : spec.kind === "value"
          ? "value"
          : "smart_tag",
    title,
    importance,
    summary:
      spec.kind === "life_area"
        ? "Life area cluster"
        : spec.kind === "value"
          ? "Value cluster"
          : "Topic cluster",
    metadata: {
      anchorKind: spec.kind,
      anchorSlug: spec.slug,
      memberCount: members,
    },
  };
}
