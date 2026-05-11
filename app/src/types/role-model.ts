/**
 * Role Model — domain types shared between the Relationship hub UI, the
 * `useRoleModels` data hooks, the AI Auto-Fill hook, and the
 * `/api/ai/role-model/autofill` route handler.
 *
 * Row shape (snake_case) lives in `@/types/database` (`RoleModel`); the
 * structured payload types below describe the JSONB columns and the AI
 * auto-fill output contract.
 */

/**
 * Loose category taxonomy. Free-form `string` is allowed at the storage
 * layer so users can type anything; the suggested values below drive the
 * filter chips and AI category-snapping.
 */
export const ROLE_MODEL_SUGGESTED_CATEGORIES = [
  "philosopher",
  "scientist",
  "entrepreneur",
  "artist",
  "writer",
  "athlete",
  "leader",
  "engineer",
  "designer",
  "musician",
  "activist",
  "teacher",
  "explorer",
  "spiritual",
  "other",
] as const;

export type RoleModelSuggestedCategory =
  (typeof ROLE_MODEL_SUGGESTED_CATEGORIES)[number];

/** Single quote attributed to the role model. */
export type RoleModelQuote = {
  text: string;
  /** Book / speech / interview / year, etc. Optional. */
  source?: string | null;
};

/** Single takeaway / lesson card. */
export type RoleModelKeyLesson = {
  title: string;
  /** Short paragraph explaining the lesson. Optional. */
  detail?: string | null;
};

/**
 * Closed list of link kinds used by both the AI extraction schema and the UI
 * picker. Free-form strings are *not* allowed — the dropdown enforces these.
 */
export const ROLE_MODEL_LINK_KINDS = [
  "wikipedia",
  "official",
  "book",
  "article",
  "video",
  "podcast",
  "social",
  "other",
] as const;

export type RoleModelLinkKind = (typeof ROLE_MODEL_LINK_KINDS)[number];

/** Reference link displayed on the detail panel. */
export type RoleModelLink = {
  label: string;
  url: string;
  kind?: RoleModelLinkKind | null;
};

/**
 * Status state machine for the AI Auto-Fill UX.
 *
 * - `idle`        — user hasn't triggered autofill yet
 * - `researching` — Call 1 in flight (web search grounding)
 * - `extracting`  — Call 2 in flight (structured JSON extraction)
 * - `success`     — payload returned, user is reviewing in the form
 * - `error`       — call failed; retry surface visible
 */
export type RoleModelAutoFillStatus =
  | "idle"
  | "researching"
  | "extracting"
  | "success"
  | "error";

/**
 * Output contract returned by `POST /api/ai/role-model/autofill`. Mirrors the
 * Gemini `responseSchema`. All fields are nullable so the model can omit
 * what it can't confidently source. The route handler validates this shape
 * with Zod before returning.
 */
export type RoleModelAutoFillResult = {
  name: string;
  bio: string | null;
  category: string | null;
  /** One-sentence "why admire" hook, surfaced as the card subtitle. */
  admiration_blurb: string | null;
  /** Best-effort portrait URL. May be a Wikipedia/Wikimedia file. */
  photo_url: string | null;
  quotes: RoleModelQuote[];
  key_lessons: RoleModelKeyLesson[];
  tags: string[];
  links: RoleModelLink[];
  /**
   * Optional links to the signed-in user's entities when the model judges
   * the role model relevant to ongoing work. IDs are always validated server-side.
   */
  linked_project_ids: string[];
  linked_goal_ids: string[];
  linked_note_ids: string[];
};

/** Slim entity lists sent with autofill so the model can propose `linked_*` ids. */
export type RoleModelAutofillContextProject = {
  id: string;
  name: string;
  description?: string | null;
};

export type RoleModelAutofillContextGoal = {
  id: string;
  name: string;
  description?: string | null;
};

export type RoleModelAutofillContextNote = {
  id: string;
  title: string;
  content?: string | null;
};

export type RoleModelAutofillContextTask = {
  id: string;
  title: string;
  description?: string | null;
  project_id?: string | null;
};

/** Request body fragment: `POST /api/ai/role-model/autofill` `{ context?: ... }`. */
export type RoleModelAutofillContextPayload = {
  projects?: RoleModelAutofillContextProject[];
  goals?: RoleModelAutofillContextGoal[];
  notes?: RoleModelAutofillContextNote[];
  tasks?: RoleModelAutofillContextTask[];
};

/**
 * Wire response from the route handler. Includes lightweight model-usage
 * metadata for the UI's "AI-generated — review before saving" disclosure.
 */
export type RoleModelAutoFillResponse = {
  result: RoleModelAutoFillResult;
  meta: {
    /** Gemini model id that produced the structured extraction. */
    extraction_model: string;
    /** Gemini model id that did web research (may equal extraction_model). */
    research_model: string;
    /** ISO timestamp the route handler completed. */
    generated_at: string;
  };
};

/**
 * Type guard for the JSONB `quotes` column when reading back from Supabase.
 * Used by the repository's `mapRow` to coerce `Json` → `RoleModelQuote[]`
 * without throwing on legacy / corrupt rows.
 */
export function isRoleModelQuoteArray(value: unknown): value is RoleModelQuote[] {
  return (
    Array.isArray(value) &&
    value.every(
      (q) =>
        q &&
        typeof q === "object" &&
        typeof (q as { text?: unknown }).text === "string",
    )
  );
}

export function isRoleModelKeyLessonArray(
  value: unknown,
): value is RoleModelKeyLesson[] {
  return (
    Array.isArray(value) &&
    value.every(
      (l) =>
        l &&
        typeof l === "object" &&
        typeof (l as { title?: unknown }).title === "string",
    )
  );
}

export function isRoleModelLinkArray(value: unknown): value is RoleModelLink[] {
  return (
    Array.isArray(value) &&
    value.every(
      (link) =>
        link &&
        typeof link === "object" &&
        typeof (link as { label?: unknown }).label === "string" &&
        typeof (link as { url?: unknown }).url === "string",
    )
  );
}
