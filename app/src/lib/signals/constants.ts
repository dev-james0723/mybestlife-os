/**
 * Signals — static configuration: onboarding option ids, section caps, ranking
 * weights, the curated source-quality registry, and privacy-safe defaults.
 *
 * Option ids are STABLE keys (English-ish slugs); display labels are localized
 * in `@/lib/i18n/signals-ui.ts`. Keeping ids here means preferences persist
 * across language changes.
 */

import type {
  SignalActionKind,
  SignalsGallerySpeed,
  SignalSourceTier,
  SignalsFeedIntensity,
  SignalsPreferences,
} from "./types";

// ── Onboarding Step 1: Purpose (pick up to 3) ──
export const SIGNAL_PURPOSE_IDS = [
  "understand_world",
  "track_ai_tech",
  "career_awareness",
  "finance_markets",
  "arts_culture",
  "law_policy",
  "education",
  "personal_projects",
  "discover_ideas",
  "avoid_overload",
] as const;
export type SignalPurposeId = (typeof SIGNAL_PURPOSE_IDS)[number];
export const MAX_PURPOSES = 3;

// ── Onboarding Step 2: Topics (pick 3–8) ──
export const SIGNAL_TOPIC_IDS = [
  "AI",
  "Technology",
  "Business",
  "Startups",
  "Finance",
  "World affairs",
  "Law",
  "Education",
  "Music",
  "Arts",
  "Design",
  "Culture",
  "Science",
  "Climate",
  "Health",
  "Travel",
  "Local",
] as const;
export type SignalTopicId = (typeof SIGNAL_TOPIC_IDS)[number];
export const MIN_TOPICS = 3;
export const MAX_TOPICS = 8;

// ── Onboarding Step 3: Data-consent toggle keys ──
export const SIGNAL_CONSENT_KEYS = [
  "useBrainContext",
  "useProjects",
  "useCalendar",
  "useTasks",
  "useLocation",
  "useReadingBehavior",
] as const;
export type SignalConsentKey = (typeof SIGNAL_CONSENT_KEYS)[number];

// ============================================================
// Section caps — the anti-feed guardrail (§7). "Light briefing" default.
// ============================================================

export const SECTION_CAPS = {
  top3: 3,
  world: 5,
  local: 5,
  personal: 5,
  markets: 6,
  video: 6,
} as const;

/** Volume setting → multiplier on the non-hero caps (Top 3 is always 3). */
export const INTENSITY_CAP_SCALE: Record<SignalsFeedIntensity, number> = {
  top3: 0, // hero only
  light: 1,
  balanced: 1.4,
  deep: 2,
};

// ============================================================
// Ranking weights — honest heuristics, NOT a trained model (§12).
// total = Σ wᵢ·dimensionᵢ − noisePenalty (+ diversity applied in selection)
// ============================================================

export type RankingWeights = {
  importance: number;
  personalFit: number;
  freshness: number;
  sourceQuality: number;
  locality: number;
};

export const RANKING_WEIGHTS: RankingWeights = {
  importance: 0.3,
  personalFit: 0.3,
  freshness: 0.15,
  sourceQuality: 0.15,
  locality: 0.1,
};

/** Tone presets nudge the weights (still heuristics, surfaced as tunable). */
export const TONE_WEIGHT_OVERRIDES: Partial<
  Record<string, Partial<RankingWeights>>
> = {
  "local-first": { locality: 0.25, importance: 0.25 },
  "global-first": { importance: 0.4, locality: 0.04 },
  analytical: { sourceQuality: 0.25, importance: 0.3 },
  "career-focused": { personalFit: 0.4 },
  "learning-focused": { personalFit: 0.4 },
};

/** Max number of heavy/negative items allowed in a single Top-3 set (§4, §12). */
export const MAX_NEGATIVE_IN_TOP3 = 1;

/**
 * How often a blind-spot pick (high-quality item *outside* the user's topics)
 * is reserved in the Top 3 — the explicit anti-filter-bubble mechanism (§12).
 * Deterministic by day-of-year so the same day always yields the same result.
 */
export const BLIND_SPOT_EVERY_N_DAYS = 3;

// ============================================================
// Curated source-quality registry (static allowlist, §15).
// Extend over time; unknown domains default to "unknown" (not penalized hard).
// ============================================================

export const SOURCE_QUALITY_REGISTRY: Record<string, SignalSourceTier> = {
  "reuters.com": "high",
  "apnews.com": "high",
  "bbc.com": "high",
  "bbc.co.uk": "high",
  "nytimes.com": "high",
  "theguardian.com": "high",
  "ft.com": "high",
  "economist.com": "high",
  "bloomberg.com": "high",
  "wsj.com": "high",
  "nature.com": "high",
  "science.org": "high",
  "arstechnica.com": "high",
  "theverge.com": "medium",
  "techcrunch.com": "medium",
  "wired.com": "medium",
  "news.ycombinator.com": "medium",
  "rthk.hk": "high",
  "scmp.com": "high",
  "hko.gov.hk": "high",
};

export const SOURCE_TIER_WEIGHT: Record<SignalSourceTier, number> = {
  high: 1,
  medium: 0.65,
  unknown: 0.45,
};

// ============================================================
// Privacy-safe default preferences (§6, §18): everything OFF except topics.
// ============================================================

export const DEFAULT_SIGNALS_PREFERENCES: SignalsPreferences = {
  onboardingCompleted: false,
  purposes: [],
  followedTopics: [],
  hiddenTopics: [],
  preferredSources: [],
  mutedSources: [],
  feedIntensity: "light",
  tone: "calm",
  useBrainContext: false,
  useProjects: false,
  useCalendar: false,
  useTasks: false,
  useLocation: false,
  useReadingBehavior: false,
  // Visual / personalization upgrade — calm, opt-in defaults.
  viewMode: "editorial",
  gallery: { enabled: false, speed: "slow" },
  customTopics: [],
  marketsEnabled: false,
  videoEnabled: false,
};

export const SIGNALS_PREFS_STORAGE_KEY = "mylifeos.signals.prefs.v1";

// ============================================================
// Reading behavior + memory + follow-ups (Signal Memory loop, §17/§21).
// All local-only (privacy-safe); Supabase migration targets exist
// (user_signal_actions, signal_followups). Bumping a key only loses local
// history, never live data.
// ============================================================

export const SIGNALS_ACTIONS_STORAGE_KEY = "mylifeos.signals.actions.v1";
export const SIGNALS_FOLLOWUPS_STORAGE_KEY = "mylifeos.signals.followups.v1";

/** Hard cap on the locally retained action log (newest kept). */
export const SIGNALS_ACTIONS_MAX = 600;

/** Half-life (days) for recency-decaying behavior affinity — recent reactions matter more. */
export const BEHAVIOR_AFFINITY_HALF_LIFE_DAYS = 14;

/**
 * Per-action contribution to topic affinity before recency decay. Positive
 * actions lift a topic; negative ones cool it. Mapped so every §17 control has
 * a perceptible, honest effect.
 */
export const BEHAVIOR_TOPIC_WEIGHTS: Partial<Record<SignalActionKind, number>> = {
  save: 0.5,
  to_brain: 0.4,
  more_like_this: 0.4,
  follow_topic: 0.35,
  track: 0.25,
  to_task: 0.25,
  open: 0.05,
  dismiss: -0.3,
  less_like_this: -0.45,
  not_relevant: -0.55,
  already_known: -0.15,
};

/** Max absolute behavior bonus added to a signal's score (kept small vs. importance). */
export const BEHAVIOR_SCORE_WEIGHT = 0.18;

/** Saturating sensitivity: n flags → 1 − e^(−n / SCALE). */
export const BEHAVIOR_SENSITIVITY_SCALE = 2.5;

// ============================================================
// Auto-rotating gallery — interval per speed (ms). OFF/slow by default (§ calm).
// Rotation reads the ALREADY-FETCHED pool; it never triggers a network call.
// ============================================================

export const GALLERY_INTERVAL_MS: Record<SignalsGallerySpeed, number> = {
  slow: 60_000,
  normal: 30_000,
  fast: 15_000,
};

// ============================================================
// Topic visuals — deterministic Liquid-Glass fallback gradients (§ no fake
// thumbnails). When a real image is unavailable, the card renders a labeled
// topic abstract from this map (never a stock/AI photo of the article).
// `from`/`to` are HSL stops; `hue` seeds unknown topics.
// ============================================================

export type TopicVisual = { from: string; to: string };

export const TOPIC_VISUALS: Record<string, TopicVisual> = {
  AI: { from: "hsl(258 70% 60%)", to: "hsl(199 80% 55%)" },
  Technology: { from: "hsl(217 75% 58%)", to: "hsl(190 70% 52%)" },
  Business: { from: "hsl(222 45% 48%)", to: "hsl(215 35% 38%)" },
  Startups: { from: "hsl(280 60% 60%)", to: "hsl(330 65% 60%)" },
  Finance: { from: "hsl(150 55% 42%)", to: "hsl(170 60% 38%)" },
  Markets: { from: "hsl(160 58% 40%)", to: "hsl(190 55% 42%)" },
  "World affairs": { from: "hsl(205 60% 50%)", to: "hsl(230 55% 52%)" },
  Law: { from: "hsl(245 35% 50%)", to: "hsl(220 30% 42%)" },
  Education: { from: "hsl(35 80% 58%)", to: "hsl(15 75% 58%)" },
  Music: { from: "hsl(320 60% 58%)", to: "hsl(265 60% 60%)" },
  Arts: { from: "hsl(340 65% 60%)", to: "hsl(20 75% 60%)" },
  Design: { from: "hsl(195 70% 55%)", to: "hsl(255 60% 62%)" },
  Culture: { from: "hsl(300 50% 56%)", to: "hsl(345 60% 58%)" },
  Science: { from: "hsl(185 65% 45%)", to: "hsl(210 65% 52%)" },
  Climate: { from: "hsl(140 55% 45%)", to: "hsl(95 50% 48%)" },
  Health: { from: "hsl(155 50% 48%)", to: "hsl(180 50% 46%)" },
  Travel: { from: "hsl(30 80% 60%)", to: "hsl(195 70% 55%)" },
  Local: { from: "hsl(160 50% 46%)", to: "hsl(200 55% 50%)" },
};

/** Deterministic accent color for any topic (falls back to a hashed hue). */
export function topicAccentColor(topic: string): string {
  const v = TOPIC_VISUALS[topic];
  if (v) return v.from;
  let hash = 0;
  for (let i = 0; i < topic.length; i += 1) {
    hash = (hash * 31 + topic.charCodeAt(i)) >>> 0;
  }
  return `hsl(${hash % 360} 55% 55%)`;
}

// ============================================================
// Markets (source-grounded news ONLY — never quotes/prices/advice, §15).
// Free Google News RSS market queries. A real price/quote API is a TODO adapter.
// ============================================================

export const MARKET_NEWS_QUERIES = [
  "stock market",
  "earnings report",
  "Federal Reserve interest rates",
  "S&P 500 index",
  "AI chip stocks",
] as const;

export const MARKET_TOPIC = "Markets";

// ============================================================
// Video (YouTube channel RSS — free, no API key). Curated, source-grounded
// channels per topic. The YouTube Data API is a TODO adapter (see providers).
// ============================================================

export type VideoChannelSeed = { channelId: string; name: string; topic: string };

/**
 * Curated public YouTube channels (stable channel ids) used to build video
 * signals via the keyless RSS feed `feeds/videos.xml?channel_id=`. Tech/AI
 * leaning for an AI builder; extend over time. NOT exhaustive and NOT an
 * endorsement — just source-grounded starting feeds.
 */
export const VIDEO_CHANNEL_SEEDS: VideoChannelSeed[] = [
  { channelId: "UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers", topic: "AI" },
  { channelId: "UCsBjURrPoezykLs9EqgamOA", name: "Fireship", topic: "Technology" },
  { channelId: "UCXuqSBlHAE6Xw-yeJA0Tunw", name: "Linus Tech Tips", topic: "Technology" },
  { channelId: "UC4xKdmAXFh4ACyhpiQ_3qBw", name: "TED", topic: "Education" },
];

/**
 * Maps a purpose id → topic ids to pre-select in onboarding Step 2. Keeps the
 * "the OS already knows you" moment truthful: we only pre-check topics that
 * follow logically from an explicit purpose choice.
 */
export const PURPOSE_TOPIC_SEED: Record<SignalPurposeId, SignalTopicId[]> = {
  understand_world: ["World affairs", "Science"],
  track_ai_tech: ["AI", "Technology", "Startups"],
  career_awareness: ["Business", "Technology"],
  finance_markets: ["Finance", "Business"],
  arts_culture: ["Arts", "Culture", "Music"],
  law_policy: ["Law"],
  education: ["Education", "Science"],
  personal_projects: ["Technology", "Design"],
  discover_ideas: ["Design", "Science", "Culture"],
  avoid_overload: [],
};
