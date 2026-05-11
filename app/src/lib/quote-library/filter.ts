/**
 * Pure filter/sort helpers for the Quote Library list view.
 *
 * Kept pure (no React, no Supabase) so they can run inside `useMemo`,
 * server-side exports, and the SDK's `inspireMe` / `findResonantQuotes`
 * candidate pool without adapter code.
 */

import type {
  Quote,
  QuoteFilters,
  QuoteSortKey,
} from "@/types/quote";

/** Lowercase, whitespace-normalised haystack for full-text search. */
function buildHaystack(q: Quote): string {
  return [
    q.quote_text,
    q.source_author ?? "",
    q.source_context ?? "",
    q.personal_note ?? "",
    q.tags.join(" "),
    q.category ?? "",
    q.emotion_tone ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function inDateRange(
  createdAt: string,
  range: QuoteFilters["dateRange"],
): boolean {
  const created = new Date(createdAt).getTime();
  if (range.from) {
    const from = new Date(range.from).getTime();
    if (Number.isFinite(from) && created < from) return false;
  }
  if (range.to) {
    const to = new Date(range.to).getTime() + 24 * 60 * 60 * 1000;
    if (Number.isFinite(to) && created >= to) return false;
  }
  return true;
}

export function filterQuotes(
  quotes: Quote[],
  filters: QuoteFilters,
  membership: Map<string, Set<string>>, // quoteId -> collectionIds
): Quote[] {
  const query = filters.search.trim().toLowerCase();

  return quotes.filter((q) => {
    if (filters.favoritesOnly && !q.is_favorite) return false;
    if (
      filters.categories.length > 0 &&
      (!q.category || !filters.categories.includes(q.category))
    ) {
      return false;
    }
    if (
      filters.tones.length > 0 &&
      (!q.emotion_tone || !filters.tones.includes(q.emotion_tone))
    ) {
      return false;
    }
    if (filters.sourceModules.length > 0) {
      const sm = q.source_module ?? "manual";
      if (!filters.sourceModules.includes(sm)) return false;
    }
    if (filters.tags.length > 0) {
      const needed = filters.tags.map((t) => t.toLowerCase());
      const have = q.tags.map((t) => t.toLowerCase());
      if (!needed.every((tag) => have.includes(tag))) return false;
    }
    if (
      filters.linkedGoalId &&
      q.linked_goal_id !== filters.linkedGoalId
    ) {
      return false;
    }
    if (filters.collectionId) {
      const belongs = membership.get(q.id)?.has(filters.collectionId);
      if (!belongs) return false;
    }
    if (!inDateRange(q.created_at, filters.dateRange)) return false;
    if (query && !buildHaystack(q).includes(query)) return false;
    return true;
  });
}

export function sortQuotes(quotes: Quote[], sort: QuoteSortKey): Quote[] {
  const next = [...quotes];
  switch (sort) {
    case "created_at_asc":
      next.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      break;
    case "source_author":
      next.sort((a, b) =>
        (a.source_author ?? "").localeCompare(b.source_author ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "category":
      next.sort((a, b) =>
        (a.category ?? "").localeCompare(b.category ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "emotion_tone":
      next.sort((a, b) =>
        (a.emotion_tone ?? "").localeCompare(b.emotion_tone ?? "", undefined, {
          sensitivity: "base",
        }),
      );
      break;
    case "created_at_desc":
    default:
      next.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      break;
  }
  // Favorites always bubble up within the sort order.
  next.sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite));
  return next;
}

/** Convenience: build the `quoteId -> Set<collectionId>` lookup used above. */
export function buildMembershipMap(
  items: { quote_id: string; collection_id: string }[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const item of items) {
    let set = map.get(item.quote_id);
    if (!set) {
      set = new Set();
      map.set(item.quote_id, set);
    }
    set.add(item.collection_id);
  }
  return map;
}
