import type { AISuggestions } from "@/types/idea";
import type { CaptureKind } from "@/types/database";

export type AIAssistInput = {
  content: string;
  existingKind: CaptureKind;
  signal?: AbortSignal;
};

/**
 * Calls the Next.js API route (Gemini on the server). Same response shape as
 * the legacy `idea-ai-assist` Edge Function, without requiring
 * `ANTHROPIC_API_KEY` on Supabase.
 */
export async function fetchAISuggestions({
  content,
  existingKind,
  signal,
}: AIAssistInput): Promise<AISuggestions> {
  const res = await fetch("/api/idea-capture/ai-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ content, existingKind }),
    signal,
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  }

  const data = (await res.json()) as unknown;

  return {
    title:
      typeof (data as { title?: unknown })?.title === "string"
        ? (data as { title: string }).title
        : null,
    ai_tags: Array.isArray((data as { ai_tags?: unknown })?.ai_tags)
      ? ((data as { ai_tags: unknown[] }).ai_tags.filter(
          (t): t is string => typeof t === "string",
        ) as string[])
      : [],
    suggestedDestinations: Array.isArray(
      (data as { suggestedDestinations?: unknown })?.suggestedDestinations,
    )
      ? ((
          data as { suggestedDestinations: unknown[] }
        ).suggestedDestinations.filter(
          (d): d is "task" | "kb" | "timeline" | "graph" =>
            d === "task" || d === "kb" || d === "timeline" || d === "graph",
        ) as AISuggestions["suggestedDestinations"])
      : [],
    relatedNodeIds: [],
    suggestedKind: (() => {
      const k = (data as { suggestedKind?: unknown })?.suggestedKind;
      if (typeof k !== "string") return null;
      if (k === "idea" || k === "task" || k === "note" || k === "goal") return k;
      return null;
    })(),
  };
}
