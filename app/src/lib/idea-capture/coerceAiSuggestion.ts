import type { AISuggestions } from "@/types/idea";

const ALLOWED_DESTINATIONS = new Set(["task", "kb", "timeline", "graph"]);
const ALLOWED_KINDS = new Set(["idea", "task", "note", "goal"]);

/**
 * Normalises LLM JSON into the shape expected by Idea Capture UI.
 * Mirrors `app/supabase/functions/idea-ai-assist/index.ts` `coerceSuggestion`.
 */
export function coerceSuggestionPayload(raw: unknown): AISuggestions {
  if (!raw || typeof raw !== "object") {
    return {
      title: null,
      ai_tags: [],
      suggestedDestinations: [],
      suggestedKind: null,
      relatedNodeIds: [],
    };
  }

  const o = raw as Record<string, unknown>;

  const titleRaw = o.title;
  const title =
    typeof titleRaw === "string"
      ? titleRaw.trim().replace(/\.+$/, "").slice(0, 60) || null
      : null;

  const ai_tags = Array.isArray(o.ai_tags)
    ? o.ai_tags
        .filter((t): t is string => typeof t === "string")
        .map((t) =>
          t
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]+/g, ""),
        )
        .filter(Boolean)
        .slice(0, 5)
    : [];

  const suggestedDestinations = Array.isArray(o.suggestedDestinations)
    ? o.suggestedDestinations
        .filter((d): d is string => typeof d === "string")
        .map((d) => d.trim().toLowerCase())
        .filter((d): d is AISuggestions["suggestedDestinations"][number] =>
          ALLOWED_DESTINATIONS.has(d),
        )
        .slice(0, 4)
    : [];

  const rawKind =
    typeof o.suggestedKind === "string" ? o.suggestedKind.trim().toLowerCase() : null;
  const suggestedKind =
    rawKind && ALLOWED_KINDS.has(rawKind)
      ? (rawKind as AISuggestions["suggestedKind"])
      : null;

  return {
    title,
    ai_tags,
    suggestedDestinations,
    suggestedKind,
    relatedNodeIds: [],
  };
}
