/**
 * Bucket List — shared type definitions.
 *
 * Single source of truth for the `BucketItem` entity used by client, server,
 * AI prompts, SDK, and dashboard integrations. Keep these aligned 1-to-1 with
 * the DB columns in `supabase/migrations/20260621000000_bucket_list.sql`.
 */

// ─── Controlled vocabularies ─────────────────────────────────────────────────

export const BUCKET_TYPES = [
  "travel",
  "achievement",
  "growth",
  "relationship",
  "purchase",
  "lifestyle",
] as const;
export type BucketType = (typeof BUCKET_TYPES)[number];

export const BUCKET_STATUSES = [
  "dreaming",
  "exploring",
  "planning",
  "active",
  "funded",
  "scheduled",
  "booked",
  "completed",
  "paused",
  "archived",
] as const;
export type BucketStatus = (typeof BUCKET_STATUSES)[number];

export const BUCKET_PRIORITIES = ["low", "medium", "high", "someday"] as const;
export type BucketPriority = (typeof BUCKET_PRIORITIES)[number];

export const BUCKET_DIFFICULTIES = ["easy", "med", "hard", "epic"] as const;
export type BucketDifficulty = (typeof BUCKET_DIFFICULTIES)[number];

export const BUCKET_TIME_HORIZONS = [
  "this_year",
  "1_3_years",
  "3_5_years",
  "lifetime",
] as const;
export type BucketTimeHorizon = (typeof BUCKET_TIME_HORIZONS)[number];

export const BUCKET_COST_BANDS = ["$", "$$", "$$$", "$$$$"] as const;
export type BucketCostBand = (typeof BUCKET_COST_BANDS)[number];

export const BUCKET_TRAVEL_BUDGET_LEVELS = [
  "budget",
  "mid",
  "premium",
  "luxury",
] as const;
export type BucketTravelBudgetLevel =
  (typeof BUCKET_TRAVEL_BUDGET_LEVELS)[number];

export const BUCKET_TRAVEL_STYLES = [
  "solo",
  "couple",
  "family",
  "friends",
  "workation",
] as const;
export type BucketTravelStyle = (typeof BUCKET_TRAVEL_STYLES)[number];

export const BUCKET_FLIGHT_PROVIDERS = [
  "mock",
  "skyscanner",
  "kiwi",
  "duffel",
  "amadeus",
  "custom",
] as const;
export type BucketFlightProvider = (typeof BUCKET_FLIGHT_PROVIDERS)[number];

export const BUCKET_INTEGRATION_KINDS = [
  "project",
  "task",
  "budget",
  "savings_goal",
  "calendar_event",
  "note",
  "knowledge_entry",
  "journal_entry",
  "resource_link",
  "map_marker",
] as const;
export type BucketIntegrationKind =
  (typeof BUCKET_INTEGRATION_KINDS)[number];

export const BUCKET_AI_USAGE_KINDS = [
  "smart_tag",
  "inspire",
  "destination_brief",
  "trip_plan",
  "reframe",
  "reflection_summary",
] as const;
export type BucketAiUsageKind = (typeof BUCKET_AI_USAGE_KINDS)[number];

export const BUCKET_REFLECTION_MOODS = [
  "elated",
  "proud",
  "grateful",
  "peaceful",
  "bittersweet",
  "surprised",
  "changed",
] as const;
export type BucketReflectionMood = (typeof BUCKET_REFLECTION_MOODS)[number];

// ─── Rich sub-types (JSONB fields) ────────────────────────────────────────────

export type BucketInspirationLink = {
  url: string;
  label?: string | null;
  kind?: "article" | "video" | "photo" | "site" | "other";
};

export type BucketPriceAlertRule = {
  when: "below" | "above";
  amount: number;
  currency: string;
};

export type BucketDestinationBrief = {
  overview: string;
  best_time: string;
  food: string[];
  stay: string[];
  transport: string[];
  must_do: string[];
  weather_note?: string | null;
  fetched_at: string;
  /** When the model could not cite good sources. */
  unverified?: boolean;
};

export type BucketTripPlanDay = {
  day: number;
  theme: string;
  morning: string;
  afternoon: string;
  evening: string;
  /** Optional anchor location (city or landmark). */
  anchor?: string | null;
};

export type BucketTripPlan = {
  days: BucketTripPlanDay[];
  travel_style: BucketTravelStyle | null;
  trip_length_days: number;
  fetched_at: string;
  unverified?: boolean;
};

export type BucketReframeSuggestion = {
  title: string;
  description: string;
  estimated_cost: number | null;
  cost_currency: string | null;
  time_horizon: BucketTimeHorizon | null;
};

export type BucketReframeResponse = {
  smaller_versions: BucketReframeSuggestion[];
  fetched_at: string;
};

export type BucketReflectionPhoto = {
  url: string;
  caption?: string | null;
  taken_at?: string | null;
};

/** Resolved cover used by dream cards and detail hero (same source everywhere). */
export type BucketDreamImageSourceType = "static" | "api" | "generated";

export type BucketDreamImage = {
  url: string;
  alt: string;
  source?: string;
  sourceType?: BucketDreamImageSourceType;
};

// ─── DB row types ─────────────────────────────────────────────────────────────

export type BucketItem = {
  id: string;
  user_id: string;

  // Core
  title: string;
  description: string | null;
  why_this_matters: string | null;

  // Classification
  type: BucketType;
  status: BucketStatus;
  priority: BucketPriority;
  difficulty: BucketDifficulty;
  time_horizon: BucketTimeHorizon | null;

  // Budgeting
  estimated_cost: number | null;
  cost_currency: string;
  cost_band: BucketCostBand | null;

  // Timing
  target_date: string | null;
  target_month: string | null;

  // Presentation
  category_tags: string[];
  /** User-provided or API-persisted cover. UI resolves full {@link BucketDreamImage} via `resolveBucketDreamImage`. */
  cover_image_url: string | null;
  /** True when the current cover is an AI-generated visual (drives the "AI-generated visual" badge). */
  cover_image_is_ai: boolean;
  quote_inspiration: string | null;
  inspiration_links: BucketInspirationLink[];
  notes: string | null;

  // Travel
  destination_name: string | null;
  destination_country: string | null;
  destination_city: string | null;
  destination_lat: number | null;
  destination_lng: number | null;
  origin_location: string | null;
  origin_airport: string | null;
  destination_airport: string | null;
  best_season: string | null;
  travel_budget_level: BucketTravelBudgetLevel | null;
  travel_style: BucketTravelStyle | null;
  trip_length_days: number | null;

  // Flight watch
  exploratory_price_min: number | null;
  exploratory_price_max: number | null;
  latest_live_price: number | null;
  latest_live_price_currency: string | null;
  last_price_check_time: string | null;
  flight_watch_enabled: boolean;
  price_alert_rule: BucketPriceAlertRule | null;

  // AI
  ai_destination_brief: BucketDestinationBrief | null;
  ai_trip_plan: BucketTripPlan | null;
  ai_reframe_suggestions: BucketReframeResponse | null;

  // Soft FKs
  linked_project_id: string | null;
  linked_budget_id: string | null;
  linked_savings_goal_id: string | null;
  linked_calendar_event_ids: string[];
  linked_task_ids: string[];
  linked_knowledge_resource_ids: string[];
  linked_memory_entry_id: string | null;

  // Lifecycle
  is_seed: boolean;
  is_featured: boolean;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BucketItemIntegration = {
  id: string;
  user_id: string;
  bucket_item_id: string;
  kind: BucketIntegrationKind;
  external_id: string | null;
  external_label: string | null;
  external_url: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type BucketReflection = {
  id: string;
  user_id: string;
  bucket_item_id: string;
  reflection_text: string | null;
  ai_summary: string | null;
  photo_gallery: BucketReflectionPhoto[];
  mood: BucketReflectionMood | null;
  changed_me: string | null;
  ai_memory: BucketDreamMemory | null;
  reflected_on: string;
  created_at: string;
  updated_at: string;
};

/**
 * Structured AI memory for a completed dream. An interpretation of the user's
 * OWN reflection + the dream's recorded details — never invented events. The
 * UI frames it with "this may suggest…", never "this proves".
 */
export type BucketDreamMemory = {
  summary: string;
  whatHappened: string;
  whyItMattered: string;
  whatChanged: string;
  whatLearned: string;
  lifeChapter: string;
  whatUnlocked: string;
};

export type BucketFlightQuote = {
  id: string;
  user_id: string;
  bucket_item_id: string;
  provider: BucketFlightProvider;
  mode: "exploratory" | "live";
  origin_airport: string;
  destination_airport: string;
  depart_date: string | null;
  return_date: string | null;
  currency: string;
  cheapest_price: number | null;
  fastest_price: number | null;
  direct_price: number | null;
  raw_payload: Record<string, unknown> | null;
  cheapest_deeplink: string | null;
  fetched_at: string;
};

export type BucketSettings = {
  user_id: string;
  default_origin_location: string | null;
  default_origin_airport: string | null;
  default_currency: string;
  preferred_flight_provider: BucketFlightProvider;
  seeds_cleared: boolean;
  show_closed_dreams: boolean;
  travel_map_center_lat: number;
  travel_map_center_lng: number;
  travel_map_zoom: number;
  created_at: string;
  updated_at: string;
};

// ─── Write shapes ─────────────────────────────────────────────────────────────

export type CreateBucketItemInput = {
  title: string;
  description?: string | null;
  why_this_matters?: string | null;
  type: BucketType;
  status?: BucketStatus;
  priority?: BucketPriority;
  difficulty?: BucketDifficulty;
  time_horizon?: BucketTimeHorizon | null;
  estimated_cost?: number | null;
  cost_currency?: string;
  cost_band?: BucketCostBand | null;
  target_date?: string | null;
  target_month?: string | null;
  category_tags?: string[];
  cover_image_url?: string | null;
  quote_inspiration?: string | null;
  inspiration_links?: BucketInspirationLink[];
  notes?: string | null;

  // Travel optional
  destination_name?: string | null;
  destination_country?: string | null;
  destination_city?: string | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  origin_location?: string | null;
  origin_airport?: string | null;
  destination_airport?: string | null;
  best_season?: string | null;
  travel_budget_level?: BucketTravelBudgetLevel | null;
  travel_style?: BucketTravelStyle | null;
  trip_length_days?: number | null;
  exploratory_price_min?: number | null;
  exploratory_price_max?: number | null;
  flight_watch_enabled?: boolean;
  price_alert_rule?: BucketPriceAlertRule | null;

  // Soft FKs
  linked_project_id?: string | null;
  linked_budget_id?: string | null;
  linked_savings_goal_id?: string | null;
  linked_memory_entry_id?: string | null;
};

export type UpdateBucketItemInput = Partial<CreateBucketItemInput> & {
  archived_at?: string | null;
  completed_at?: string | null;
  is_featured?: boolean;
  cover_image_is_ai?: boolean;
  latest_live_price?: number | null;
  latest_live_price_currency?: string | null;
  last_price_check_time?: string | null;
  ai_destination_brief?: BucketDestinationBrief | null;
  ai_trip_plan?: BucketTripPlan | null;
  ai_reframe_suggestions?: BucketReframeResponse | null;
  linked_task_ids?: string[];
  linked_calendar_event_ids?: string[];
  linked_knowledge_resource_ids?: string[];
};

// ─── Filters / runtime ───────────────────────────────────────────────────────

export type BucketFilters = {
  search: string;
  types: BucketType[];
  statuses: BucketStatus[];
  tags: string[];
  featuredOnly: boolean;
  /** Include completed + archived rows in the main list. */
  includeClosed: boolean;
};

export const DEFAULT_BUCKET_FILTERS: BucketFilters = {
  search: "",
  types: [],
  statuses: [],
  tags: [],
  featuredOnly: false,
  includeClosed: false,
};

export type BucketSortKey =
  | "created_desc"
  | "target_date_asc"
  | "priority"
  | "progress";

// ─── Derived aggregates ───────────────────────────────────────────────────────

export type BucketStats = {
  total: number;
  completed: number;
  active: number;
  funded: number;
  dreaming: number;
};

export type BucketHighlights = {
  closestToReality: BucketItem | null;
  pushThisWeek: BucketItem | null;
  latestCompletion: BucketItem | null;
  travelDeal: BucketItem | null;
};

// ─── AI dream capture (autofill) ───────────────────────────────────────────────

/** Per-field confidence the AI attaches to an autofilled dream draft. */
export const BUCKET_FIELD_CONFIDENCE_LEVELS = [
  "high",
  "medium",
  "low",
  "missing",
] as const;
export type BucketFieldConfidence =
  (typeof BUCKET_FIELD_CONFIDENCE_LEVELS)[number];

/** Lightweight existing-dream context passed to the autofill route for de-duplication hints. */
export type BucketItemSummary = {
  id: string;
  title: string;
  type: BucketType;
  status: BucketStatus;
};

export type BucketDreamAutofillTravel = {
  destination_name?: string | null;
  destination_country?: string | null;
  destination_city?: string | null;
  destination_airport?: string | null;
  origin_airport?: string | null;
  best_season?: string | null;
  travel_budget_level?: BucketTravelBudgetLevel | null;
  travel_style?: BucketTravelStyle | null;
  trip_length_days?: number | null;
  flight_watch_enabled?: boolean;
};

/**
 * Structured dream draft produced by `POST /api/bucket-list/autofill`.
 *
 * This is an *editable suggestion* — never persisted automatically. The user
 * reviews and confirms before a {@link CreateBucketItemInput} is created.
 */
export type BucketDreamAutofillResult = {
  title: string;
  description?: string | null;
  why_this_matters?: string | null;

  type: BucketType;
  status: BucketStatus;
  priority: BucketPriority;
  difficulty: BucketDifficulty;
  time_horizon?: BucketTimeHorizon | null;

  estimated_cost?: number | null;
  cost_currency?: string;
  cost_band?: BucketCostBand | null;

  target_date?: string | null;
  target_month?: string | null;

  category_tags: string[];
  quote_inspiration?: string | null;
  notes?: string | null;

  travel?: BucketDreamAutofillTravel | null;

  /** 0–1 overall confidence in the extraction. */
  confidence: number;
  field_confidence: Record<string, BucketFieldConfidence>;
  missing_fields: string[];
  /** Up to a few focused questions / next steps the user might want. */
  suggested_next_actions: string[];
  warnings: string[];
};

// ─── Dream images & inspiration (Phase 2) ───────────────────────────────────────

export const BUCKET_DREAM_IMAGE_TYPES = [
  "cover",
  "inspiration",
  "generated_visual",
  "screenshot",
  "travel_photo",
  "memory_photo",
  "article_image",
  "other",
] as const;
export type BucketDreamImageType = (typeof BUCKET_DREAM_IMAGE_TYPES)[number];

export const BUCKET_DREAM_IMAGE_SOURCE_TYPES = [
  "uploaded",
  "generated",
  "static_catalog",
  "external_url",
  "api",
] as const;
export type BucketDreamImageSource =
  (typeof BUCKET_DREAM_IMAGE_SOURCE_TYPES)[number];

/** A row in the `bucket_dream_images` gallery (distinct from the resolved {@link BucketDreamImage}). */
export type BucketDreamImageRecord = {
  id: string;
  user_id: string;
  bucket_item_id: string;
  image_url: string;
  image_type: BucketDreamImageType;
  caption: string | null;
  ai_caption: string | null;
  source_type: BucketDreamImageSource;
  source_url: string | null;
  prompt: string | null;
  model_used: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

/** Styles offered by the AI cover generator. */
export const BUCKET_COVER_IMAGE_STYLES = [
  "realistic_travel",
  "cinematic",
  "dreamy",
  "minimal_editorial",
  "luxury_magazine",
] as const;
export type BucketCoverImageStyle = (typeof BUCKET_COVER_IMAGE_STYLES)[number];

/** Hints the inspiration analyzer extracts from an image. */
export type BucketInspirationHints = {
  destination?: string | null;
  activity?: string | null;
  mood?: string | null;
  season?: string | null;
  style?: string | null;
  tags?: string[];
};

/**
 * Result of `POST /api/bucket-list/analyze-inspiration`. Suggestions only —
 * the user reviews before any bucket update is applied.
 */
export type BucketInspirationAnalysis = {
  suggestedCaption: string;
  extractedDreamHints: BucketInspirationHints;
  suggestedBucketUpdates?: Partial<CreateBucketItemInput> | null;
  confidence: number;
  warnings: string[];
};

// ─── Dream Intelligence Hub (Phase 3) ───────────────────────────────────────────

export const BUCKET_DREAM_REPORT_TYPES = [
  "dream_intelligence",
  "readiness",
  "blockers",
  "smallest_version",
  "identity_meaning",
] as const;
export type BucketDreamReportType = (typeof BUCKET_DREAM_REPORT_TYPES)[number];

export const BUCKET_DREAM_READINESS_STATUSES = [
  "dreaming",
  "exploring",
  "ready_to_activate",
  "blocked",
  "scheduled",
  "completed",
] as const;
export type BucketDreamReadinessStatus =
  (typeof BUCKET_DREAM_READINESS_STATUSES)[number];

export const BUCKET_DREAM_BLOCKER_TYPES = [
  "money",
  "time",
  "clarity",
  "courage",
  "logistics",
  "relationship",
  "health",
  "other",
] as const;
export type BucketDreamBlockerType =
  (typeof BUCKET_DREAM_BLOCKER_TYPES)[number];

/** Action a suggestion/next-step maps to. Always routed through a confirm-first flow — never auto-executed. */
export const BUCKET_DREAM_ACTION_TYPES = [
  "create_task",
  "create_project",
  "create_savings_goal",
  "schedule",
  "research",
  "reflect",
  "generate_brief",
  "generate_trip_plan",
  "generate_cover",
  "upload_image",
  "reframe",
] as const;
export type BucketDreamActionType = (typeof BUCKET_DREAM_ACTION_TYPES)[number];

export type BucketDreamReadiness = {
  score: number;
  status: BucketDreamReadinessStatus;
  explanation: string;
  missingPieces: string[];
};

export type BucketDreamBlocker = {
  title: string;
  type: BucketDreamBlockerType;
  explanation: string;
  suggestedAction: string;
};

export type BucketDreamSmallestVersion = {
  title: string;
  description: string;
  estimatedCost?: number | null;
  timeRequired?: string | null;
};

export type BucketDreamNextStep = {
  title: string;
  description: string;
  actionType?: BucketDreamActionType | null;
};

export type BucketDreamConnections = {
  projects: string[];
  tasks: string[];
  goals: string[];
  relationships: string[];
  assets: string[];
  notes: string[];
};

export type BucketDreamSuggestedAction = {
  label: string;
  description?: string | null;
  actionType: BucketDreamActionType;
};

/**
 * Cached output of `POST /api/bucket-list/analyze-dream`. Persisted in
 * `bucket_dream_ai_reports`. Suggestions are previews — never auto-executed.
 */
export type BucketDreamIntelligenceReport = {
  bucketItemId: string;

  whyThisMattersDeeply: string;
  identityChapter: string;
  emotionalMeaning: string;
  whyNow?: string | null;

  dreamReadiness: BucketDreamReadiness;
  blockers: BucketDreamBlocker[];
  smallestVersion: BucketDreamSmallestVersion;
  nextBestStep: BucketDreamNextStep;
  connections: BucketDreamConnections;
  suggestedActions: BucketDreamSuggestedAction[];

  generatedAt: string;
  modelUsed?: string | null;
};

/** Row in `bucket_dream_ai_reports`. */
export type BucketDreamAiReportRow = {
  id: string;
  user_id: string;
  bucket_item_id: string;
  report_type: BucketDreamReportType;
  report_json: BucketDreamIntelligenceReport;
  model_used: string | null;
  generated_at: string;
  updated_at: string;
};

// ─── Dream Activation Engine (Phase 4) ──────────────────────────────────────────

export const BUCKET_ACTIVATION_MODES = [
  "gentle",
  "practical",
  "ambitious",
  "minimal",
] as const;
export type BucketActivationMode = (typeof BUCKET_ACTIVATION_MODES)[number];

export type BucketActivationProject = {
  name: string;
  description: string;
  status?: string | null;
};

export type BucketActivationTask = {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: string | null;
};

export type BucketActivationSavingsGoal = {
  name: string;
  targetAmount: number;
  currency: string;
  targetDate?: string | null;
};

export type BucketActivationCalendarItem = {
  title: string;
  date?: string | null;
  notes?: string | null;
};

export type BucketActivationNote = {
  title: string;
  content: string;
};

export type BucketActivationKnowledgeResource = {
  title: string;
  url?: string | null;
  notes?: string | null;
};

/** Structured plan produced by `POST /api/bucket-list/activate-dream`. Suggestions only — nothing is written until the user confirms. */
export type BucketDreamActivationPlan = {
  activationSummary: string;
  suggestedProject?: BucketActivationProject | null;
  suggestedTasks: BucketActivationTask[];
  suggestedSavingsGoal?: BucketActivationSavingsGoal | null;
  suggestedCalendarPlaceholders: BucketActivationCalendarItem[];
  suggestedNotes: BucketActivationNote[];
  suggestedKnowledgeResources: BucketActivationKnowledgeResource[];
  warnings: string[];
};
