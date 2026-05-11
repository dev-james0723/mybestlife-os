/**
 * Pure helpers shared by the Relationship gallery, filter bar, card,
 * detail panel, and form. Kept side-effect-free + dependency-free
 * (besides the i18n copy type) so they're easy to unit-test and reuse.
 */

import type { Relationship } from "@/types/database";
import {
  RELATIONSHIP_CATEGORIES,
  RELATIONSHIP_STRENGTHS,
  resolveRelationshipCategory,
  resolveRelationshipStrength,
  type RelationshipCategory,
  type RelationshipStrength,
} from "@/types/relationship";
import type { RelationshipUiCopy } from "@/lib/i18n/relationship-ui";

// ---------------------------------------------------------------------------
// Slug → display label resolvers
// ---------------------------------------------------------------------------

export function getCategoryLabel(
  slug: string | null | undefined,
  copy: RelationshipUiCopy,
): string {
  const cat = resolveRelationshipCategory(slug);
  switch (cat) {
    case "professor":
      return copy.relCatProfessor;
    case "classmate":
      return copy.relCatClassmate;
    case "collaborator":
      return copy.relCatCollaborator;
    case "friend":
      return copy.relCatFriend;
    case "family":
      return copy.relCatFamily;
    case "mentor":
      return copy.relCatMentor;
    case "professional-contact":
      return copy.relCatProfessionalContact;
    case "other":
      return copy.relCatOther;
  }
}

export function getStrengthLabel(
  slug: string | null | undefined,
  copy: RelationshipUiCopy,
): string {
  const str = resolveRelationshipStrength(slug);
  switch (str) {
    case "strong":
      return copy.relStrStrong;
    case "moderate":
      return copy.relStrModerate;
    case "weak":
      return copy.relStrWeak;
    case "new":
      return copy.relStrNew;
  }
}

/** Iteration order for the category dropdown (presentation-stable). */
export const CATEGORY_DROPDOWN_ORDER: readonly RelationshipCategory[] = [
  ...RELATIONSHIP_CATEGORIES,
];

/** Iteration order for the strength dropdown. */
export const STRENGTH_DROPDOWN_ORDER: readonly RelationshipStrength[] = [
  ...RELATIONSHIP_STRENGTHS,
];

// ---------------------------------------------------------------------------
// Strength → visual chip class
//
// Tokens only — no raw hex. The 4 ramps follow a "warmth" scale so the
// cards read at a glance: strong = primary, moderate = neutral-blue,
// weak = muted, new = accent. All colors live in the existing token set.
// ---------------------------------------------------------------------------

export function getStrengthChipClassName(
  slug: string | null | undefined,
): string {
  const str = resolveRelationshipStrength(slug);
  switch (str) {
    case "strong":
      return "bg-primary/15 text-primary border-primary/30";
    case "moderate":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "weak":
      return "bg-muted text-muted-foreground border-border";
    case "new":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  }
}

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

export type RelationshipSortKey =
  | "last_contact"
  | "name"
  | "favorites_first";

export const RELATIONSHIP_SORT_KEYS: readonly RelationshipSortKey[] = [
  "last_contact",
  "name",
  "favorites_first",
];

export function getSortLabel(
  key: RelationshipSortKey,
  copy: RelationshipUiCopy,
): string {
  switch (key) {
    case "name":
      return copy.relSortNameAZ;
    case "last_contact":
      return copy.relSortLastContact;
    case "favorites_first":
      return copy.relSortFavoritesFirst;
  }
}

/**
 * Returns a NEW array sorted by the given key. Never mutates the input.
 *
 * Tie-breakers are deterministic (name → id) so the gallery doesn't
 * jitter between renders when two rows share a sort key.
 */
export function sortRelationships(
  rows: readonly Relationship[],
  key: RelationshipSortKey,
): Relationship[] {
  const arr = [...rows];
  switch (key) {
    case "name":
      arr.sort((a, b) => compareName(a, b) || compareId(a, b));
      break;
    case "last_contact":
      arr.sort(
        (a, b) =>
          compareLastContactDesc(a, b) || compareName(a, b) || compareId(a, b),
      );
      break;
    case "favorites_first":
      arr.sort(
        (a, b) =>
          compareFavoritesFirst(a, b) ||
          compareLastContactDesc(a, b) ||
          compareName(a, b) ||
          compareId(a, b),
      );
      break;
  }
  return arr;
}

function compareName(a: Relationship, b: Relationship): number {
  return a.person_name.localeCompare(b.person_name, undefined, {
    sensitivity: "base",
  });
}

function compareId(a: Relationship, b: Relationship): number {
  return a.id.localeCompare(b.id);
}

function compareFavoritesFirst(a: Relationship, b: Relationship): number {
  if (a.is_favorite === b.is_favorite) return 0;
  return a.is_favorite ? -1 : 1;
}

/**
 * Most-recent contact first. Rows with no `last_contact_date` sink to
 * the bottom (treated as "infinitely long ago"). This matches what
 * users intuitively expect from a CRM gallery sorted by recency.
 */
function compareLastContactDesc(a: Relationship, b: Relationship): number {
  const av = a.last_contact_date;
  const bv = b.last_contact_date;
  if (av === bv) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return av < bv ? 1 : -1;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

export type RelationshipFilters = {
  search: string;
  category: RelationshipCategory | "all";
  strength: RelationshipStrength | "all";
  favoritesOnly: boolean;
};

export function applyRelationshipFilters(
  rows: readonly Relationship[],
  filters: RelationshipFilters,
): Relationship[] {
  const term = filters.search.trim().toLowerCase();

  return rows.filter((r) => {
    if (filters.favoritesOnly && !r.is_favorite) return false;
    if (filters.category !== "all" && r.category !== filters.category)
      return false;
    if (
      filters.strength !== "all" &&
      r.relationship_strength !== filters.strength
    )
      return false;

    if (term.length === 0) return true;
    return matchesSearch(r, term);
  });
}

function matchesSearch(r: Relationship, term: string): boolean {
  const haystack: string[] = [r.person_name];
  if (r.email) haystack.push(r.email);
  if (r.phone) haystack.push(r.phone);
  if (r.next_action) haystack.push(r.next_action);
  if (r.last_interaction_notes) haystack.push(r.last_interaction_notes);
  if (r.commitments_made) haystack.push(r.commitments_made);
  if (r.preferences_and_details) haystack.push(r.preferences_and_details);
  if (r.general_notes) haystack.push(r.general_notes);
  haystack.push(...r.tags);

  for (const v of haystack) {
    if (v.toLowerCase().includes(term)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Initials for avatar fallback
// ---------------------------------------------------------------------------

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
