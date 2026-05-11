/**
 * Build a runtime taxonomy tree from a flat list of items.
 *
 * Inputs:
 *   - items: every knowledge item (we read both `aiTags` and `manualTags`).
 *   - canonicals: the seed taxonomy (default: `CANONICAL_TAGS`).
 *   - categories: top-level category defs (default: `TAG_CATEGORIES`).
 *
 * Output: a {@link TaxonomySnapshot} that contains
 *   - `categories`: every seed category, with its root canonical tags
 *     resolved into a tree, every node carrying `directCount`, `totalCount`,
 *     `path`, `idPath`, and merged `aliases`.
 *   - `tagIndex`: id → node lookup (only mapped canonical tags).
 *   - `other`: synthetic category for tags that did not match anything.
 *   - `totalItems`: deduped item count across the whole snapshot (so the
 *     "All knowledge" pill still reads truthfully).
 *
 * Performance:
 *   - One pass to map raw tags → canonical id (with a memoized matcher).
 *   - One pass to roll up counts up the parent chain.
 *   - Counts are *deduplicated per item* so an item tagged with two
 *     descendants of the same parent doesn't get double-counted at the
 *     parent level.
 */

import type { KnowledgeItem } from "@/types/knowledge";
import { buildMatchIndex, findMatchingCanonicalTag } from "./match";
import { CANONICAL_TAGS, TAG_CATEGORIES } from "./seed-taxonomy";
import { normalizeTagName, slugifyTagName } from "./normalize";
import {
  classifyTag,
  fallbackToOtherOnlyWhenNecessary,
  getSmartAutoSubcategoryId,
  getSmartAutoTagId,
  RESCUE_CLASSIFICATION_CONFIDENCE,
  STRICT_CLASSIFICATION_CONFIDENCE,
  TARGET_OTHER_RATIO,
} from "./smart-classifier";
import type {
  CanonicalTagDef,
  TagCategoryDef,
  TagCategoryNode,
  TagNode,
  TaxonomySnapshot,
} from "./types";

const OTHER_CATEGORY_ID = "__other__";

/**
 * Produce a taxonomy snapshot from a list of items.
 *
 * Pure function — safe to call inside `useMemo`. ~O((items × tags) + N) where
 * N is the canonical taxonomy size; both are small and the matcher uses an
 * O(1) alias index for the hot path.
 */
export function buildTaxonomy(
  items: KnowledgeItem[],
  options: {
    canonicals?: readonly CanonicalTagDef[];
    categories?: readonly TagCategoryDef[];
  } = {},
): TaxonomySnapshot {
  const canonicals = options.canonicals ?? CANONICAL_TAGS;
  const categories = options.categories ?? TAG_CATEGORIES;
  const categoryIndex = new Map(categories.map((c) => [c.id, c]));

  // 1. Build the static structure (no counts yet).
  const nodesById = new Map<string, TagNode>();
  for (const def of canonicals) {
    const node: TagNode = {
      id: def.id,
      name: def.name,
      slug: def.slug,
      description: def.description,
      parentId: def.parentId,
      categoryId: def.categoryId,
      type: def.type,
      aliases: dedupeStrings([def.name, def.slug, ...def.aliases]),
      directCount: 0,
      totalCount: 0,
      children: [],
      path: [], // filled in pass 3
      idPath: [],
    };
    nodesById.set(def.id, node);
  }
  // Wire children.
  for (const node of nodesById.values()) {
    if (node.parentId) {
      const parent = nodesById.get(node.parentId);
      if (parent) parent.children.push(node);
    }
  }

  // Sort children alphabetically once for stable rendering.
  for (const node of nodesById.values()) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // 2. Map raw tags → canonical ids; track unmapped tags for the Other bucket.
  const matchIndex = buildMatchIndex(canonicals);
  const matchCache = new Map<string, string | null>();

  const otherCounts = new Map<
    string,
    { node: TagNode; itemIds: Set<string> }
  >();
  const itemsByCanonicalId = new Map<string, Set<string>>();
  const dynamicNodesById = new Map<string, TagNode>();
  const observedRawTagSlugs = new Set<string>();

  const ensureDynamicNode = (node: TagNode) => {
    const existingStatic = nodesById.get(node.id);
    if (existingStatic) return existingStatic;
    const existingDynamic = dynamicNodesById.get(node.id);
    if (existingDynamic) return existingDynamic;
    const next = { ...node, children: [...node.children] };
    dynamicNodesById.set(next.id, next);
    return next;
  };

  const assignSmartClassifiedTag = (
    rawTag: string,
    itemIds: Iterable<string>,
    minConfidence: number,
  ): { assigned: boolean; smartTagId: string | null } => {
    const classified = classifyTag(rawTag);
    if (
      !classified ||
      classified.confidence < minConfidence ||
      fallbackToOtherOnlyWhenNecessary(rawTag, minConfidence) ||
      !categoryIndex.has(classified.categoryId)
    ) {
      return { assigned: false, smartTagId: null };
    }

    const subcategoryId = getSmartAutoSubcategoryId(classified);
    const subcategoryNode = ensureDynamicNode({
      id: subcategoryId,
      name: classified.subcategoryName,
      slug: slugifyTagName(classified.subcategoryName) || classified.subcategoryId,
      description: `Auto-classified bucket: ${classified.categoryName} > ${classified.subcategoryName}`,
      parentId: null,
      categoryId: classified.categoryId,
      aliases: [classified.subcategoryName],
      directCount: 0,
      totalCount: 0,
      children: [],
      path: [],
      idPath: [],
    });

    const autoTagId = getSmartAutoTagId(rawTag, classified);
    const autoTagNode = ensureDynamicNode({
      id: autoTagId,
      name: rawTag,
      slug: slugifyTagName(rawTag) || normalizeTagName(rawTag).replace(/\s+/g, "-"),
      parentId: subcategoryNode.id,
      categoryId: classified.categoryId,
      aliases: [rawTag, normalizeTagName(rawTag)],
      directCount: 0,
      totalCount: 0,
      children: [],
      path: [],
      idPath: [],
    });
    if (!subcategoryNode.children.find((c) => c.id === autoTagNode.id)) {
      subcategoryNode.children.push(autoTagNode);
    }

    for (const itemId of itemIds) {
      let bucket = itemsByCanonicalId.get(autoTagId);
      if (!bucket) {
        bucket = new Set();
        itemsByCanonicalId.set(autoTagId, bucket);
      }
      bucket.add(itemId);
    }
    return { assigned: true, smartTagId: autoTagId };
  };

  for (const item of items) {
    const allRaw = [...item.aiTags, ...item.manualTags];
    const seenForItem = new Set<string>(); // dedupe within an item
    for (const raw of allRaw) {
      if (!raw) continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const cacheKey = normalizeTagName(trimmed);
      if (!cacheKey) continue;
      observedRawTagSlugs.add(slugifyTagName(trimmed) || cacheKey);

      let canonicalId: string | null;
      if (matchCache.has(cacheKey)) {
        canonicalId = matchCache.get(cacheKey)!;
      } else {
        const match = findMatchingCanonicalTag(trimmed, { index: matchIndex });
        canonicalId = match?.canonicalId ?? null;
        matchCache.set(cacheKey, canonicalId);
      }

      if (canonicalId) {
        if (!seenForItem.has(canonicalId)) {
          seenForItem.add(canonicalId);
          let bucket = itemsByCanonicalId.get(canonicalId);
          if (!bucket) {
            bucket = new Set();
            itemsByCanonicalId.set(canonicalId, bucket);
          }
          bucket.add(item.id);
        }
      } else {
        const smart = assignSmartClassifiedTag(trimmed, [item.id], STRICT_CLASSIFICATION_CONFIDENCE);
        if (smart.assigned && smart.smartTagId) {
          if (!seenForItem.has(smart.smartTagId)) {
            seenForItem.add(smart.smartTagId);
          }
          continue;
        }
        // Unmapped: stash under Other, keyed by slug-form so casing variants
        // collapse here too even though they aren't in the seed.
        const otherSlug = slugifyTagName(trimmed) || cacheKey;
        if (seenForItem.has(`__other__:${otherSlug}`)) continue;
        seenForItem.add(`__other__:${otherSlug}`);
        let entry = otherCounts.get(otherSlug);
        if (!entry) {
          entry = {
            node: {
              id: `__other__:${otherSlug}`,
              name: trimmed,
              slug: otherSlug,
              parentId: null,
              categoryId: OTHER_CATEGORY_ID,
              aliases: [trimmed],
              directCount: 0,
              totalCount: 0,
              children: [],
              path: [trimmed],
              idPath: [`__other__:${otherSlug}`],
            },
            itemIds: new Set(),
          };
          otherCounts.set(otherSlug, entry);
        }
        entry.itemIds.add(item.id);
      }
    }
  }

  // 2.5 Rescue pass: if too many tags are headed to Other, classify the
  // top candidates using a slightly lower confidence threshold.
  const totalObservedTags = observedRawTagSlugs.size || 1;
  const currentOtherRatio = otherCounts.size / totalObservedTags;
  if (currentOtherRatio > TARGET_OTHER_RATIO) {
    const rescueCandidates = [...otherCounts.values()]
      .map((entry) => {
        const classification = classifyTag(entry.node.name);
        return {
          entry,
          classification,
        };
      })
      .filter(
        (it) =>
          it.classification &&
          it.classification.confidence >= RESCUE_CLASSIFICATION_CONFIDENCE &&
          categoryIndex.has(it.classification.categoryId),
      )
      .sort((a, b) => (b.classification?.confidence ?? 0) - (a.classification?.confidence ?? 0));

    const maxOtherCount = Math.max(1, Math.floor(totalObservedTags * TARGET_OTHER_RATIO));
    for (const candidate of rescueCandidates) {
      if (otherCounts.size <= maxOtherCount) break;
      const slug = candidate.entry.node.slug;
      const assigned = assignSmartClassifiedTag(
        candidate.entry.node.name,
        candidate.entry.itemIds,
        RESCUE_CLASSIFICATION_CONFIDENCE,
      );
      if (assigned.assigned) {
        otherCounts.delete(slug);
      }
    }
  }

  // 3. Apply directCount and roll up totalCount through ancestors. Roll-up
  //    uses a per-node Set<itemId> that bubbles upward so an item tagged
  //    with both `agent-skills` and `ai-workflows` (siblings under
  //    `ai-agents`) only contributes 1 to `ai-agents.totalCount`.
  const allNodes = new Map<string, TagNode>([
    ...nodesById.entries(),
    ...dynamicNodesById.entries(),
  ]);

  for (const node of dynamicNodesById.values()) {
    if (!node.parentId) continue;
    const parent = allNodes.get(node.parentId);
    if (parent && !parent.children.find((child) => child.id === node.id)) {
      parent.children.push(node);
    }
  }
  for (const node of allNodes.values()) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
  }

  const itemSetByNode = new Map<string, Set<string>>();
  for (const node of allNodes.values()) {
    const direct = itemsByCanonicalId.get(node.id);
    node.directCount = direct?.size ?? 0;
    itemSetByNode.set(node.id, direct ? new Set(direct) : new Set());
  }

  // Ancestor traversal — a child contributes its set of items to every
  // ancestor's set (set union ⇒ deduped).
  for (const node of allNodes.values()) {
    if (node.directCount === 0) continue;
    let cursor: TagNode | undefined = allNodes.get(node.parentId ?? "");
    while (cursor) {
      const target = itemSetByNode.get(cursor.id)!;
      for (const id of itemSetByNode.get(node.id)!) target.add(id);
      cursor = cursor.parentId ? allNodes.get(cursor.parentId) : undefined;
    }
  }

  for (const node of allNodes.values()) {
    node.totalCount = itemSetByNode.get(node.id)?.size ?? 0;
  }

  // 4. Materialize human paths for breadcrumb and search.
  const namePath = (id: string): string[] => {
    const node = allNodes.get(id);
    if (!node) return [];
    if (!node.parentId) return [node.name];
    return [...namePath(node.parentId), node.name];
  };
  const idsPath = (id: string): string[] => {
    const node = allNodes.get(id);
    if (!node) return [];
    if (!node.parentId) return [node.id];
    return [...idsPath(node.parentId), node.id];
  };
  for (const node of allNodes.values()) {
    node.path = namePath(node.id);
    node.idPath = idsPath(node.id);
  }

  // 5. Build categories.
  const categoryNodes: TagCategoryNode[] = [...categories]
    .sort((a, b) => a.order - b.order)
    .map((cat) => {
      const roots = [...allNodes.values()]
        .filter((n) => n.categoryId === cat.id && !n.parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
      const itemSet = new Set<string>();
      for (const root of roots) {
        for (const id of itemSetByNode.get(root.id) ?? []) itemSet.add(id);
      }
      return {
        ...cat,
        roots,
        totalCount: itemSet.size,
      };
    });

  const otherRoots: TagNode[] = [...otherCounts.values()]
    .map(({ node, itemIds }) => ({
      ...node,
      directCount: itemIds.size,
      totalCount: itemIds.size,
    }))
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));

  const otherItemSet = new Set<string>();
  for (const { itemIds } of otherCounts.values()) {
    for (const id of itemIds) otherItemSet.add(id);
  }

  const other: TagCategoryNode = {
    id: OTHER_CATEGORY_ID,
    name: "Other",
    slug: "other",
    description: "Tags that don't fit a curated category yet",
    accent: "slate",
    iconName: "Layers",
    order: 999,
    roots: otherRoots,
    totalCount: otherItemSet.size,
  };

  // 6. Cross-reference tag id → item ids on the snapshot, used by filtering.
  const tagIndex = new Map<string, TagNode>(allNodes);
  for (const otherNode of otherRoots) tagIndex.set(otherNode.id, otherNode);

  return {
    categories: categoryNodes,
    tagIndex,
    other,
    totalItems: items.length,
    diagnostics: {
      observedTagCount: observedRawTagSlugs.size,
      otherTagCount: otherCounts.size,
      otherRatio: observedRawTagSlugs.size > 0 ? otherCounts.size / observedRawTagSlugs.size : 0,
      targetOtherRatio: TARGET_OTHER_RATIO,
    },
  };
}

/**
 * Collect the id of a tag together with all of its descendant ids. Used by
 * the filter to express "selecting Technology > AI shows everything tagged
 * with anything under AI".
 */
export function collectDescendantTagIds(
  rootId: string,
  snapshot: TaxonomySnapshot,
): string[] {
  const out: string[] = [];
  const root = snapshot.tagIndex.get(rootId);
  if (!root) return out;
  const queue: TagNode[] = [root];
  while (queue.length) {
    const node = queue.shift()!;
    out.push(node.id);
    for (const child of node.children) queue.push(child);
  }
  return out;
}

/**
 * Resolve a tag id to its breadcrumb (name path) including the category at
 * the root. Returns an empty array for unknown ids.
 */
export function getTagBreadcrumb(
  tagId: string,
  snapshot: TaxonomySnapshot,
): { id: string; name: string; type: "category" | "tag" }[] {
  const node = snapshot.tagIndex.get(tagId);
  if (!node) return [];
  const category =
    snapshot.categories.find((c) => c.id === node.categoryId) ??
    (snapshot.other.id === node.categoryId ? snapshot.other : undefined);
  const trail: { id: string; name: string; type: "category" | "tag" }[] = [];
  if (category) trail.push({ id: category.id, name: category.name, type: "category" });
  for (let i = 0; i < node.idPath.length; i++) {
    trail.push({ id: node.idPath[i], name: node.path[i], type: "tag" });
  }
  return trail;
}

/**
 * Compute a flat list of every canonical tag (and unmapped Other tag) for
 * search. Each entry carries its breadcrumb pre-rendered so the search UI
 * can show "Technology > AI > AI Agents" without re-walking the tree.
 */
export function flattenSearchableTags(
  snapshot: TaxonomySnapshot,
): {
  id: string;
  name: string;
  slug: string;
  aliases: string[];
  totalCount: number;
  path: string[];
  categoryId: string;
}[] {
  const out: {
    id: string;
    name: string;
    slug: string;
    aliases: string[];
    totalCount: number;
    path: string[];
    categoryId: string;
  }[] = [];
  for (const node of snapshot.tagIndex.values()) {
    out.push({
      id: node.id,
      name: node.name,
      slug: node.slug,
      aliases: node.aliases,
      totalCount: node.totalCount,
      path: node.path,
      categoryId: node.categoryId,
    });
  }
  return out;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export const TAG_OTHER_CATEGORY_ID = OTHER_CATEGORY_ID;
