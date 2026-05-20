/**
 * Canonical idea categories for structured capture / browsing.
 * Stored as plain `ideas.category` text; values are stable slugs.
 */
export const IDEA_CATEGORIES = [
  "product",
  "business",
  "content",
  "learning",
  "music",
  "tech",
  "design",
  "personal",
  "relationship",
  "career",
  "finance",
  "health",
  "travel",
  "philosophy",
  "random",
] as const;

export type IdeaCategorySlug = (typeof IDEA_CATEGORIES)[number];

/** Destinations understood by routing / product copy (subset may create side effects). */
export const IDEA_DESTINATION_OPTIONS = [
  { value: "task", labelKey: "destinationTask" as const },
  { value: "graph", labelKey: "destinationGraph" as const },
  { value: "kb", labelKey: "destinationKb" as const },
  { value: "timeline", labelKey: "destinationTimeline" as const },
] as const;
