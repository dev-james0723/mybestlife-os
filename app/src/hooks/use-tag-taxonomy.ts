"use client";

/**
 * Hooks for the knowledge-base tag taxonomy.
 *
 * - `useTagTaxonomy()` returns the live `TaxonomySnapshot` derived from the
 *   knowledge store's items, memoized on item identity. Use this anywhere
 *   you need to render the tree, search, or count tags.
 *
 * - `useTagFilter()` returns the current active tag id alongside helpers to
 *   set/clear it and a memoized `predicate` that the content layer can use
 *   to filter knowledge items.
 *
 * - `useTagSearch(query)` performs a fast in-memory ranked search over
 *   canonical names, slugs, and aliases. Empty query returns `null` so the
 *   tree UI can fall back to its hierarchical default rendering.
 */

import { useCallback, useMemo } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { buildTaxonomy } from "@/lib/knowledge/tags/build-tree";
import { makeTagFilterPredicate } from "@/lib/knowledge/tags/filter";
import { flattenSearchableTags } from "@/lib/knowledge/tags/build-tree";
import { normalizeTagName, similarityRatio } from "@/lib/knowledge/tags/normalize";
import type { TaxonomySnapshot } from "@/lib/knowledge/tags/types";

export function useTagTaxonomy(): TaxonomySnapshot {
  const items = useKnowledgeStore((s) => s.items);
  return useMemo(() => buildTaxonomy(items), [items]);
}

export function useTagFilter() {
  const taxonomy = useTagTaxonomy();
  const activeTagId = useKnowledgeStore((s) => s.activeTagId);
  const setActiveTagId = useKnowledgeStore((s) => s.setActiveTagId);
  const clearTagFilter = useKnowledgeStore((s) => s.clearTagFilter);

  const predicate = useMemo(
    () => makeTagFilterPredicate(activeTagId, taxonomy),
    [activeTagId, taxonomy],
  );

  const setTag = useCallback(
    (id: string | null) => {
      setActiveTagId(id);
    },
    [setActiveTagId],
  );

  return {
    taxonomy,
    activeTagId,
    setTag,
    clearTagFilter,
    predicate,
  };
}

export type TagSearchHit = {
  /** Canonical or `__other__` id. */
  id: string;
  name: string;
  /** Pre-rendered "Technology > AI > AI Agents" path (without the leading category in `path`). */
  path: string[];
  totalCount: number;
  categoryId: string;
  /** 0..1, used for sorting. */
  score: number;
  /** Which alias produced the match, useful for "matched on …" hints. */
  matchedOn?: string;
};

export function useTagSearch(query: string): TagSearchHit[] | null {
  const taxonomy = useTagTaxonomy();
  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    const needle = normalizeTagName(trimmed);
    if (!needle) return null;

    const flat = flattenSearchableTags(taxonomy);
    const hits: TagSearchHit[] = [];

    for (const tag of flat) {
      let bestScore = 0;
      let matchedOn: string | undefined;
      for (const alias of tag.aliases) {
        const aliasKey = normalizeTagName(alias);
        if (!aliasKey) continue;
        let score = 0;
        if (aliasKey === needle) score = 1;
        else if (aliasKey.startsWith(needle)) score = 0.92;
        else if (aliasKey.includes(needle)) score = 0.85;
        else if (needle.length >= 4 && aliasKey.length >= 4) {
          const sim = similarityRatio(aliasKey, needle);
          if (sim >= 0.78) score = 0.7 + (sim - 0.78) * 0.5;
        }
        if (score > bestScore) {
          bestScore = score;
          matchedOn = alias;
        }
      }
      if (bestScore > 0) {
        hits.push({
          id: tag.id,
          name: tag.name,
          path: tag.path,
          totalCount: tag.totalCount,
          categoryId: tag.categoryId,
          score: bestScore,
          matchedOn,
        });
      }
    }

    hits.sort((a, b) => {
      // Higher relevance first, then more populated tags, then alphabetical.
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
      return a.name.localeCompare(b.name);
    });

    return hits.slice(0, 24);
  }, [query, taxonomy]);
}
