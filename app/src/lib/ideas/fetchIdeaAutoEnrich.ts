import type { Idea } from "@/types/database";
import { normalizeIdea } from "@/lib/ideas/normalize-idea";

export async function fetchIdeaAutoEnrich(params: {
  ideaId: string;
  includeVisual?: boolean;
  signal?: AbortSignal;
}): Promise<Idea> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(params.ideaId)}/auto-enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ includeVisual: params.includeVisual ?? false }),
    signal: params.signal,
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }

  const payload = (await res.json()) as { idea?: unknown };
  return normalizeIdea(payload.idea);
}
