/**
 * Relationship — UI-side enums + narrowing helpers.
 *
 * The DB stores `category` and `relationship_strength` as free-form TEXT
 * (slugs) so we can rename display labels in i18n without a migration.
 * The UI constrains the input to a fixed dropdown by intersecting the
 * raw value against these unions.
 *
 * Slugs are lowercase kebab-case to match the rest of the codebase
 * (e.g. health categories, knowledge categories).
 */

import type { Relationship } from "@/types/database";

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export const RELATIONSHIP_CATEGORIES = [
  "professor",
  "classmate",
  "collaborator",
  "friend",
  "family",
  "mentor",
  "professional-contact",
  "other",
] as const;

export type RelationshipCategory = (typeof RELATIONSHIP_CATEGORIES)[number];

export const DEFAULT_RELATIONSHIP_CATEGORY: RelationshipCategory = "other";

export function isRelationshipCategory(
  value: unknown,
): value is RelationshipCategory {
  return (
    typeof value === "string" &&
    (RELATIONSHIP_CATEGORIES as readonly string[]).includes(value)
  );
}

/**
 * Coerce a stored DB value into a known category, falling back to
 * `"other"` for legacy / hand-written rows. Use at the UI boundary.
 */
export function resolveRelationshipCategory(
  value: string | null | undefined,
): RelationshipCategory {
  return isRelationshipCategory(value) ? value : DEFAULT_RELATIONSHIP_CATEGORY;
}

// ---------------------------------------------------------------------------
// Strength
// ---------------------------------------------------------------------------

export const RELATIONSHIP_STRENGTHS = [
  "strong",
  "moderate",
  "weak",
  "new",
] as const;

export type RelationshipStrength = (typeof RELATIONSHIP_STRENGTHS)[number];

export const DEFAULT_RELATIONSHIP_STRENGTH: RelationshipStrength = "new";

export function isRelationshipStrength(
  value: unknown,
): value is RelationshipStrength {
  return (
    typeof value === "string" &&
    (RELATIONSHIP_STRENGTHS as readonly string[]).includes(value)
  );
}

export function resolveRelationshipStrength(
  value: string | null | undefined,
): RelationshipStrength {
  return isRelationshipStrength(value) ? value : DEFAULT_RELATIONSHIP_STRENGTH;
}

// ---------------------------------------------------------------------------
// Insert / Update payload shapes
//
// Mirrors the rest of the codebase: a strict Insert that omits server-
// managed columns, and a Partial Update that lets callers send only the
// fields they're changing.
// ---------------------------------------------------------------------------

export type RelationshipInsert = Omit<
  Relationship,
  "id" | "user_id" | "created_at" | "updated_at"
> & {
  /** Optional — defaults to auth.uid() in the DB. */
  user_id?: string;
};

export type RelationshipUpdate = Partial<
  Omit<Relationship, "id" | "user_id" | "created_at" | "updated_at">
>;

// ---------------------------------------------------------------------------
// Tag helpers — the form uses a comma-separated text input; the DB uses
// text[]. Both helpers round-trip cleanly: parse(format(x)) === x for
// any tag list.
// ---------------------------------------------------------------------------

export function parseTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function formatTagsForInput(tags: readonly string[] | null): string {
  if (!tags || tags.length === 0) return "";
  return tags.join(", ");
}
