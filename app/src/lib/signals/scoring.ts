/**
 * Signals — deterministic ranking (§12).
 *
 * NO LLM is used here. Every dimension is computed from the item, the user's
 * preferences, and the locally-built Life OS context. Given identical inputs,
 * the output is identical (reproducible) — which is exactly what lets the
 * "why this signal?" be literally true.
 *
 * total = w1·Importance + w2·PersonalFit + w3·Freshness
 *       + w4·SourceQuality + w5·Locality − NoisePenalty
 * then diversity / negativity / blind-spot modifiers in the selection pass.
 */

import {
  MAX_NEGATIVE_IN_TOP3,
  BLIND_SPOT_EVERY_N_DAYS,
  RANKING_WEIGHTS,
  SECTION_CAPS,
  SOURCE_TIER_WEIGHT,
  TONE_WEIGHT_OVERRIDES,
} from "./constants";
import type {
  LifeOsContext,
  SignalContentType,
  SignalItem,
  SignalScore,
  SignalsPreferences,
} from "./types";
import { overlapScore } from "./matching";

const CONTENT_TYPE_IMPORTANCE: Record<SignalContentType, number> = {
  breaking: 0.95,
  developing: 0.8,
  global: 0.75,
  analysis: 0.6,
  local: 0.6,
  personal: 0.6,
  opinion: 0.4,
};

const NEGATIVE_KEYWORDS = [
  "death",
  "dead",
  "killed",
  "kill",
  "war",
  "attack",
  "crisis",
  "disaster",
  "shooting",
  "violence",
  "collapse",
  "tragedy",
  "outbreak",
  "fatal",
];

const CLICKBAIT_PATTERNS = [
  /you won'?t believe/i,
  /shocking/i,
  /this is why/i,
  /\bgoes? viral\b/i,
  /\bwild\b/i,
  /\d+\s+(things|reasons|ways)\b/i,
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function searchText(signal: SignalItem): string {
  return `${signal.headline} ${signal.tags.join(" ")} ${signal.topic}`;
}

// ── Individual dimensions ──

function corroborationFactor(count: number | undefined): number {
  const n = count ?? 1;
  if (n <= 1) return 0.3;
  if (n === 2) return 0.6;
  if (n === 3) return 0.8;
  return 1;
}

export function computeImportance(signal: SignalItem): number {
  const tier = SOURCE_TIER_WEIGHT[signal.source.qualityTier ?? "unknown"];
  return clamp01(
    0.45 * CONTENT_TYPE_IMPORTANCE[signal.contentType] +
      0.3 * corroborationFactor(signal.corroborationCount) +
      0.25 * tier,
  );
}

export function computePersonalFit(signal: SignalItem, ctx: LifeOsContext): number {
  return overlapScore(searchText(signal), ctx.interestTerms);
}

/**
 * Deterministic bonus for items matching a custom topic the user flagged
 * `includeInTop3` or `priority:"high"` (§ Custom topics). Small + additive so a
 * followed custom topic can reach the Top 3 without overriding importance.
 */
export function computeCustomBoost(signal: SignalItem, ctx: LifeOsContext): number {
  if (ctx.boostedTerms.length === 0) return 0;
  return 0.12 * overlapScore(searchText(signal), ctx.boostedTerms);
}

/** Exponential time-decay; ~24h half-life, small floor so nothing hits zero. */
export function computeFreshness(signal: SignalItem, now = Date.now()): number {
  const ageMs = now - Date.parse(signal.publishedAt);
  if (Number.isNaN(ageMs)) return 0.3;
  const ageHours = Math.max(0, ageMs / 3_600_000);
  return clamp01(Math.max(0.05, Math.exp(-ageHours / 24)));
}

export function computeSourceQuality(
  signal: SignalItem,
  prefs: SignalsPreferences,
): number {
  let q = SOURCE_TIER_WEIGHT[signal.source.qualityTier ?? "unknown"];
  const domain = signal.source.domain;
  if (domain && prefs.preferredSources.includes(domain)) q = clamp01(q + 0.2);
  if (domain && prefs.mutedSources.includes(domain)) q = 0.05;
  return clamp01(q);
}

export function computeLocality(signal: SignalItem, ctx: LifeOsContext): number {
  if (!ctx.location) return 0;
  const region = signal.region?.toLowerCase() ?? "";
  if (!region) return 0;
  const city = ctx.location.city?.toLowerCase() ?? "";
  const regionName = ctx.location.region?.toLowerCase() ?? "";
  if (city && region.includes(city)) return 1;
  if (regionName && region.includes(regionName)) return 0.8;
  return 0;
}

export function computeNoisePenalty(signal: SignalItem): number {
  let penalty = 0;
  const headline = signal.headline;
  if (CLICKBAIT_PATTERNS.some((re) => re.test(headline))) penalty += 0.15;
  // Excess punctuation / ALL-CAPS shouting.
  if (/[!?]{2,}/.test(headline)) penalty += 0.05;
  const words = headline.split(/\s+/).filter((w) => w.length > 3);
  const capsWords = words.filter((w) => w === w.toUpperCase()).length;
  if (words.length > 0 && capsWords / words.length > 0.5) penalty += 0.08;
  if (signal.contentType === "opinion") penalty += 0.08;
  if (isNegative(signal)) penalty += 0.06;
  return Math.min(0.3, penalty);
}

export function isNegative(signal: SignalItem): boolean {
  const text = `${signal.headline} ${signal.tags.join(" ")}`.toLowerCase();
  return NEGATIVE_KEYWORDS.some((k) => text.includes(k));
}

function resolveWeights(prefs: SignalsPreferences): typeof RANKING_WEIGHTS {
  const override = TONE_WEIGHT_OVERRIDES[prefs.tone];
  if (!override) return RANKING_WEIGHTS;
  return { ...RANKING_WEIGHTS, ...override };
}

// ── Composite ──

export function scoreSignal(
  signal: SignalItem,
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  now = Date.now(),
): SignalScore {
  const weights = resolveWeights(prefs);
  const importance = computeImportance(signal);
  const personalFit = computePersonalFit(signal, ctx);
  const freshness = computeFreshness(signal, now);
  const sourceQuality = computeSourceQuality(signal, prefs);
  const locality = computeLocality(signal, ctx);
  const noisePenalty = computeNoisePenalty(signal);

  const customBoost = computeCustomBoost(signal, ctx);

  const total =
    weights.importance * importance +
    weights.personalFit * personalFit +
    weights.freshness * freshness +
    weights.sourceQuality * sourceQuality +
    weights.locality * locality +
    customBoost -
    noisePenalty;

  return {
    importance,
    personalFit,
    freshness,
    sourceQuality,
    locality,
    noisePenalty,
    diversityBoost: customBoost,
    total: Math.max(0, total),
  };
}

/** Attach scores, drop muted/hidden, and sort by total (desc). */
export function rankSignals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  now = Date.now(),
): SignalItem[] {
  const hidden = new Set(prefs.hiddenTopics.map((t) => t.toLowerCase()));
  const muted = new Set(prefs.mutedSources);
  return signals
    .filter((s) => !hidden.has(s.topic.toLowerCase()))
    .filter((s) => !(s.source.domain && muted.has(s.source.domain)))
    .map((s) => ({ ...s, score: scoreSignal(s, prefs, ctx, now) }))
    .sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0));
}

/** Deterministic per-day flag for whether to reserve a blind-spot slot. */
export function isBlindSpotDay(date = new Date()): boolean {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  return dayOfYear % BLIND_SPOT_EVERY_N_DAYS === 0;
}

/**
 * Rotate items WITHIN score-tie groups by a seed. "Regenerate my Top 3" uses
 * this so each regen surfaces a different near-equal item — without ever
 * breaking the deterministic ranking (ties only). Reproducible per seed.
 */
export function rotateWithinTies(
  items: SignalItem[],
  seed: number,
  epsilon = 0.02,
): SignalItem[] {
  if (seed <= 0 || items.length < 2) return items;
  const out: SignalItem[] = [];
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    const base = items[i].score?.total ?? 0;
    while (j < items.length && Math.abs((items[j].score?.total ?? 0) - base) <= epsilon) {
      j += 1;
    }
    const group = items.slice(i, j);
    if (group.length > 1) {
      const shift = ((seed % group.length) + group.length) % group.length;
      out.push(...group.slice(shift), ...group.slice(0, shift));
    } else {
      out.push(group[0]);
    }
    i = j;
  }
  return out;
}

/**
 * Select the Daily Top 3 with diversity guardrails:
 *  - no two cards from the same topic
 *  - no two cards from the same source domain
 *  - at most MAX_NEGATIVE_IN_TOP3 heavy/negative items
 *  - on blind-spot days, reserve the last slot for a high-quality item OUTSIDE
 *    the user's followed topics (the anti-filter-bubble mechanism)
 *
 * Items chosen as the blind-spot pick are tagged `relevanceBasis: "blind_spot"`.
 */
export function selectDailyTop3Signals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  options?: { now?: number; date?: Date; regenSeed?: number },
): SignalItem[] {
  const rankedRaw = rankSignals(signals, prefs, ctx, options?.now);
  // "Regenerate my Top 3" rotates within score ties for visible-but-honest change.
  const ranked = rotateWithinTies(rankedRaw, options?.regenSeed ?? 0);
  if (ranked.length === 0) return [];

  const picked: SignalItem[] = [];
  const usedTopics = new Set<string>();
  const usedDomains = new Set<string>();
  let negativeCount = 0;

  const tryPush = (item: SignalItem): boolean => {
    const topic = item.topic.toLowerCase();
    const domain = item.source.domain ?? item.source.name;
    if (usedTopics.has(topic)) return false;
    if (usedDomains.has(domain)) return false;
    const neg = isNegative(item);
    if (neg && negativeCount >= MAX_NEGATIVE_IN_TOP3) return false;
    picked.push(item);
    usedTopics.add(topic);
    usedDomains.add(domain);
    if (neg) negativeCount += 1;
    return true;
  };

  const followed = new Set(prefs.followedTopics.map((t) => t.toLowerCase()));
  const reserveBlindSpot =
    isBlindSpotDay(options?.date) && followed.size > 0 && SECTION_CAPS.top3 >= 3;
  const targetMainCount = reserveBlindSpot ? SECTION_CAPS.top3 - 1 : SECTION_CAPS.top3;

  for (const item of ranked) {
    if (picked.length >= targetMainCount) break;
    tryPush(item);
  }

  if (reserveBlindSpot && picked.length < SECTION_CAPS.top3) {
    const blindSpot = ranked.find(
      (item) =>
        !picked.includes(item) &&
        !followed.has(item.topic.toLowerCase()) &&
        !usedTopics.has(item.topic.toLowerCase()) &&
        !usedDomains.has(item.source.domain ?? item.source.name) &&
        (item.score?.sourceQuality ?? 0) >= 0.6,
    );
    if (blindSpot) {
      picked.push({ ...blindSpot, relevanceBasis: "blind_spot" });
    }
  }

  // Backfill if diversity rules left us short of 3.
  if (picked.length < SECTION_CAPS.top3) {
    for (const item of ranked) {
      if (picked.length >= SECTION_CAPS.top3) break;
      if (!picked.some((p) => p.id === item.id)) picked.push(item);
    }
  }

  return picked.slice(0, SECTION_CAPS.top3);
}

function intensityCap(base: number, prefs: SignalsPreferences): number {
  const scale = {
    top3: 0,
    light: 1,
    balanced: 1.4,
    deep: 2,
  }[prefs.feedIntensity];
  return Math.max(0, Math.round(base * scale));
}

/** World Signals — high-importance global stories, capped, source-diverse. */
export function selectWorldSignals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  exclude: Set<string> = new Set(),
  now = Date.now(),
): SignalItem[] {
  const cap = intensityCap(SECTION_CAPS.world, prefs);
  const ranked = rankSignals(signals, prefs, ctx, now).filter(
    (s) => !exclude.has(s.id) && !s.region && isArticleLike(s),
  );
  return capWithSourceSpread(ranked, cap);
}

/** Local Signals — items scoped to the user's city/region. */
export function selectLocalSignals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  exclude: Set<string> = new Set(),
  now = Date.now(),
): SignalItem[] {
  const cap = intensityCap(SECTION_CAPS.local, prefs);
  const ranked = rankSignals(signals, prefs, ctx, now).filter(
    (s) => !exclude.has(s.id) && (!!s.region || s.contentType === "local") && isArticleLike(s),
  );
  return capWithSourceSpread(ranked, cap);
}

/** Personal Signals — only items with a real (non-zero) personal-fit tie. */
export function selectPersonalSignals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  exclude: Set<string> = new Set(),
  now = Date.now(),
): SignalItem[] {
  const cap = intensityCap(SECTION_CAPS.personal, prefs);
  if (ctx.interestTerms.length === 0) return [];
  const ranked = rankSignals(signals, prefs, ctx, now).filter(
    (s) => !exclude.has(s.id) && (s.score?.personalFit ?? 0) > 0 && isArticleLike(s),
  );
  return capWithSourceSpread(ranked, cap);
}

/** Article-like = not a dedicated-section media type (video/market). */
function isArticleLike(signal: SignalItem): boolean {
  return signal.mediaType !== "video" && signal.mediaType !== "market";
}

/** Markets — source-grounded market NEWS items (opt-in section). */
export function selectMarketsSignals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  exclude: Set<string> = new Set(),
  now = Date.now(),
): SignalItem[] {
  const cap = intensityCap(SECTION_CAPS.markets, prefs);
  const ranked = rankSignals(signals, prefs, ctx, now).filter(
    (s) =>
      !exclude.has(s.id) &&
      (s.mediaType === "market" || s.topic.toLowerCase() === "markets"),
  );
  return capWithSourceSpread(ranked, Math.max(cap, 4));
}

/** Video — YouTube/video signals (opt-in section). */
export function selectVideoSignals(
  signals: SignalItem[],
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  exclude: Set<string> = new Set(),
  now = Date.now(),
): SignalItem[] {
  const cap = intensityCap(SECTION_CAPS.video, prefs);
  const ranked = rankSignals(signals, prefs, ctx, now).filter(
    (s) => !exclude.has(s.id) && s.mediaType === "video",
  );
  return capWithSourceSpread(ranked, Math.max(cap, 4));
}

/** Limit to `cap` while avoiding any single source dominating the section. */
function capWithSourceSpread(items: SignalItem[], cap: number): SignalItem[] {
  if (cap <= 0) return [];
  const out: SignalItem[] = [];
  const domainCount = new Map<string, number>();
  const MAX_PER_DOMAIN = 2;
  for (const item of items) {
    if (out.length >= cap) break;
    const domain = item.source.domain ?? item.source.name;
    const count = domainCount.get(domain) ?? 0;
    if (count >= MAX_PER_DOMAIN) continue;
    out.push(item);
    domainCount.set(domain, count + 1);
  }
  return out;
}
