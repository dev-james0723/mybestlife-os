import type { KnowledgeItem, SmartCollection } from "@/types/knowledge";
import type { KnowledgeSortKey } from "@/stores/knowledge-store";
import { getCategoryLabel, getSourceTypeInfo } from "@/lib/knowledge/labels";
import {
  matchesBuiltInKnowledgeQuickFilter,
  type KnowledgeBuiltinQuickFilterId,
} from "@/lib/knowledge/quick-filters";
import {
  knowledgeSearchScore,
  matchKnowledgeItems,
} from "@/lib/knowledgeMatching";

/** Short preview for gallery cards: prefer TLDR, avoid duplicating long AI summary. */
export function getCardSummaryPreview(item: KnowledgeItem): string | undefined {
  if (item.status === "processing" || item.status === "error") return undefined;
  const raw = (item.aiTldr?.trim() || item.aiSummary?.trim()) ?? "";
  if (!raw) return undefined;
  return stripDecorativeLead(raw).trim();
}

function stripDecorativeLead(s: string): string {
  return s.replace(/^[✦•⋆]\s*/u, "").trim();
}

export function itemMatchesSearch(
  item: KnowledgeItem,
  q: string,
  smartCollections: SmartCollection[],
): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  const deterministicMatch = matchKnowledgeItems([item], q, smartCollections, {
    minScore: 8,
    limit: 1,
  });
  if (deterministicMatch.length > 0) return true;

  const hay = (s: string | undefined | null) => Boolean(s && s.toLowerCase().includes(needle));

  if (hay(item.title)) return true;
  if (hay(item.aiTldr)) return true;
  if (hay(item.aiSummary)) return true;
  if (hay(item.aiContentOverview)) return true;
  if (hay(item.rawContent)) return true;
  if (hay(item.sourceUrl)) return true;
  if (hay(item.sourceDomain)) return true;
  if (hay(item.label)) return true;
  if (item.generatedTitle && hay(item.generatedTitle)) return true;

  if (item.category && getCategoryLabel(item.category).toLowerCase().includes(needle)) {
    return true;
  }

  if (item.sourceType) {
    const info = getSourceTypeInfo(item.sourceType);
    if (hay(info.label)) return true;
  }

  for (const t of item.aiTags) {
    if (hay(t)) return true;
  }
  for (const t of item.manualTags) {
    if (hay(t)) return true;
  }
  for (const qa of item.aiQuestionsAnswered) {
    if (hay(qa)) return true;
  }

  for (const col of smartCollections) {
    if (col.itemIds.includes(item.id) && col.name.toLowerCase().includes(needle)) {
      return true;
    }
  }

  return false;
}

export function matchesQuickFilter(
  item: KnowledgeItem,
  f: KnowledgeBuiltinQuickFilterId,
  nowMs: number = Date.now(),
): boolean {
  return matchesBuiltInKnowledgeQuickFilter(item, f, nowMs);
}

function publishedOrAddedMs(item: KnowledgeItem): number {
  const pub = item.sourceMetadata?.publishedAt;
  if (pub) {
    const t = new Date(pub).getTime();
    if (Number.isFinite(t)) return t;
  }
  return new Date(item.dateAdded).getTime();
}

export function searchRelevanceScore(
  item: KnowledgeItem,
  q: string,
  smartCollections: SmartCollection[] = [],
): number {
  const needle = q.trim().toLowerCase();
  if (!needle) return 0;
  let score = knowledgeSearchScore(item, q, smartCollections);
  const bump = (s: string | undefined, w: number) => {
    if (!s) return;
    const lower = s.toLowerCase();
    if (lower === needle) score += w * 4;
    else if (lower.startsWith(needle)) score += w * 2;
    else if (lower.includes(needle)) score += w;
  };
  bump(item.title, 10);
  bump(item.aiTldr, 6);
  bump(item.aiSummary, 4);
  bump(item.label, 5);
  bump(item.sourceDomain, 3);
  for (const t of [...item.aiTags, ...item.manualTags]) bump(t, 3);
  return score;
}

export function compareKnowledgeItems(
  a: KnowledgeItem,
  b: KnowledgeItem,
  sortBy: KnowledgeSortKey,
  searchQuery: string,
  smartCollections: SmartCollection[] = [],
): number {
  const num = (x: string) => new Date(x).getTime();
  const tieBreak = () => num(b.dateAdded) - num(a.dateAdded);

  switch (sortBy) {
    case "latest":
      return num(b.dateAdded) - num(a.dateAdded) || tieBreak();
    case "updated":
      return num(b.dateModified) - num(a.dateModified) || tieBreak();
    case "titleAZ":
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || tieBreak();
    case "contentType": {
      const c = a.contentType.localeCompare(b.contentType);
      return c !== 0 ? c : a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    case "relevance": {
      const q = searchQuery.trim();
      if (!q) return num(b.dateAdded) - num(a.dateAdded);
      const ra = searchRelevanceScore(a, q, smartCollections);
      const rb = searchRelevanceScore(b, q, smartCollections);
      if (rb !== ra) return rb - ra;
      return num(b.dateAdded) - num(a.dateAdded);
    }
    case "linked": {
      const la = a.connections?.length ?? 0;
      const lb = b.connections?.length ?? 0;
      if (lb !== la) return lb - la;
      return num(b.dateAdded) - num(a.dateAdded);
    }
    case "sourceDate":
      return publishedOrAddedMs(b) - publishedOrAddedMs(a) || tieBreak();
    default:
      return tieBreak();
  }
}

export function collectionNamesForItem(
  item: KnowledgeItem,
  smartCollections: SmartCollection[],
): string {
  const names = smartCollections.filter((c) => c.itemIds.includes(item.id)).map((c) => c.name);
  return names.join(", ");
}
