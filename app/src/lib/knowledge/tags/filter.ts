/**
 * Predicate helpers for hierarchy-aware tag filtering.
 *
 * Selecting `Technology > AI > AI Agents` means: keep every item whose set
 * of (canonicalized) tags contains at least one id in the descendant set of
 * `ai-agents` (including `ai-agents` itself). To make this fast we
 * pre-compute the descendant id set once per (snapshot, selectedId) pair.
 */

import type { KnowledgeItem } from "@/types/knowledge";
import { findMatchingCanonicalTag, buildMatchIndex } from "./match";
import { slugifyTagName } from "./normalize";
import type { TaxonomySnapshot } from "./types";
import { collectDescendantTagIds, TAG_OTHER_CATEGORY_ID } from "./build-tree";
import { resolveSmartClassifiedTagId } from "./smart-classifier";

/**
 * Returns a function that, given a knowledge item, returns true iff the
 * item is included by the currently selected tag (and its descendants).
 *
 * Special cases:
 *   - `selectedTagId === null` ⇒ no filter, accept everything.
 *   - selected id is a category ⇒ match items in any of the category's
 *     descendant tags.
 *   - selected id is an `Other` bucket id (`__other__:foo`) ⇒ match items
 *     whose raw tag slug equals the bucket slug.
 */
export function makeTagFilterPredicate(
  selectedTagId: string | null,
  snapshot: TaxonomySnapshot,
): (item: KnowledgeItem) => boolean {
  if (!selectedTagId) return () => true;

  // Category-level selection: collect every descendant in that category.
  const category = snapshot.categories.find((c) => c.id === selectedTagId);
  if (category) {
    const allowed = new Set<string>();
    for (const root of category.roots) {
      for (const id of collectDescendantTagIds(root.id, snapshot)) allowed.add(id);
    }
    return makePredicateForCanonicalIds(allowed);
  }
  if (selectedTagId === snapshot.other.id || selectedTagId === TAG_OTHER_CATEGORY_ID) {
    const allowed = new Set<string>();
    for (const root of snapshot.other.roots) allowed.add(root.id);
    return makePredicateForCanonicalIds(allowed);
  }

  const allowed = new Set<string>(collectDescendantTagIds(selectedTagId, snapshot));
  // Could be an Other bucket id; if so, its only descendant is itself.
  if (allowed.size === 0 && selectedTagId.startsWith("__other__:")) {
    allowed.add(selectedTagId);
  }
  return makePredicateForCanonicalIds(allowed);
}

/**
 * Given a set of canonical ids that count as "selected" (either a single
 * tag and its descendants, or an entire category's tree), return a
 * predicate over knowledge items.
 *
 * The predicate canonicalizes each item's raw tags lazily via the same
 * matcher used elsewhere; results are memoized per (predicate-instance,
 * raw-tag) so re-renders during scroll don't re-pay the matching cost.
 */
function makePredicateForCanonicalIds(
  allowed: Set<string>,
): (item: KnowledgeItem) => boolean {
  if (allowed.size === 0) return () => false;

  const matchIndex = buildMatchIndex();
  const cache = new Map<string, string | null>();

  return (item) => {
    const all = [...item.aiTags, ...item.manualTags];
    if (all.length === 0) return false;
    for (const raw of all) {
      const trimmed = (raw ?? "").trim();
      if (!trimmed) continue;
      let canonical: string | null;
      if (cache.has(trimmed)) {
        canonical = cache.get(trimmed)!;
      } else {
        const match = findMatchingCanonicalTag(trimmed, { index: matchIndex });
        canonical =
          match?.canonicalId ??
          resolveSmartClassifiedTagId(trimmed) ??
          `__other__:${slugifyTagName(trimmed) || trimmed}`;
        cache.set(trimmed, canonical);
      }
      if (canonical && allowed.has(canonical)) return true;
    }
    return false;
  };
}
