/**
 * Gemini-backed title + summary for the Ideas capture dialog.
 */

export type IdeaAiEnrichResult = {
  title: string;
  summary: string;
};

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

  const data = (await res.json()) as unknown;
  const o = data as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const summary = typeof o.summary === "string" ? o.summary.trim() : "";
  return { title, summary };
}
