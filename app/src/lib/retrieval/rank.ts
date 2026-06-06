import type { KnowledgeConnection, KnowledgeItem, SmartCollection } from "@/types/knowledge";
import { matchKnowledgeItems } from "@/lib/knowledgeMatching";
import type { RetrievalResult, RetrievalScores } from "@/lib/retrieval/types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function recencyScore(dateIso: string | null | undefined, referenceDate = new Date()): number {
  if (!dateIso) return 0;
  const t = new Date(dateIso).getTime();
  if (!Number.isFinite(t)) return 0;
  const ageDays = Math.max(0, (referenceDate.getTime() - t) / 86400000);
  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.75;
  if (ageDays <= 90) return 0.45;
  if (ageDays <= 365) return 0.2;
  return 0.05;
}

export function connectionScore(itemId: string | null | undefined, connections: KnowledgeConnection[]): number {
  if (!itemId) return 0;
  const count = connections.reduce(
    (sum, conn) =>
      sum + (conn.sourceItemId === itemId || conn.targetItemId === itemId ? 1 : 0),
    0,
  );
  return clamp01(count / 5);
}

export function hybridScore(input: {
  semanticScore?: number | null;
  metadataScore?: number | null;
  recencyScore?: number | null;
  connectionScore?: number | null;
}): RetrievalScores {
  const semantic = input.semanticScore == null ? null : clamp01(input.semanticScore);
  const metadata = clamp01((input.metadataScore ?? 0) / 100);
  const recency = clamp01(input.recencyScore ?? 0);
  const connection = clamp01(input.connectionScore ?? 0);
  const semanticContribution = semantic ?? 0;
  const combined = clamp01(
    semanticContribution * 0.55 +
      metadata * 0.25 +
      recency * 0.1 +
      connection * 0.1,
  );

  return {
    combined,
    semantic,
    metadata,
    recency,
    connection,
  };
}

export function buildKeywordRetrievalResults(params: {
  query: string;
  items: KnowledgeItem[];
  smartCollections: SmartCollection[];
  connections: KnowledgeConnection[];
  limit?: number;
  referenceDate?: Date;
}): RetrievalResult[] {
  const referenceDate = params.referenceDate ?? new Date();
  return matchKnowledgeItems(params.items, params.query, params.smartCollections, {
    limit: params.limit ?? 24,
    minScore: 1,
  }).map((match, index) => {
    const scores = hybridScore({
      semanticScore: null,
      metadataScore: match.normalizedScore,
      recencyScore: recencyScore(match.item.dateModified || match.item.dateAdded, referenceDate),
      connectionScore: connectionScore(match.item.id, params.connections),
    });

    return {
      id: `keyword:${match.item.id}:${index}`,
      retrievalDocumentId: null,
      knowledgeItemId: match.item.id,
      sourceDomain: "knowledge",
      sourceTable: "knowledge_items",
      sourceId: match.item.id,
      documentKind: "deterministic_match",
      chunkIndex: 0,
      title: match.item.title,
      snippet:
        match.item.aiTldr ||
        match.item.aiSummary ||
        match.reasons[0] ||
        "Matched from local Knowledge Base metadata.",
      bodyPreview: match.item.aiSummary || match.item.aiTldr || "",
      sourceUrl: match.item.sourceUrl ?? null,
      sourceMetadata: {
        contentType: match.item.contentType,
        sourceType: match.item.sourceType,
        provider: match.item.provider,
        confidence: match.confidence,
        matchedFields: match.matchedFields,
      },
      pageNumber: null,
      sectionPath: null,
      tags: [...match.item.aiTags, ...match.item.manualTags],
      scores,
      whyMatched: match.reasons.length
        ? match.reasons
        : ["Matched by deterministic Knowledge Base metadata."],
      createdAt: match.item.dateAdded,
      updatedAt: match.item.dateModified,
    };
  });
}

export function mergeRetrievalResults(params: {
  semanticResults: RetrievalResult[];
  keywordResults: RetrievalResult[];
  mode: "hybrid" | "semantic" | "keyword" | "recent";
  limit?: number;
}): RetrievalResult[] {
  if (params.mode === "keyword") {
    return params.keywordResults.slice(0, params.limit ?? 24);
  }
  if (params.mode === "semantic") {
    return params.semanticResults.slice(0, params.limit ?? 24);
  }

  const byKey = new Map<string, RetrievalResult>();
  const keyFor = (r: RetrievalResult) =>
    r.knowledgeItemId ? `knowledge:${r.knowledgeItemId}` : `${r.sourceDomain}:${r.sourceId}`;

  for (const result of params.semanticResults) {
    byKey.set(keyFor(result), result);
  }

  for (const keyword of params.keywordResults) {
    const key = keyFor(keyword);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, keyword);
      continue;
    }
    const scores = hybridScore({
      semanticScore: existing.scores.semantic,
      metadataScore: keyword.scores.metadata * 100,
      recencyScore: Math.max(existing.scores.recency, keyword.scores.recency),
      connectionScore: Math.max(existing.scores.connection, keyword.scores.connection),
    });
    byKey.set(key, {
      ...existing,
      scores,
      whyMatched: [...new Set([...existing.whyMatched, ...keyword.whyMatched])].slice(0, 4),
    });
  }

  const merged = [...byKey.values()].sort((a, b) => {
    if (params.mode === "recent") {
      return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
        new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    }
    if (b.scores.combined !== a.scores.combined) {
      return b.scores.combined - a.scores.combined;
    }
    return new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
  });

  return merged.slice(0, params.limit ?? 24);
}
