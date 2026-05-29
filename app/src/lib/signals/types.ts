/**
 * Signals — core data model.
 *
 * A single `SignalItem` shape powers every section (Daily Top 3, World, Local,
 * Personal); sections differ only in which fields they emphasize and how the
 * items were selected. The one hard rule: a signal cannot exist without a real
 * `source` + `sourceUrl` + `publishedAt` (see `docs/signals_product_plan.md` §15).
 *
 * Naming follows the house style used across the Weather stack
 * (`@/lib/weather/types.ts`): discriminated unions for status, plain object
 * shapes for data, no classes.
 */

import type { WeatherLocation } from "@/lib/weather/types";

// ============================================================
// Source + content classification
// ============================================================

export type SignalSourceTier = "high" | "medium" | "unknown";

export type SignalSource = {
  /** Stable id when persisted (Supabase row). Optional for in-memory items. */
  id?: string;
  /** Human-facing publisher name, e.g. "Reuters", "Hacker News". */
  name: string;
  /** Canonical homepage / feed origin. Always a real URL. */
  url: string;
  /** Bare domain for favicon + display, e.g. "reuters.com". */
  domain?: string;
  /** Static editorial-quality tier (curated allowlist). */
  qualityTier?: SignalSourceTier;
};

export type SignalContentType =
  | "breaking"
  | "developing"
  | "analysis"
  | "opinion"
  | "local"
  | "global"
  | "personal";

/**
 * What KIND of media a signal is. Drives card chrome (play overlay on video,
 * market tag on markets) and the media-type filter facet. Defaults to "article".
 */
export type SignalMediaType = "article" | "video" | "audio" | "market" | "alert";

/**
 * A signal's lead image. The hard rule (§ "no fake thumbnails"): a thumbnail is
 * EITHER a real image fetched from the source (`source` ≠ "fallback", with a
 * `url`) OR a clearly-labeled deterministic topic visual (`isFallback: true`,
 * no `url` — the UI renders a Liquid-Glass gradient, never a stock/AI photo).
 */
export type SignalThumbnail = {
  /** Real image URL from the source. Absent for topic fallbacks. */
  url?: string;
  alt?: string;
  /** Where the image came from — provenance, never invented. */
  source?: "rss" | "open_graph" | "youtube" | "publisher" | "fallback";
  /** Attribution string when the source provides one. */
  attribution?: string;
  /** Deterministic accent (hsl/hex) used by the fallback gradient + blur tint. */
  dominantColor?: string;
  /** True when this is a topic abstract, NOT a real image of the article. */
  isFallback?: boolean;
};

export type SignalVideoProvider = "youtube" | "publisher" | "other";

/**
 * Why a signal was surfaced. The displayed "why this signal?" copy is generated
 * *from* this enum — never free-written by an LLM (§11 honesty contract).
 */
export type SignalRelevanceBasis =
  | "topic_match"
  | "brain_similarity"
  | "project_match"
  | "calendar_proximity"
  | "task_match"
  | "location_match"
  | "behavior"
  | "global_importance"
  | "blind_spot"
  | "demo";

// ============================================================
// Scoring (deterministic — never produced by an LLM, §12)
// ============================================================

export type SignalScore = {
  /** Source-tier × corroboration × recency. */
  importance: number;
  /** Deterministic keyword/interest overlap with the user's Life OS context. */
  personalFit: number;
  /** Time-decay from `publishedAt`. */
  freshness: number;
  /** Static source tier adjusted by user preference/mute. */
  sourceQuality: number;
  /** City/region match when location consent is on (else 0, no penalty). */
  locality: number;
  /** Clickbait / pure-opinion / excess-negativity down-rank (subtracted). */
  noisePenalty: number;
  /** Applied during final selection to enforce topic spread / blind spots. */
  diversityBoost: number;
  /** Final ranking value used for ordering. */
  total: number;
};

// ============================================================
// The signal itself
// ============================================================

export type SignalItem = {
  id: string;
  headline: string;
  /** Source-grounded summary (source snippet for MVP; AI is an optional layer). */
  summary: string;
  source: SignalSource;
  /** Canonical link to the real article. Required — no signal without a source. */
  sourceUrl: string;
  /** ISO timestamp from the source. */
  publishedAt: string;
  /** ISO timestamp of the last fetch/check. */
  lastCheckedAt?: string;
  /** Primary topic label, e.g. "AI", "World affairs". */
  topic: string;
  /** Optional region/city scope for local signals. */
  region?: string;
  contentType: SignalContentType;
  tags: string[];
  /** General importance, 1 line. Deterministic for MVP. */
  whyItMatters: string;
  /** True personal tie, 1 line. Generated from `relevanceBasis` only. */
  whyRelevantToUser?: string;
  relevanceBasis: SignalRelevanceBasis;
  /** Optional concrete next step, e.g. "Save to Brain". */
  suggestedAction?: string;
  /** v2: ids of Brain nodes this connects to (read-path deferred). */
  relatedBrainNodes?: string[];
  /** v2: ids of related projects. */
  relatedProjects?: string[];
  score?: SignalScore;
  /** True when this is clearly-labeled sample data, not a live fetch. */
  isDemo?: boolean;
  /**
   * Number of corroborating sources reporting the same story (≥2 → "N sources
   * reporting"). 1 (or undefined) means single-source.
   */
  corroborationCount?: number;

  // ── Visual + media upgrade (all optional; existing behavior unaffected) ──
  /**
   * Source-grounded AI overview, generated SEPARATELY from the headline and
   * cached (§16). Never headline-only — falls back to the source snippet or the
   * honest "Overview limited" string. Stored apart from `summary` so the raw
   * source snippet is never overwritten.
   */
  aiOverview?: string;
  /** True only when `aiOverview` came from real fetched source text. */
  aiOverviewGrounded?: boolean;
  mediaType?: SignalMediaType;
  /** Lead image (real OR labeled topic fallback). See {@link SignalThumbnail}. */
  thumbnail?: SignalThumbnail;
  /** For video signals: a real, resolvable watch URL. */
  videoUrl?: string;
  videoProvider?: SignalVideoProvider;
  /** Channel/publisher name for video signals. */
  channelName?: string;
  /** Human duration label if the feed provides it (e.g. "12:04"). */
  duration?: string;
  /** Whether a transcript/description exists to summarize (else "details limited"). */
  transcriptAvailable?: boolean;
  /** Optional market label for market signals (e.g. "Equities", "Macro"). */
  marketTag?: string;
  /** Optional ticker symbol when the source clearly names one (never invented). */
  ticker?: string;
};

/**
 * A YouTube/video signal. Structurally a {@link SignalItem} with `mediaType`
 * pinned to "video" and the video fields required. Never fabricated: `videoUrl`
 * resolves to a real video and the thumbnail is the real YouTube thumbnail.
 */
export type VideoSignal = SignalItem & {
  mediaType: "video";
  videoProvider: SignalVideoProvider;
  videoUrl: string;
  channelName?: string;
  duration?: string;
  transcriptAvailable?: boolean;
};

// ============================================================
// Custom topics (user-defined follows; localStorage MVP → Supabase)
// ============================================================

export type SignalTopicPriority = "low" | "normal" | "high";

export type CustomSignalTopic = {
  id: string;
  name: string;
  /** Keywords that drive matching, source queries, and personal-fit. */
  keywords: string[];
  /** Preferred source domains for this topic (optional). */
  sources?: string[];
  /** Arbitrary RSS/Atom feed URLs to pull from (source-grounded). */
  rssFeeds?: string[];
  priority: SignalTopicPriority;
  /** Eligible for the Daily Top 3 when true. */
  includeInTop3: boolean;
  /** Hard-muted: items matching are filtered out. */
  muted: boolean;
  createdAt: string;
  updatedAt: string;
};

// ============================================================
// Page sections + selection result
// ============================================================

export type SignalSectionKey =
  | "top3"
  | "world"
  | "local"
  | "personal"
  | "markets"
  | "video";

export type SignalSection = {
  key: SignalSectionKey;
  items: SignalItem[];
};

export type SignalsDataSource = "live" | "demo" | "mixed";

export type SignalsPageStatus = "idle" | "loading" | "error" | "ok";

/** What the page hook returns. Always a definite object (mirrors WeatherPageData). */
export type SignalsPageData = {
  status: SignalsPageStatus;
  /** The data provenance — drives the honest "demo data" banner. */
  dataSource: SignalsDataSource;
  top3: SignalItem[];
  world: SignalItem[];
  local: SignalItem[];
  personal: SignalItem[];
  /** Source-grounded market news (opt-in). Never fabricated prices/quotes. */
  markets: SignalItem[];
  /** Video signals (opt-in). YouTube RSS + real thumbnails. */
  video: SignalItem[];
  /**
   * The full ranked, deduped, relevance-annotated pool with section tags — the
   * data behind Grid/Table/Compact/Gallery views and the gallery rotation pool
   * (so rotation never triggers a network call).
   */
  pool: SignalItem[];
  location: WeatherLocation | null;
  /** ISO timestamp of the most recent successful generation. */
  generatedAt: string | null;
  errorMessage?: string;
};

// ============================================================
// Preferences (per-user; localStorage for MVP, Supabase later)
// ============================================================

export type SignalsFeedIntensity = "top3" | "light" | "balanced" | "deep";

export type SignalsTone =
  | "calm"
  | "executive"
  | "analytical"
  | "local-first"
  | "global-first"
  | "career-focused"
  | "learning-focused";

export type SignalsLocationPrecision = "gps" | "city" | "region" | "manual" | "unknown";

// ── View modes + auto-rotating gallery (persisted in prefs) ──

export type SignalsViewMode = "editorial" | "grid" | "table" | "compact" | "gallery";

export type SignalsGallerySpeed = "slow" | "normal" | "fast";

export type SignalsGalleryPrefs = {
  /** OFF by default — auto-rotate is opt-in, never a doom-scroll trap. */
  enabled: boolean;
  /** slow 60s · normal 30s · fast 15s. */
  speed: SignalsGallerySpeed;
};

export type SignalsLocalLocation = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  precision?: SignalsLocationPrecision;
};

export type SignalsPreferences = {
  onboardingCompleted: boolean;
  purposes: string[];
  followedTopics: string[];
  hiddenTopics: string[];
  preferredSources: string[];
  mutedSources: string[];
  feedIntensity: SignalsFeedIntensity;
  tone: SignalsTone;
  // ── Granular Life OS data-consent toggles (default privacy-safe) ──
  useBrainContext: boolean;
  useProjects: boolean;
  useCalendar: boolean;
  useTasks: boolean;
  useLocation: boolean;
  useReadingBehavior: boolean;
  localLocation?: SignalsLocalLocation;
  // ── Visual / personalization upgrade ──
  /** Default page layout. */
  viewMode: SignalsViewMode;
  gallery: SignalsGalleryPrefs;
  /** User-defined topics with keywords/sources/feeds (influence ranking + queries). */
  customTopics: CustomSignalTopic[];
  /** Show the source-grounded Markets section. */
  marketsEnabled: boolean;
  /** Show the Video Signals section. */
  videoEnabled: boolean;
};

// ============================================================
// Life OS personalization context (deterministic, consent-gated)
// ============================================================

/**
 * Built locally from existing Life OS hooks (Tasks/Projects/Notes/Goals/Ideas/
 * Calendar) — only the sources the user has consented to. Used to compute
 * `personalFit` deterministically and to derive a *truthful* relevance basis.
 * No data leaves the OS; nothing here is sent to an LLM for ranking.
 */
export type LifeOsContext = {
  followedTopics: string[];
  projectTerms: string[];
  goalTerms: string[];
  brainTerms: string[];
  taskTerms: string[];
  calendarTerms: string[];
  /** Keywords from the user's custom topics (drive matching + the "why"). */
  customTopicTerms: string[];
  /**
   * Keywords from custom topics flagged `includeInTop3` or `priority: "high"` —
   * these get a deterministic ranking boost so a custom follow can reach Top 3.
   */
  boostedTerms: string[];
  /** Union of all enabled interest terms, lowercased + deduped. */
  interestTerms: string[];
  location: WeatherLocation | null;
};

// ============================================================
// User feedback actions (for v2 Signal Memory)
// ============================================================

export type SignalActionKind =
  | "save"
  | "dismiss"
  | "more_like_this"
  | "less_like_this"
  | "open"
  | "to_brain"
  | "mute_source"
  | "follow_topic";

export type SignalAction = {
  signalId: string;
  kind: SignalActionKind;
  createdAt: string;
};

// ============================================================
// Filter system (top pill bar + advanced drawer)
// ============================================================

/** The primary pill-bar facet — a single-select lens over the whole pool. */
export type SignalTypeFacet =
  | "all"
  | "world"
  | "local"
  | "personal"
  | "markets"
  | "tech"
  | "video"
  | "saved"
  | "hidden";

/** Region scope facet. "selected" = the user's chosen/detected city. */
export type SignalRegionFacet =
  | "any"
  | "global"
  | "local"
  | "selected"
  | "HK"
  | "US"
  | "JP"
  | "EU";

/** Source-group facet. */
export type SignalSourceFacet =
  | "any"
  | "preferred"
  | "official"
  | "mainstream"
  | "tech"
  | "finance"
  | "youtube";

/** Time-window facet. */
export type SignalTimeFacet = "any" | "today" | "24h" | "week" | "developing";

/** Ordering / relevance facet. */
export type SignalRelevanceFacet =
  | "relevant"
  | "important"
  | "local"
  | "recent"
  | "saved"
  | "blind_spot";

export type SignalsFilterState = {
  type: SignalTypeFacet;
  /** Topic names (built-in + custom). Empty = all topics. */
  topics: string[];
  mediaTypes: SignalMediaType[];
  region: SignalRegionFacet;
  source: SignalSourceFacet;
  /** Exclude muted sources (default true). */
  excludeMuted: boolean;
  time: SignalTimeFacet;
  relevance: SignalRelevanceFacet;
};
