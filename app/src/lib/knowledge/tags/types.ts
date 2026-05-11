/**
 * Knowledge-tag taxonomy types.
 *
 * The taxonomy is a forest:
 *
 *   - {@link TagCategoryDef} are the top-level domains (Technology, Business, …)
 *     that own one or more root tags.
 *   - {@link CanonicalTagDef} are the canonical concept nodes; each can be a
 *     child of either a category root or another tag, and tracks the human
 *     aliases that should collapse onto it.
 *   - {@link TagNode} is the *runtime* shape with item counts and resolved
 *     children, produced by {@link buildTagTree}.
 *
 * The seed taxonomy lives in `seed-taxonomy.ts` and is the single source of
 * truth for the default mapping. A DB-backed override layer can later extend
 * this with user-defined tags / categories without changing the consumer code.
 */

export type CanonicalTagType = "topic" | "entity" | "tool" | "concept" | "method";

/** Static, declarative shape of a canonical tag in the seed taxonomy. */
export type CanonicalTagDef = {
  /** Stable id (snake_case, kebab-case-friendly). Used for URL state etc. */
  id: string;
  /** Display name shown in the UI ("AI Agents"). */
  name: string;
  /**
   * URL/slug-safe form ("ai-agents"). Always lowercase, hyphenated. The
   * normalizer collapses incoming raw tags onto this slug.
   */
  slug: string;
  /** Optional one-line description for tooltips / future admin tooling. */
  description?: string;
  /** Parent canonical tag id (or null for tags that sit directly under a category). */
  parentId: string | null;
  /** Top-level category id this tag rolls up to. */
  categoryId: string;
  /**
   * All human variants that should fold onto this canonical tag. Includes
   * casing variants, hyphen/space variants, plurals, abbreviations, and
   * bilingual forms (e.g. `ai 代理`, `ai-agents-cn`). Stored as raw strings;
   * the matcher normalizes both sides before comparing.
   */
  aliases: string[];
  /** Optional semantic role used for future facet UIs. */
  type?: CanonicalTagType;
};

/** Top-level grouping (Technology, Business, Music, …). */
export type TagCategoryDef = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  /**
   * Tailwind accent class fragment used for hover / selected states. Kept as a
   * symbolic key so the UI can map it to dark-mode-aware classes once.
   */
  accent: TagCategoryAccent;
  /** Lucide icon name; resolved at render time. */
  iconName?: TagCategoryIconName;
  /** Sort order (lower first). */
  order: number;
};

export type TagCategoryAccent =
  | "violet"
  | "teal"
  | "amber"
  | "rose"
  | "blue"
  | "emerald"
  | "slate"
  | "indigo"
  | "pink"
  | "orange";

export type TagCategoryIconName =
  | "Cpu"
  | "Briefcase"
  | "GraduationCap"
  | "Music"
  | "HeartPulse"
  | "Microscope"
  | "Palette"
  | "Globe2"
  | "Sparkles"
  | "Layers";

/** Runtime tree node, produced from items + taxonomy seed. */
export type TagNode = {
  /** Canonical tag id. */
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  categoryId: string;
  type?: CanonicalTagType;
  /** All aliases (including the canonical name + slug) used for search. */
  aliases: string[];
  /** Item count *for this tag only* (does not include descendants). */
  directCount: number;
  /** Item count including all descendants. */
  totalCount: number;
  /** Children resolved into runtime nodes. */
  children: TagNode[];
  /** Materialized human path: `["Technology", "AI", "AI Agents"]`. */
  path: string[];
  /** Materialized id path: `["technology", "ai", "ai-agents"]`. */
  idPath: string[];
};

/** Runtime category, holding the resolved root nodes and aggregate counts. */
export type TagCategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  accent: TagCategoryAccent;
  iconName?: TagCategoryIconName;
  order: number;
  roots: TagNode[];
  totalCount: number;
};

/**
 * Result of mapping an incoming raw tag to a canonical tag.
 * `null` when the tag could not be mapped to any known canonical tag (the
 * caller is then responsible for rendering it under the synthetic `other`
 * category).
 */
export type TagMatchResult = {
  /** Canonical tag id. */
  canonicalId: string;
  /** How the match was found, useful for telemetry. */
  reason: "alias" | "slug" | "name" | "fuzzy";
  /** 0..1 score; alias / slug / name = 1, fuzzy < 1. */
  confidence: number;
};

/** Public taxonomy snapshot consumed by hooks / components. */
export type TaxonomySnapshot = {
  categories: TagCategoryNode[];
  /** Flat lookup: id → tag node (only canonical, mapped tags). */
  tagIndex: Map<string, TagNode>;
  /**
   * The synthetic `Other` category that holds any unmapped raw tags. Always
   * present (may be empty) so the UI can render a stable container.
   */
  other: TagCategoryNode;
  /** Total item count across all categories (deduped). */
  totalItems: number;
  /** Classification health diagnostics for tuning taxonomy quality. */
  diagnostics: {
    observedTagCount: number;
    otherTagCount: number;
    otherRatio: number;
    targetOtherRatio: number;
  };
};
