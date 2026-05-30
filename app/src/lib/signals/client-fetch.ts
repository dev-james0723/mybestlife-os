/**
 * Signals — client-side candidate fetch + cache.
 *
 * Single source of truth shared by the page hook and the dashboard widget hook
 * so the Top 3 never drifts between them (§9). Hits the `/api/signals/feed`
 * route (which runs the live providers server-side), caches the normalized
 * candidate pool in localStorage keyed by day+topics+city+lang, and falls back
 * to clearly-labeled demo data on any failure or empty result.
 *
 * This is the simplified MVP stand-in for the §14 two-tier pipeline. The cache
 * key includes the date so it regenerates daily; re-opens within the window are
 * instant + identical (reproducible).
 *
 * TODO(v2): replace with reads from `user_daily_signals` produced by a daily
 * Vercel cron, instead of an on-demand fetch.
 */

import { getSignalsDemoData } from "./demo-data";
import { prepareSignalDisplayPool } from "./thumbnails";
import type { SignalItem, SignalsDataSource, SignalsLocalLocation } from "./types";

const CACHE_KEY = "mylifeos.signals.candidates.v4";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h on-demand window (daily regen via date key)
const FETCH_TIMEOUT_MS = 24_000;

export type FetchCandidatesParams = {
  topics: string[];
  location?: SignalsLocalLocation | null;
  lang: string;
  force?: boolean;
  /** Opt-in: include the source-grounded markets section. */
  includeMarkets?: boolean;
  /** Opt-in: include YouTube video signals. */
  includeVideo?: boolean;
  /** Custom-topic RSS/Atom feed URLs to pull from. */
  customRssFeeds?: string[];
  /**
   * Rotates the demo pool when live providers are thin, so "Refresh latest
   * sources" produces a VISIBLY different set instead of a silent no-op
   * (§ refresh). Ignored when live data is available.
   */
  rotateSeed?: number;
};

export type CandidatesResult = {
  items: SignalItem[];
  dataSource: SignalsDataSource;
  generatedAt: string;
};

type CacheEntry = CandidatesResult & { key: string; cachedAt: number };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildKey(params: FetchCandidatesParams): string {
  const topics = [...params.topics].map((t) => t.toLowerCase()).sort().join(",");
  const city = params.location?.city?.toLowerCase() ?? "";
  const feeds = [...(params.customRssFeeds ?? [])].sort().join(",");
  const flags = `${params.includeMarkets ? "m" : ""}${params.includeVideo ? "v" : ""}`;
  return `${todayKey()}|${topics}|${city}|${params.lang}|${flags}|${feeds}`;
}

function readCache(key: string): CandidatesResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (entry.key !== key) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return { items: entry.items, dataSource: entry.dataSource, generatedAt: entry.generatedAt };
  } catch {
    return null;
  }
}

function writeCache(key: string, result: CandidatesResult): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { ...result, key, cachedAt: Date.now() };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // non-fatal
  }
}

function demoResult(rotateSeed = 0): CandidatesResult {
  // Demo seeds use topic abstracts only — filter so we never show placeholder cards.
  const items = prepareSignalDisplayPool(getSignalsDemoData(rotateSeed));
  return {
    items,
    dataSource: "demo",
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchSignalCandidates(
  params: FetchCandidatesParams,
): Promise<CandidatesResult> {
  const key = buildKey(params);
  if (!params.force) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  const query = new URLSearchParams();
  if (params.topics.length > 0) query.set("topics", params.topics.join(","));
  if (params.location?.city) query.set("city", params.location.city);
  if (params.location?.region) query.set("region", params.location.region);
  if (params.location?.countryCode) query.set("countryCode", params.location.countryCode);
  query.set("lang", params.lang);
  if (params.includeMarkets) query.set("markets", "1");
  if (params.includeVideo) query.set("video", "1");
  if (params.customRssFeeds && params.customRssFeeds.length > 0) {
    query.set("rss", params.customRssFeeds.join(","));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`/api/signals/feed?${query.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`signals feed http ${res.status}`);
    const data = (await res.json()) as {
      status: string;
      items?: SignalItem[];
      generatedAt?: string;
    };
    const items = prepareSignalDisplayPool(data.items ?? []);
    if (data.status !== "ok" || items.length === 0) {
      const demo = demoResult(params.rotateSeed);
      writeCache(key, demo);
      return demo;
    }
    const result: CandidatesResult = {
      items,
      dataSource: "live",
      generatedAt: data.generatedAt ?? new Date().toISOString(),
    };
    writeCache(key, result);
    return result;
  } catch {
    const demo = demoResult(params.rotateSeed);
    // Cache demo briefly too, so a flaky network doesn't hammer the route.
    writeCache(key, demo);
    return demo;
  } finally {
    clearTimeout(timeout);
  }
}

/** Drop the cached candidate pool (used by manual refresh). */
export function clearCandidatesCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
