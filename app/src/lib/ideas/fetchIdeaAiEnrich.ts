/**
 * Gemini-backed enrichment for the Ideas capture dialog: a generalized title,
 * a real AI overview (summary, not raw content), plus core insight, next step,
 * short semantic tags, and an image subject.
 */

export type IdeaAiEnrichResult = {
  title: string;
  overview: string;
  coreInsight: string;
  suggestedNextStep: string;
  aiTags: string[];
  visualSubject: string;
  confidence: number;
  source: "gemini" | "fallback";
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function fetchIdeaAiEnrich(params: {
  contentHtml: string;
  signal?: AbortSignal;
}): Promise<IdeaAiEnrichResult> {
  const res = await fetch("/api/ideas/ai-enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ contentHtml: params.contentHtml }),
    signal: params.signal,
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }

  const o = (await res.json()) as Record<string, unknown>;
  // `overview` is the new field; fall back to the legacy `summary` key.
  const overview = str(o.overview) || str(o.summary);
  return {
    title: str(o.title),
    overview,
    coreInsight: str(o.coreInsight),
    suggestedNextStep: str(o.suggestedNextStep),
    aiTags: Array.isArray(o.aiTags)
      ? o.aiTags.filter((t): t is string => typeof t === "string")
      : [],
    visualSubject: str(o.visualSubject),
    confidence: typeof o.confidence === "number" ? o.confidence : 0,
    source: o.source === "gemini" ? "gemini" : "fallback",
  };
}
