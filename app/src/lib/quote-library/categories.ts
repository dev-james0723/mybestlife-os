/**
 * Category metadata for the Quote Library — grouping + accent colors used by
 * the category filter pills and the Wisdom Profile chart.
 *
 * Keep the flat list aligned with {@link QUOTE_CATEGORY_VALUES}. The
 * `groupId` lets the UI cluster pills into the four theme groups spec §6
 * describes (Inner Life, Purpose & Direction, Relationships, Action &
 * Mastery, Mind & Time).
 */

import {
  QUOTE_CATEGORY_VALUES,
  type QuoteCategory,
} from "@/types/quote";

export type QuoteCategoryGroupId =
  | "inner-life"
  | "purpose-direction"
  | "relationships"
  | "action-mastery"
  | "mind-time";

export type QuoteCategoryMeta = {
  value: QuoteCategory;
  groupId: QuoteCategoryGroupId;
  /** Tailwind color token hook used by the badge — stays inside the palette. */
  accent:
    | "rose"
    | "amber"
    | "emerald"
    | "sky"
    | "violet"
    | "indigo"
    | "teal"
    | "orange"
    | "fuchsia"
    | "slate";
};

export const QUOTE_CATEGORY_META: Record<QuoteCategory, QuoteCategoryMeta> = {
  // Inner Life
  Resilience: { value: "Resilience", groupId: "inner-life", accent: "amber" },
  "Self-Awareness": {
    value: "Self-Awareness",
    groupId: "inner-life",
    accent: "violet",
  },
  Mindfulness: { value: "Mindfulness", groupId: "inner-life", accent: "teal" },
  Courage: { value: "Courage", groupId: "inner-life", accent: "orange" },
  Acceptance: { value: "Acceptance", groupId: "inner-life", accent: "sky" },
  Gratitude: { value: "Gratitude", groupId: "inner-life", accent: "rose" },
  // Purpose & Direction
  Purpose: {
    value: "Purpose",
    groupId: "purpose-direction",
    accent: "indigo",
  },
  Vision: {
    value: "Vision",
    groupId: "purpose-direction",
    accent: "violet",
  },
  Discipline: {
    value: "Discipline",
    groupId: "purpose-direction",
    accent: "slate",
  },
  Growth: {
    value: "Growth",
    groupId: "purpose-direction",
    accent: "emerald",
  },
  Learning: {
    value: "Learning",
    groupId: "purpose-direction",
    accent: "sky",
  },
  Creativity: {
    value: "Creativity",
    groupId: "purpose-direction",
    accent: "fuchsia",
  },
  // Relationships
  Love: { value: "Love", groupId: "relationships", accent: "rose" },
  Friendship: { value: "Friendship", groupId: "relationships", accent: "amber" },
  Kindness: { value: "Kindness", groupId: "relationships", accent: "rose" },
  Family: { value: "Family", groupId: "relationships", accent: "orange" },
  Community: { value: "Community", groupId: "relationships", accent: "teal" },
  Forgiveness: {
    value: "Forgiveness",
    groupId: "relationships",
    accent: "sky",
  },
  // Action & Mastery
  Action: { value: "Action", groupId: "action-mastery", accent: "orange" },
  Leadership: {
    value: "Leadership",
    groupId: "action-mastery",
    accent: "indigo",
  },
  Craft: { value: "Craft", groupId: "action-mastery", accent: "emerald" },
  Excellence: {
    value: "Excellence",
    groupId: "action-mastery",
    accent: "amber",
  },
  Simplicity: {
    value: "Simplicity",
    groupId: "action-mastery",
    accent: "slate",
  },
  Focus: { value: "Focus", groupId: "action-mastery", accent: "indigo" },
  // Mind & Time
  Wisdom: { value: "Wisdom", groupId: "mind-time", accent: "violet" },
  Perspective: {
    value: "Perspective",
    groupId: "mind-time",
    accent: "sky",
  },
  Time: { value: "Time", groupId: "mind-time", accent: "slate" },
  Change: { value: "Change", groupId: "mind-time", accent: "emerald" },
  "Death & Impermanence": {
    value: "Death & Impermanence",
    groupId: "mind-time",
    accent: "slate",
  },
  Wonder: { value: "Wonder", groupId: "mind-time", accent: "fuchsia" },
};

export const QUOTE_CATEGORY_GROUPS: {
  id: QuoteCategoryGroupId;
  categories: QuoteCategory[];
}[] = [
  {
    id: "inner-life",
    categories: QUOTE_CATEGORY_VALUES.filter(
      (v) => QUOTE_CATEGORY_META[v].groupId === "inner-life",
    ),
  },
  {
    id: "purpose-direction",
    categories: QUOTE_CATEGORY_VALUES.filter(
      (v) => QUOTE_CATEGORY_META[v].groupId === "purpose-direction",
    ),
  },
  {
    id: "relationships",
    categories: QUOTE_CATEGORY_VALUES.filter(
      (v) => QUOTE_CATEGORY_META[v].groupId === "relationships",
    ),
  },
  {
    id: "action-mastery",
    categories: QUOTE_CATEGORY_VALUES.filter(
      (v) => QUOTE_CATEGORY_META[v].groupId === "action-mastery",
    ),
  },
  {
    id: "mind-time",
    categories: QUOTE_CATEGORY_VALUES.filter(
      (v) => QUOTE_CATEGORY_META[v].groupId === "mind-time",
    ),
  },
];

/** Hex values used by Recharts / image export. Kept token-aligned. */
export const QUOTE_ACCENT_HEX: Record<QuoteCategoryMeta["accent"], string> = {
  rose: "#f43f5e",
  amber: "#f59e0b",
  emerald: "#10b981",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  indigo: "#6366f1",
  teal: "#14b8a6",
  orange: "#f97316",
  fuchsia: "#d946ef",
  slate: "#64748b",
};

export function getCategoryHex(category: QuoteCategory): string {
  return QUOTE_ACCENT_HEX[QUOTE_CATEGORY_META[category].accent];
}
