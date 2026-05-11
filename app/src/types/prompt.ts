/**
 * AI Knowledge — prompt domain types.
 *
 * Parallel to the Career Coach prompt model (`SystemPromptTemplate`,
 * `UserCustomPrompt`) but designed for the AI Knowledge redesign: a curated
 * library seeded from `ai-boost/awesome-prompts`, personal prompt CRUD with
 * favorites + runs, and a wizard-driven prompt creator.
 *
 * Canonical variable syntax is `{variable}` (single braces). Execution provider
 * in v1 targets Gemini, but `PromptRun.provider` is an open union so we can add
 * providers later without a migration.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";

// ---------------------------------------------------------------------------
// Localized content primitives
// ---------------------------------------------------------------------------

/** Locale-keyed string bag (e.g. `{ en: "...", "zh-TW": "..." }`). */
export type LocalizedText = Partial<Record<AppLocale, string>> & { en: string };

// ---------------------------------------------------------------------------
// Category taxonomy
// ---------------------------------------------------------------------------

/**
 * Top-level curated categories. Flat, stable, UI-driven buckets that every
 * imported / custom prompt must map into.
 */
export type PromptTopCategory =
  | "writing_content"
  | "productivity_planning"
  | "coding_development"
  | "research_analysis"
  | "business_strategy"
  | "learning_education"
  | "career_professional"
  | "life_personal_growth"
  | "arts_creative"
  | "language_learning"
  | "expert_personas"
  | "meta_prompt_engineering";

export const PROMPT_TOP_CATEGORIES: PromptTopCategory[] = [
  "writing_content",
  "productivity_planning",
  "coding_development",
  "research_analysis",
  "business_strategy",
  "learning_education",
  "career_professional",
  "life_personal_growth",
  "arts_creative",
  "language_learning",
  "expert_personas",
  "meta_prompt_engineering",
];

/**
 * Category row: row in `prompt_categories`. A category can be top-level
 * (`parent_slug = null`) or a subcategory anchored to a top-level parent.
 */
export type PromptCategory = {
  id: string;
  slug: string;
  /** Non-null for subcategories, null for top-level buckets. */
  parent_slug: string | null;
  /** Canonical top-level bucket this category (or its parent) belongs to. */
  top_category: PromptTopCategory;
  name_i18n: LocalizedText;
  description_i18n: LocalizedText | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------------

/**
 * Parsed/authored variable spec on a prompt. `name` is the literal token that
 * appears inside `{}` in the body (e.g. `topic`).
 */
export type PromptVariable = {
  name: string;
  label: string | null;
  description: string | null;
  required: boolean;
  /** Optional default / example for the variable. */
  example: string | null;
};

// ---------------------------------------------------------------------------
// Source discrimination
// ---------------------------------------------------------------------------

/** Whether a prompt record comes from the curated library or a user's custom prompt. */
export type PromptSource = "library" | "custom";

/**
 * Provenance metadata for library prompts ported from external repos.
 * Required on `library` prompts; always `null` on `custom` prompts.
 */
export type PromptProvenance = {
  source_repo: string;
  source_url: string | null;
  source_path: string | null;
  license: string | null;
  attribution: string | null;
};

// ---------------------------------------------------------------------------
// Prompt (discriminated union by `source`)
// ---------------------------------------------------------------------------

type PromptBase = {
  id: string;
  slug: string;
  title_i18n: LocalizedText;
  description_i18n: LocalizedText;
  /**
   * Full prompt body. Canonical variable syntax: `{variable}`. For library
   * prompts this is typically English; UI chrome is localized separately.
   */
  body: string;
  body_locale: AppLocale;
  /** Top-level category bucket. Must match `category.top_category`. */
  top_category: PromptTopCategory;
  /** Optional subcategory (FK slug into `prompt_categories`). */
  sub_category_slug: string | null;
  tags: string[];
  variables: PromptVariable[];
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryPrompt = PromptBase & {
  source: "library";
  provenance: PromptProvenance;
  is_featured: boolean;
  sort_order: number;
};

export type CustomPrompt = PromptBase & {
  source: "custom";
  user_id: string;
  is_favorite: boolean;
  usage_count: number;
  last_used_at: string | null;
  /**
   * If the user forked a library prompt, we keep the originating slug for
   * attribution + "updates available" affordances. Null for scratch-built.
   */
  forked_from_prompt_slug: string | null;
};

/** Union over both sources; narrow with `prompt.source`. */
export type Prompt = LibraryPrompt | CustomPrompt;

// ---------------------------------------------------------------------------
// Runs
// ---------------------------------------------------------------------------

/**
 * Open string union on purpose: v1 targets Gemini, but we want to record
 * runs from future providers without schema migration.
 */
export type PromptProvider = "gemini" | "claude" | "openai" | "custom" | (string & {});

export type PromptRunStatus = "pending" | "running" | "succeeded" | "failed" | "canceled";

/**
 * A single execution of a prompt against an AI provider. We record variable
 * values (for "re-run with same inputs") and a result snippet (not the full
 * response body, to keep storage bounded).
 */
export type PromptRun = {
  id: string;
  user_id: string;
  /** Exactly one of these is non-null, enforced by DB check constraint. */
  library_prompt_id: string | null;
  custom_prompt_id: string | null;
  provider: PromptProvider;
  model: string | null;
  variables: Record<string, string>;
  status: PromptRunStatus;
  result_snippet: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

/**
 * A favorite can target either a library prompt (via its slug) or a custom
 * prompt (via its id). Custom prompts also carry a denormalized `is_favorite`
 * bool on the row itself, so this table focuses on library favorites. Kept as
 * a union so consumers can reason about both.
 */
export type PromptFavorite =
  | {
      kind: "library";
      user_id: string;
      library_prompt_id: string;
      created_at: string;
    }
  | {
      kind: "custom";
      user_id: string;
      custom_prompt_id: string;
      created_at: string;
    };

// ---------------------------------------------------------------------------
// Wizard state (Phase 4 uses this; defined now so types compile end-to-end)
// ---------------------------------------------------------------------------

export type PromptWizardStepId =
  | "goal"
  | "expert_role"
  | "context"
  | "output_format"
  | "tone_style"
  | "variables"
  | "guardrails"
  | "examples";

export type PromptCreatorWizardState = {
  stepId: PromptWizardStepId;
  goal: string;
  expertRole: string;
  context: string;
  outputFormat: string;
  toneStyle: string[];
  variables: PromptVariable[];
  guardrails: string;
  examples: Array<{ input: string; expectedOutput: string }>;
  draftId: string | null;
  /** Last generated prompt text (after synthesis). */
  synthesizedBody: string | null;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Helpers (pure, no I/O)
// ---------------------------------------------------------------------------

/**
 * Pick the best localized string for a locale, falling back to English.
 * Tolerates partially-filled locale bags common in seeded library data.
 */
export function pickLocalizedText(
  bag: LocalizedText,
  locale: AppLocale,
): string {
  return bag[locale] ?? bag.en;
}

/**
 * Extract variable names from a prompt body using the canonical `{name}`
 * syntax. Names must start with a letter/underscore; numbers allowed after.
 * Matches are de-duplicated preserving first-seen order.
 */
export function extractVariableNames(body: string): string[] {
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of body.matchAll(re)) {
    const name = m[1];
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}
