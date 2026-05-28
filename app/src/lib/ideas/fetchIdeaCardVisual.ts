import type { Idea } from "@/types/database";
import { normalizeIdea } from "@/lib/ideas/normalize-idea";

export async function fetchIdeaCardVisual(params: {
  ideaId: string;
  force?: boolean;
  signal?: AbortSignal;
}): Promise<Idea> {
  const res = await fetch(`/api/ideas/${encodeURIComponent(params.ideaId)}/card-visual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ force: params.force ?? false }),
    signal: params.signal,
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }

  const payload = (await res.json()) as { idea?: unknown; error?: string };
  if (!payload.idea) {
    throw new Error(payload.error ?? "card_visual_missing_idea");
  }
  return normalizeIdea(payload.idea);
}
