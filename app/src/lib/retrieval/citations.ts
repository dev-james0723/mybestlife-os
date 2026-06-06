import type { RetrievalCitation, RetrievalResult } from "@/lib/retrieval/types";

type CitationLike = {
  resultId?: unknown;
  retrievalDocumentId?: unknown;
  sourceId?: unknown;
  quote?: unknown;
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function quoteIsGrounded(quote: string, result: RetrievalResult): boolean {
  const q = normalize(quote);
  if (!q) return false;
  const haystack = normalize(`${result.snippet}\n${result.bodyPreview}`);
  if (haystack.includes(q)) return true;
  if (q.length > 160 && haystack.includes(q.slice(0, 160))) return true;
  return q.length <= 24;
}

export function sanitizeRetrievalCitations(
  rawCitations: unknown,
  evidence: RetrievalResult[],
): RetrievalCitation[] {
  if (!Array.isArray(rawCitations) || evidence.length === 0) return [];

  const byResultId = new Map(evidence.map((r) => [r.id, r]));
  const byDocumentId = new Map(
    evidence
      .filter((r) => r.retrievalDocumentId)
      .map((r) => [r.retrievalDocumentId as string, r]),
  );
  const bySourceId = new Map(evidence.map((r) => [r.sourceId, r]));

  const citations: RetrievalCitation[] = [];
  const seen = new Set<string>();

  for (const raw of rawCitations as CitationLike[]) {
    const resultId = typeof raw.resultId === "string" ? raw.resultId : "";
    const documentId =
      typeof raw.retrievalDocumentId === "string" ? raw.retrievalDocumentId : "";
    const sourceId = typeof raw.sourceId === "string" ? raw.sourceId : "";
    const result =
      (resultId && byResultId.get(resultId)) ||
      (documentId && byDocumentId.get(documentId)) ||
      (sourceId && bySourceId.get(sourceId));
    if (!result) continue;

    const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
    if (quote && !quoteIsGrounded(quote, result)) continue;

    const key = `${result.id}:${quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    citations.push({
      resultId: result.id,
      retrievalDocumentId: result.retrievalDocumentId,
      sourceDomain: result.sourceDomain,
      sourceId: result.sourceId,
      title: result.title,
      quote: quote || undefined,
      pageNumber: result.pageNumber,
      sectionPath: result.sectionPath,
    });
  }

  return citations.slice(0, 8);
}
