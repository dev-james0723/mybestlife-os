/**
 * Per-node feature index used by the relationship engine.
 *
 * We compute features once per node (normalized text, tag slugs, life
 * areas, entity slugs, date bucket) so scorers don't repeatedly tokenize
 * text. Inverted indexes give the engine cheap candidate generation:
 *   - tag → [nodeIds] : "what nodes mention `ai-music`?"
 *   - life area → [nodeIds] : "all `career` nodes"
 *   - entity → [nodeIds] : "all nodes mentioning `D Festival`"
 */

import type { BrainNode, BrainNodeFeatures } from "@/types/brain-graph";
import { matchValuesInText } from "@/lib/brain/taxonomy";
import { normalizeTagName } from "@/lib/knowledge/tags/normalize";

/**
 * Build a `BrainNodeFeatures` payload for a single node.
 *
 * `searchText` is lowercased and contains title + summary + bodyText so
 * later scorers can do cheap substring entity matching without
 * re-concatenating every comparison.
 */
export function featurizeNode(node: BrainNode): BrainNodeFeatures {
  const searchText = [node.title, node.summary, node.bodyText]
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" \n\n ")
    .toLowerCase();

  const tagSlugs = new Set<string>();
  for (const t of node.canonicalTags ?? []) {
    if (!t) continue;
    tagSlugs.add(normalizeTagName(t));
  }
  for (const t of node.tags ?? []) {
    if (!t) continue;
    tagSlugs.add(normalizeTagName(t));
  }
  // Drop empty entries.
  tagSlugs.delete("");

  const topicClusters = new Set<string>();
  for (const t of node.canonicalTags ?? []) {
    if (t) topicClusters.add(t);
  }

  const lifeAreas = new Set<string>(node.lifeAreas ?? []);
  const entitySlugs = new Set<string>(node.entities ?? []);

  // Pull explicit refs out of metadata. Each adapter has stored them in
  // their own keys (project_id, linked_*_ids, etc.). The relationship
  // engine reads metadata.* directly when generating explicit edges, so
  // here we just produce a flat set so we can detect "shared explicit
  // refs" (two nodes pointing at the same project, etc.).
  const explicitRefs = new Set<string>();
  const meta = node.metadata ?? {};
  for (const v of Object.values(meta)) {
    if (typeof v === "string" && v.length > 0) explicitRefs.add(v);
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string" && item.length > 0) explicitRefs.add(item);
      }
    }
  }

  // Date bucket (YYYY-MM-DD) — used for time-proximity scoring. Prefer
  // updatedAt because it represents when the user last touched the row.
  let dateBucket: string | undefined;
  const ts = node.updatedAt ?? node.createdAt;
  if (ts) {
    try {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        dateBucket = d.toISOString().slice(0, 10);
      }
    } catch {
      /* ignore */
    }
  }

  return {
    nodeId: node.id,
    nodeType: node.type,
    searchText,
    tagSlugs,
    topicClusters,
    lifeAreas,
    entitySlugs,
    explicitRefs,
    dateBucket,
  };
}

/** Build a flat features array for an entire node list. */
export function featurizeAll(nodes: BrainNode[]): BrainNodeFeatures[] {
  return nodes.map(featurizeNode);
}

// ============================================================
// Inverted indexes
// ============================================================

export type FeatureIndex = {
  byTag: Map<string, Set<string>>;
  byLifeArea: Map<string, Set<string>>;
  byTopicCluster: Map<string, Set<string>>;
  byEntity: Map<string, Set<string>>;
  byExplicitRef: Map<string, Set<string>>;
  byDate: Map<string, Set<string>>;
  byNodeId: Map<string, BrainNodeFeatures>;
};

/**
 * Build inverted indexes once per graph build. Each scorer pulls its
 * candidate pairs from the relevant index, never iterating O(N²) over
 * all node combinations.
 */
export function buildFeatureIndex(features: BrainNodeFeatures[]): FeatureIndex {
  const byTag = new Map<string, Set<string>>();
  const byLifeArea = new Map<string, Set<string>>();
  const byTopicCluster = new Map<string, Set<string>>();
  const byEntity = new Map<string, Set<string>>();
  const byExplicitRef = new Map<string, Set<string>>();
  const byDate = new Map<string, Set<string>>();
  const byNodeId = new Map<string, BrainNodeFeatures>();

  function pushInto(map: Map<string, Set<string>>, key: string, val: string) {
    if (!key) return;
    const cur = map.get(key);
    if (cur) cur.add(val);
    else map.set(key, new Set([val]));
  }

  for (const f of features) {
    byNodeId.set(f.nodeId, f);
    for (const t of f.tagSlugs) pushInto(byTag, t, f.nodeId);
    for (const a of f.lifeAreas) pushInto(byLifeArea, a, f.nodeId);
    for (const t of f.topicClusters) pushInto(byTopicCluster, t, f.nodeId);
    for (const e of f.entitySlugs) pushInto(byEntity, e, f.nodeId);
    for (const r of f.explicitRefs) pushInto(byExplicitRef, r, f.nodeId);
    if (f.dateBucket) pushInto(byDate, f.dateBucket, f.nodeId);
  }

  return {
    byTag,
    byLifeArea,
    byTopicCluster,
    byEntity,
    byExplicitRef,
    byDate,
    byNodeId,
  };
}

/**
 * Augment a node's `entities` field by scanning its searchText for
 * entity-like names from a list of known entity titles. Used after
 * featurization but before scoring.
 *
 * The matcher is conservative: requires the entity name to be at least
 * 3 chars long and to appear bounded by non-alphanumerics so "AI" doesn't
 * match inside "RAILS".
 */
export function scanEntities(
  searchText: string,
  knownEntityNames: ReadonlyArray<{ slug: string; name: string }>,
): Set<string> {
  const out = new Set<string>();
  if (!searchText) return out;
  for (const e of knownEntityNames) {
    if (!e.name || e.name.length < 3) continue;
    const lower = e.name.toLowerCase();
    if (!searchText.includes(lower)) continue;
    // Quick word-boundary check so we don't match inside other words.
    // Allow CJK boundaries since our regex doesn't help there.
    const idx = searchText.indexOf(lower);
    const before = idx > 0 ? searchText[idx - 1] : " ";
    const after =
      idx + lower.length < searchText.length
        ? searchText[idx + lower.length]
        : " ";
    if (/[a-z0-9]/.test(before)) continue;
    if (/[a-z0-9]/.test(after)) continue;
    out.add(e.slug);
  }
  return out;
}

/** Convenience wrapper using the values taxonomy. */
export function scanValues(searchText: string): Set<string> {
  return matchValuesInText(searchText) as unknown as Set<string>;
}
