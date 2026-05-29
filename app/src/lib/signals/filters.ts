/**
 * Signals — filter system (pure).
 *
 * Turns a `SignalsFilterState` (top pill bar + advanced drawer) into a filtered
 * + ordered list over the already-ranked pool. NO network, NO LLM — filtering
 * and ordering are deterministic so the same filters always yield the same view.
 *
 * Ordering by the relevance facet is a STABLE re-sort of the pre-ranked pool, so
 * the deterministic ranking (§12) still decides ties.
 */

import type {
  CustomSignalTopic,
  SignalItem,
  SignalMediaType,
  SignalRegionFacet,
  SignalRelevanceFacet,
  SignalSourceFacet,
  SignalsFilterState,
  SignalsPreferences,
  SignalTimeFacet,
  SignalTypeFacet,
} from "./types";

export const DEFAULT_FILTER_STATE: SignalsFilterState = {
  type: "all",
  topics: [],
  mediaTypes: [],
  region: "any",
  source: "any",
  excludeMuted: true,
  time: "any",
  relevance: "relevant",
};

/** Pill-bar order (UI maps ids → localized labels). */
export const TYPE_FACET_ORDER: SignalTypeFacet[] = [
  "all",
  "world",
  "local",
  "personal",
  "markets",
  "tech",
  "video",
  "saved",
  "hidden",
];

export const MEDIA_TYPE_ORDER: SignalMediaType[] = [
  "article",
  "video",
  "market",
  "alert",
];

export const REGION_FACET_ORDER: SignalRegionFacet[] = [
  "any",
  "global",
  "local",
  "selected",
  "HK",
  "US",
  "JP",
  "EU",
];

export const SOURCE_FACET_ORDER: SignalSourceFacet[] = [
  "any",
  "preferred",
  "official",
  "mainstream",
  "tech",
  "finance",
  "youtube",
];

export const TIME_FACET_ORDER: SignalTimeFacet[] = [
  "any",
  "today",
  "24h",
  "week",
  "developing",
];

export const RELEVANCE_FACET_ORDER: SignalRelevanceFacet[] = [
  "relevant",
  "important",
  "local",
  "recent",
  "saved",
  "blind_spot",
];

const TECH_TOPICS = new Set(["ai", "technology", "startups", "design", "science"]);
const TECH_DOMAINS = new Set([
  "techcrunch.com",
  "theverge.com",
  "arstechnica.com",
  "wired.com",
  "news.ycombinator.com",
]);
const FINANCE_DOMAINS = new Set([
  "bloomberg.com",
  "ft.com",
  "wsj.com",
  "marketwatch.com",
  "cnbc.com",
  "economist.com",
]);
const MAINSTREAM_DOMAINS = new Set([
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "nytimes.com",
  "theguardian.com",
  "scmp.com",
  "rthk.hk",
]);

const REGION_TOKENS: Record<"HK" | "US" | "JP" | "EU", string[]> = {
  HK: ["hong kong", "hongkong", "hk", "kowloon", "香港"],
  US: ["united states", "u.s.", "usa", "america", "washington", "new york", "california"],
  JP: ["japan", "tokyo", "osaka", "日本"],
  EU: ["europe", "european union", "brussels", "germany", "france", "spain", "italy"],
};

const PERSONAL_BASES = new Set([
  "topic_match",
  "brain_similarity",
  "project_match",
  "calendar_proximity",
  "task_match",
  "behavior",
]);

export function mediaTypeOf(item: SignalItem): SignalMediaType {
  return item.mediaType ?? "article";
}

function isPersonalSignal(item: SignalItem): boolean {
  if ((item.score?.personalFit ?? 0) > 0) return true;
  return PERSONAL_BASES.has(item.relevanceBasis);
}

function isWorldSignal(item: SignalItem): boolean {
  const mt = mediaTypeOf(item);
  return !item.region && mt !== "video" && mt !== "market";
}

function isTechSignal(item: SignalItem): boolean {
  if (TECH_TOPICS.has(item.topic.toLowerCase())) return true;
  if (item.source.domain && TECH_DOMAINS.has(item.source.domain)) return true;
  return item.tags.some((t) => TECH_TOPICS.has(t.toLowerCase()));
}

function isYouTube(item: SignalItem): boolean {
  if (item.videoProvider === "youtube") return true;
  if (mediaTypeOf(item) === "video") return true;
  const d = item.source.domain ?? "";
  return d.includes("youtube.com") || d.includes("youtu.be");
}

function isOfficialDomain(domain: string | undefined): boolean {
  if (!domain) return false;
  return /\.gov(\.|$)/.test(domain) || domain.endsWith(".gov.hk") || domain === "hko.gov.hk";
}

function matchesType(
  item: SignalItem,
  type: SignalTypeFacet,
  opts: { savedIds: Set<string>; dismissedIds: Set<string> },
): boolean {
  switch (type) {
    case "all":
      return true;
    case "world":
      return isWorldSignal(item);
    case "local":
      return !!item.region || item.contentType === "local";
    case "personal":
      return isPersonalSignal(item);
    case "markets":
      return mediaTypeOf(item) === "market" || item.topic.toLowerCase() === "markets";
    case "tech":
      return isTechSignal(item);
    case "video":
      return mediaTypeOf(item) === "video";
    case "saved":
      return opts.savedIds.has(item.id);
    case "hidden":
      return opts.dismissedIds.has(item.id);
    default:
      return true;
  }
}

function matchesTopics(item: SignalItem, topics: string[]): boolean {
  if (topics.length === 0) return true;
  const want = new Set(topics.map((t) => t.toLowerCase()));
  if (want.has(item.topic.toLowerCase())) return true;
  return item.tags.some((t) => want.has(t.toLowerCase()));
}

function matchesRegion(
  item: SignalItem,
  region: SignalRegionFacet,
  selectedCity: string | undefined,
): boolean {
  if (region === "any") return true;
  if (region === "global") return !item.region;
  if (region === "local" || region === "selected") {
    if (!item.region) return false;
    if (!selectedCity) return !!item.region;
    return item.region.toLowerCase().includes(selectedCity.toLowerCase());
  }
  const tokens = REGION_TOKENS[region];
  const haystack = `${item.region ?? ""} ${item.headline} ${item.tags.join(" ")}`.toLowerCase();
  return tokens.some((tok) => haystack.includes(tok));
}

function matchesSource(
  item: SignalItem,
  source: SignalSourceFacet,
  prefs: SignalsPreferences,
): boolean {
  if (source === "any") return true;
  const domain = item.source.domain;
  switch (source) {
    case "preferred":
      return !!domain && prefs.preferredSources.includes(domain);
    case "official":
      return isOfficialDomain(domain);
    case "mainstream":
      return item.source.qualityTier === "high" || (!!domain && MAINSTREAM_DOMAINS.has(domain));
    case "tech":
      return isTechSignal(item) || (!!domain && TECH_DOMAINS.has(domain));
    case "finance":
      return (
        mediaTypeOf(item) === "market" ||
        item.topic.toLowerCase() === "markets" ||
        (!!domain && FINANCE_DOMAINS.has(domain))
      );
    case "youtube":
      return isYouTube(item);
    default:
      return true;
  }
}

function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function matchesTime(item: SignalItem, time: SignalTimeFacet, now: number): boolean {
  if (time === "any") return true;
  if (time === "developing") {
    return item.contentType === "developing" || item.contentType === "breaking";
  }
  const ts = Date.parse(item.publishedAt);
  if (Number.isNaN(ts)) return true; // never hide an item for an unparseable date
  const ageMs = now - ts;
  switch (time) {
    case "today":
      return ts >= startOfDay(now);
    case "24h":
      return ageMs <= 24 * 3_600_000;
    case "week":
      return ageMs <= 7 * 24 * 3_600_000;
    default:
      return true;
  }
}

function compareForRelevance(
  a: SignalItem,
  b: SignalItem,
  facet: SignalRelevanceFacet,
  savedIds: Set<string>,
): number {
  const totalA = a.score?.total ?? 0;
  const totalB = b.score?.total ?? 0;
  switch (facet) {
    case "important": {
      const d = (b.score?.importance ?? 0) - (a.score?.importance ?? 0);
      return d !== 0 ? d : totalB - totalA;
    }
    case "local": {
      const d = (b.score?.locality ?? 0) - (a.score?.locality ?? 0);
      return d !== 0 ? d : totalB - totalA;
    }
    case "recent":
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    case "saved": {
      const sa = savedIds.has(a.id) ? 1 : 0;
      const sb = savedIds.has(b.id) ? 1 : 0;
      return sa !== sb ? sb - sa : totalB - totalA;
    }
    case "blind_spot": {
      const ba = a.relevanceBasis === "blind_spot" ? 1 : 0;
      const bb = b.relevanceBasis === "blind_spot" ? 1 : 0;
      return ba !== bb ? bb - ba : totalB - totalA;
    }
    case "relevant":
    default:
      return totalB - totalA;
  }
}

export type ApplyFilterOptions = {
  prefs: SignalsPreferences;
  savedIds?: Set<string>;
  dismissedIds?: Set<string>;
  selectedCity?: string;
  now?: number;
};

/** Apply the full filter state to the pool, then order by the relevance facet. */
export function applySignalFilters(
  items: SignalItem[],
  filter: SignalsFilterState,
  opts: ApplyFilterOptions,
): SignalItem[] {
  const savedIds = opts.savedIds ?? new Set<string>();
  const dismissedIds = opts.dismissedIds ?? new Set<string>();
  const now = opts.now ?? Date.now();
  const mutedDomains = new Set(opts.prefs.mutedSources);

  const filtered = items.filter((item) => {
    // The "hidden" lens is the ONE place dismissed items are shown (to restore).
    if (filter.type !== "hidden" && dismissedIds.has(item.id)) return false;
    if (filter.excludeMuted && item.source.domain && mutedDomains.has(item.source.domain)) {
      return false;
    }
    if (!matchesType(item, filter.type, { savedIds, dismissedIds })) return false;
    if (!matchesTopics(item, filter.topics)) return false;
    if (filter.mediaTypes.length > 0 && !filter.mediaTypes.includes(mediaTypeOf(item))) {
      return false;
    }
    if (!matchesRegion(item, filter.region, opts.selectedCity)) return false;
    if (!matchesSource(item, filter.source, opts.prefs)) return false;
    if (!matchesTime(item, filter.time, now)) return false;
    return true;
  });

  return filtered.sort((a, b) => compareForRelevance(a, b, filter.relevance, savedIds));
}

// ── Active-filter chips ──

export type ActiveFilterChip = {
  /** Stable key for React + removal. */
  key: string;
  /** Which facet this chip belongs to (UI localizes by kind + value). */
  kind: "type" | "topic" | "mediaType" | "region" | "source" | "time" | "relevance" | "muted";
  /** The facet value (e.g. "world", "AI", "today"). */
  value: string;
};

export function isDefaultFilter(filter: SignalsFilterState): boolean {
  return (
    filter.type === "all" &&
    filter.topics.length === 0 &&
    filter.mediaTypes.length === 0 &&
    filter.region === "any" &&
    filter.source === "any" &&
    filter.excludeMuted &&
    filter.time === "any" &&
    filter.relevance === "relevant"
  );
}

/** Count of non-default facets (drives the "N" badge on the filter button). */
export function countActiveFilters(filter: SignalsFilterState): number {
  return activeFilterChips(filter).length;
}

/** The active (non-default) facets as removable chip descriptors. */
export function activeFilterChips(filter: SignalsFilterState): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];
  if (filter.type !== "all") chips.push({ key: `type:${filter.type}`, kind: "type", value: filter.type });
  for (const t of filter.topics) chips.push({ key: `topic:${t}`, kind: "topic", value: t });
  for (const m of filter.mediaTypes) chips.push({ key: `media:${m}`, kind: "mediaType", value: m });
  if (filter.region !== "any") {
    chips.push({ key: `region:${filter.region}`, kind: "region", value: filter.region });
  }
  if (filter.source !== "any") {
    chips.push({ key: `source:${filter.source}`, kind: "source", value: filter.source });
  }
  if (filter.time !== "any") chips.push({ key: `time:${filter.time}`, kind: "time", value: filter.time });
  if (filter.relevance !== "relevant") {
    chips.push({ key: `relevance:${filter.relevance}`, kind: "relevance", value: filter.relevance });
  }
  if (!filter.excludeMuted) {
    chips.push({ key: "muted:shown", kind: "muted", value: "shown" });
  }
  return chips;
}

/** Remove one chip (returns a new filter state). */
export function removeFilterChip(
  filter: SignalsFilterState,
  chip: ActiveFilterChip,
): SignalsFilterState {
  switch (chip.kind) {
    case "type":
      return { ...filter, type: "all" };
    case "topic":
      return { ...filter, topics: filter.topics.filter((t) => t !== chip.value) };
    case "mediaType":
      return {
        ...filter,
        mediaTypes: filter.mediaTypes.filter((m) => m !== chip.value),
      };
    case "region":
      return { ...filter, region: "any" };
    case "source":
      return { ...filter, source: "any" };
    case "time":
      return { ...filter, time: "any" };
    case "relevance":
      return { ...filter, relevance: "relevant" };
    case "muted":
      return { ...filter, excludeMuted: true };
    default:
      return filter;
  }
}

/** Custom topics → selectable topic chips for the drawer (non-muted). */
export function customTopicFilterOptions(topics: CustomSignalTopic[]): string[] {
  return topics.filter((t) => !t.muted).map((t) => t.name);
}
