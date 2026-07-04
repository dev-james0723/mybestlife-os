/**
 * Shared selector for the filtered Knowledge Base item list.
 *
 * `KnowledgeContent` (Gallery / Board / Table) and `ConstellationView`
 * MUST observe the same filter state so the user's mental model stays
 * coherent — switching to Constellation should never feel like jumping
 * to a different dataset.
 *
 * This hook reproduces the filter pipeline previously inlined in
 * `KnowledgeContent`, so any change to filtering logic only needs to
 * happen here.
 */

import { useEffect, useMemo, useState } from "react";
import type { KnowledgeItem } from "@/types/knowledge";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { useTagFilter } from "@/hooks/use-tag-taxonomy";
import {
  compareKnowledgeItems,
  itemMatchesSearch,
} from "@/lib/knowledge/knowledge-list-utils";
import { getKnowledgeDisplayContentType } from "@/lib/knowledge/display-content-type";
import {
  getActiveKnowledgeQuickFilterDefinitions,
  knowledgeQuickFiltersNeedMinuteTicker,
  matchesKnowledgeQuickFilterDefinition,
} from "@/lib/knowledge/quick-filters";

export type KnowledgeFilterSummary = {
  hasAnyFilter: boolean;
  hasSearch: boolean;
};

export function useKnowledgeFilteredItems(): {
  items: KnowledgeItem[];
  filteredItems: KnowledgeItem[];
  summary: KnowledgeFilterSummary;
} {
  const items = useKnowledgeStore((s) => s.items);
  const activeTypeFilters = useKnowledgeStore((s) => s.activeTypeFilters);
  const activeCategoryFilters = useKnowledgeStore(
    (s) => s.activeCategoryFilters,
  );
  const activeQuickFilters = useKnowledgeStore((s) => s.activeQuickFilters);
  const quickFilterDefinitions = useKnowledgeStore(
    (s) => s.quickFilterDefinitions,
  );
  const activeSmartCollectionId = useKnowledgeStore(
    (s) => s.activeSmartCollectionId,
  );
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const searchQuery = useKnowledgeStore((s) => s.searchQuery);
  const sortBy = useKnowledgeStore((s) => s.sortBy);
  const { activeTagId, predicate: tagPredicate } = useTagFilter();

  const activeQuickFilterDefinitions = useMemo(
    () =>
      getActiveKnowledgeQuickFilterDefinitions(
        activeQuickFilters,
        quickFilterDefinitions,
      ),
    [activeQuickFilters, quickFilterDefinitions],
  );

  // Date-sensitive quick filters need a wall-clock reference. Re-tick once
  // a minute when one is active so cards roll out of the active window.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!knowledgeQuickFiltersNeedMinuteTicker(activeQuickFilters, quickFilterDefinitions)) {
      return;
    }
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [activeQuickFilters, quickFilterDefinitions]);

  const filteredItems = useMemo(() => {
    let result: KnowledgeItem[] = [...items];

    if (activeQuickFilterDefinitions.length > 0) {
      result = result.filter((i) =>
        activeQuickFilterDefinitions.every((def) =>
          matchesKnowledgeQuickFilterDefinition(i, def, nowMs),
        ),
      );
    }
    if (activeTypeFilters.length > 0) {
      result = result.filter((i) =>
        activeTypeFilters.includes(getKnowledgeDisplayContentType(i)),
      );
    }
    if (activeCategoryFilters.length > 0) {
      result = result.filter(
        (i) => i.category && activeCategoryFilters.includes(i.category),
      );
    }
    if (activeSmartCollectionId) {
      const col = smartCollections.find((c) => c.id === activeSmartCollectionId);
      if (col) {
        const idSet = new Set(col.itemIds);
        result = result.filter((i) => idSet.has(i.id));
      }
    }
    if (activeTagId) {
      result = result.filter(tagPredicate);
    }
    if (searchQuery.trim()) {
      result = result.filter((i) =>
        itemMatchesSearch(i, searchQuery, smartCollections),
      );
    }

    result.sort((a, b) =>
      compareKnowledgeItems(a, b, sortBy, searchQuery, smartCollections),
    );
    return result;
  }, [
    items,
    activeTypeFilters,
    activeCategoryFilters,
    activeQuickFilterDefinitions,
    activeSmartCollectionId,
    smartCollections,
    activeTagId,
    tagPredicate,
    searchQuery,
    sortBy,
    nowMs,
  ]);

  const summary: KnowledgeFilterSummary = useMemo(
    () => ({
      hasSearch: searchQuery.trim().length > 0,
      hasAnyFilter:
        searchQuery.trim().length > 0 ||
        activeTypeFilters.length > 0 ||
        activeCategoryFilters.length > 0 ||
        activeQuickFilters.length > 0 ||
        Boolean(activeSmartCollectionId) ||
        Boolean(activeTagId),
    }),
    [
      searchQuery,
      activeTypeFilters.length,
      activeCategoryFilters.length,
      activeQuickFilters.length,
      activeSmartCollectionId,
      activeTagId,
    ],
  );

  return { items, filteredItems, summary };
}
