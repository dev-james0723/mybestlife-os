import type { AISuggestions } from "@/types/idea";
import { clampIdeaTitle } from "@/lib/ideas/clamp-idea-title";
import { normalizeIdeaTags } from "@/lib/ideas/normalize-idea-tag";

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
  // Preserve the original script (Traditional Chinese stays Traditional Chinese)
  // and clamp by the idea-title rules instead of slicing bytes.
  const title =
    typeof titleRaw === "string" ? clampIdeaTitle(titleRaw) || null : null;

  // Normalize into short semantic keywords; never destroy non-ASCII tags.
  const ai_tags = normalizeIdeaTags(o.ai_tags, 5);

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
