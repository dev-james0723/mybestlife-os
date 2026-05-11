/**
 * Quote Library — shared type definitions.
 *
 * Single source of truth for the `Quote` entity used by client, server, AI
 * prompts, SDK, and export pipeline. Keep the DB columns and these fields
 * aligned 1-to-1 (see `supabase/migrations/20260620150000_quote_library.sql`).
 */

import type { AppLocale } from "@/lib/i18n/app-locale";

/** The 30 canonical categories (spec §6). Values double as English labels. */
export const QUOTE_CATEGORY_VALUES = [
  // Inner Life
  "Resilience",
  "Self-Awareness",
  "Mindfulness",
  "Courage",
  "Acceptance",
  "Gratitude",
  // Purpose & Direction
  "Purpose",
  "Vision",
  "Discipline",
  "Growth",
  "Learning",
  "Creativity",
  // Relationships
  "Love",
  "Friendship",
  "Kindness",
  "Family",
  "Community",
  "Forgiveness",
  // Action & Mastery
  "Action",
  "Leadership",
  "Craft",
  "Excellence",
  "Simplicity",
  "Focus",
  // Mind & Time
  "Wisdom",
  "Perspective",
  "Time",
  "Change",
  "Death & Impermanence",
  "Wonder",
] as const;

export type QuoteCategory = (typeof QUOTE_CATEGORY_VALUES)[number];

/** Controlled enum for the `source_type` column. */
export const QUOTE_SOURCE_TYPES = [
  "book",
  "article",
  "speech",
  "conversation",
  "movie",
  "song",
  "poem",
  "personal",
  "other",
] as const;
export type QuoteSourceType = (typeof QUOTE_SOURCE_TYPES)[number];

/** Controlled enum for the `source_module` column (where the quote came from). */
export const QUOTE_SOURCE_MODULES = [
  "manual",
  "mindclear",
  "journal",
  "dashboard",
  "goals",
  "knowledge-base",
  "ocr",
  "import",
] as const;
export type QuoteSourceModule = (typeof QUOTE_SOURCE_MODULES)[number];

/** Controlled vocabulary for `emotion_tone` (used for filtering + Wisdom Profile). */
export const QUOTE_EMOTION_TONES = [
  "uplifting",
  "contemplative",
  "challenging",
  "grounding",
  "bittersweet",
  "playful",
  "fierce",
  "tender",
  "curious",
  "resolute",
] as const;
export type QuoteEmotionTone = (typeof QUOTE_EMOTION_TONES)[number];

/** Source Intelligence (spec 2.6) — populated by Gemini grounded research. */
export type QuoteSourceIntelligence = {
  author_bio: string | null;
  historical_context: string | null;
  related_quotes: { text: string; source: string | null }[];
  /** 0–1 confidence from the model. Low → show "Source unverified". */
  confidence: number;
  /** ISO timestamp of the enrichment call. */
  fetched_at: string;
  /** When the LLM could not confidently verify, never lies — flags as unverified. */
  unverified: boolean;
};

/**
 * Thumbnail status state machine. `pending` after insert, `generating` while
 * the server-side pipeline is running, `completed` once an image is uploaded,
 * `failed` if Gemini / upload errored, `fallback` when the deterministic CSS
 * gradient is being used in lieu of an actual image.
 */
export const QUOTE_THUMBNAIL_STATUSES = [
  "pending",
  "generating",
  "completed",
  "failed",
  "fallback",
] as const;

export type QuoteThumbnailStatus = (typeof QUOTE_THUMBNAIL_STATUSES)[number];

/**
 * Structured visual direction derived from the quote by Gemini. Persisted on
 * the row alongside the rendered image so the UI can mood-match the dark
 * overlay even before the picture loads (and so backfill can re-render on
 * prompt-template changes without re-analyzing the quote).
 */
export type QuoteThumbnailMeta = {
  thumbnail_url: string | null;
  thumbnail_prompt: string | null;
  thumbnail_status: QuoteThumbnailStatus;
  thumbnail_generated_at: string | null;
  thumbnail_error: string | null;
  thumbnail_mood: string | null;
  thumbnail_palette: string[] | null;
  thumbnail_visual_keywords: string[] | null;
  thumbnail_provider: string | null;
  thumbnail_version: string | null;
};

/** Core row type as persisted in Supabase. */
export type Quote = {
  id: string;
  user_id: string;

  // Content
  quote_text: string;
  source_author: string | null;
  source_context: string | null;

  // Provenance
  source_url: string | null;
  source_type: QuoteSourceType | null;
  source_module: QuoteSourceModule | null;

  // Classification (AI-populated)
  category: QuoteCategory | null;
  tags: string[];
  emotion_tone: QuoteEmotionTone | null;

  // Personalization
  personal_note: string | null;
  is_favorite: boolean;
  linked_goal_id: string | null;

  // Display / localization
  language: AppLocale | string;
  confidence_score: number | null;

  // AI enrichment
  is_ai_enriched: boolean;
  source_intelligence: QuoteSourceIntelligence | null;

  // Cinematic thumbnail (spec — Quote Thumbnail Generation)
  thumbnail_url: string | null;
  thumbnail_prompt: string | null;
  thumbnail_status: QuoteThumbnailStatus;
  thumbnail_generated_at: string | null;
  thumbnail_error: string | null;
  thumbnail_mood: string | null;
  thumbnail_palette: string[] | null;
  thumbnail_visual_keywords: string[] | null;
  thumbnail_provider: string | null;
  thumbnail_version: string | null;

  // System
  is_seed: boolean;
  last_surfaced_on: string | null;
  created_at: string;
  updated_at: string;
};

/** Collection (user-named bucket of quotes). */
export type QuoteCollection = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteCollectionItem = {
  id: string;
  user_id: string;
  collection_id: string;
  quote_id: string;
  created_at: string;
};

/** Write shape for creating a new quote (user-controlled fields only). */
export type CreateQuoteInput = {
  quote_text: string;
  source_author?: string | null;
  source_context?: string | null;
  source_url?: string | null;
  source_type?: QuoteSourceType | null;
  source_module?: QuoteSourceModule | null;
  category?: QuoteCategory | null;
  tags?: string[];
  emotion_tone?: QuoteEmotionTone | null;
  personal_note?: string | null;
  is_favorite?: boolean;
  linked_goal_id?: string | null;
  language?: string;
};

export type UpdateQuoteInput = Partial<CreateQuoteInput>;

/** Runtime filter state used by the list view. */
export type QuoteFilters = {
  search: string;
  categories: QuoteCategory[];
  tones: QuoteEmotionTone[];
  sourceModules: QuoteSourceModule[];
  tags: string[];
  favoritesOnly: boolean;
  dateRange: { from: string | null; to: string | null };
  linkedGoalId: string | null;
  collectionId: string | null;
};

export type QuoteSortKey =
  | "created_at_desc"
  | "created_at_asc"
  | "category"
  | "source_author"
  | "emotion_tone";

export const DEFAULT_QUOTE_FILTERS: QuoteFilters = {
  search: "",
  categories: [],
  tones: [],
  sourceModules: [],
  tags: [],
  favoritesOnly: false,
  dateRange: { from: null, to: null },
  linkedGoalId: null,
  collectionId: null,
};
