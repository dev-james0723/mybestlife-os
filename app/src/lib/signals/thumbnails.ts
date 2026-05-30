/**
 * Signals — thumbnail extraction + honest fallbacks.
 *
 * HARD RULE (§ "no fake thumbnails"): a thumbnail is EITHER a real image fetched
 * from the source (with a `url` + truthful `source` provenance) OR a clearly
 * labeled deterministic topic abstract (`isFallback: true`, NO `url` — the UI
 * paints a Liquid-Glass gradient). We never present a stock/AI/random image as
 * the article's own image.
 *
 * These helpers are PURE where possible (extraction, youtube, topic fallback,
 * dedupe) so they unit-test cleanly. The one network helper —
 * `extractThumbnailFromOpenGraph` — is server-only and CACHED; it is invoked at
 * most a few times during the API aggregation pass, NEVER per render.
 */

import { topicAccentColor } from "./constants";
import { pickBestImageFromHtml, upgradeThumbnailUrl } from "./thumbnail-resolution";
import type { SignalItem, SignalThumbnail } from "./types";

function withResolvedUrl(
  base: Omit<SignalThumbnail, "url">,
  url: string,
  source: SignalThumbnail["source"],
): SignalThumbnail {
  return { ...base, url: upgradeThumbnailUrl(url), source };
}

/** True for a real, fetchable http(s) image URL. */
export function isHttpUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url.trim());
}

/** A thumbnail counts as "real" only when it has a URL and isn't a fallback. */
export function isRealThumbnail(t: SignalThumbnail | undefined | null): boolean {
  return !!t && !t.isFallback && isHttpUrl(t.url);
}

/** Candidate image sources parsed from one RSS/Atom `<item>` (any may be absent). */
export type RssThumbnailCandidates = {
  /** `<media:content url=… medium="image">`. */
  mediaContentUrl?: string;
  /** `<media:thumbnail url=…>`. */
  mediaThumbnailUrl?: string;
  /** `<enclosure url=… type="image/*">`. */
  enclosureUrl?: string;
  enclosureType?: string;
  /** `og:image` when the feed embeds it. */
  ogImageUrl?: string;
  /** `twitter:image`. */
  twitterImageUrl?: string;
  /** A YouTube video id (for channel feeds). */
  youtubeVideoId?: string;
  /** A publisher-provided image (e.g. RSS `image`/`itunes:image`). */
  publisherImageUrl?: string;
  /** Raw description/content HTML to scan for the first `<img src>`. */
  descriptionHtml?: string;
  alt?: string;
  attribution?: string;
};

/** First `<img src>` in an HTML blob, if it's a real http(s) image. */
export function firstImageInHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  const url = m?.[1];
  return isHttpUrl(url) ? url : undefined;
}

/**
 * Resolve the best REAL thumbnail from RSS candidates, in priority order
 * (§ thumbnail priority): media:content → media:thumbnail → enclosure image →
 * og:image → twitter card → youtube → publisher → description <img>.
 *
 * Returns `undefined` when no real image exists — the caller then applies a
 * labeled topic fallback. It NEVER fabricates an image.
 */
export function extractThumbnailFromRssItem(
  c: RssThumbnailCandidates,
): SignalThumbnail | undefined {
  const base = { alt: c.alt, attribution: c.attribution };

  if (isHttpUrl(c.mediaContentUrl)) {
    return withResolvedUrl(base, c.mediaContentUrl, "rss");
  }
  if (isHttpUrl(c.mediaThumbnailUrl)) {
    return withResolvedUrl(base, c.mediaThumbnailUrl, "rss");
  }
  if (isHttpUrl(c.enclosureUrl) && (!c.enclosureType || /^image\//i.test(c.enclosureType))) {
    return withResolvedUrl(base, c.enclosureUrl, "rss");
  }
  if (isHttpUrl(c.ogImageUrl)) {
    return withResolvedUrl(base, c.ogImageUrl, "open_graph");
  }
  if (isHttpUrl(c.twitterImageUrl)) {
    return withResolvedUrl(base, c.twitterImageUrl, "open_graph");
  }
  if (c.youtubeVideoId) {
    return getYouTubeThumbnail(c.youtubeVideoId, c.alt);
  }
  if (isHttpUrl(c.publisherImageUrl)) {
    return withResolvedUrl(base, c.publisherImageUrl, "publisher");
  }
  const fromHtml = pickBestImageFromHtml(c.descriptionHtml) ?? firstImageInHtml(c.descriptionHtml);
  if (fromHtml) {
    return withResolvedUrl(base, fromHtml, "rss");
  }
  return undefined;
}

/** YouTube — prefer maxres; UI falls back to hqdefault on load error. */
export function getYouTubeThumbnail(videoId: string, alt?: string): SignalThumbnail {
  const id = encodeURIComponent(videoId);
  return {
    url: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    source: "youtube",
    alt,
  };
}

export function getYouTubeThumbnailFallback(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

/**
 * Deterministic, clearly-labeled topic abstract — NOT a photo of the article.
 * Carries no `url`; the UI renders a Liquid-Glass gradient from `dominantColor`.
 */
export function getFallbackThumbnailForTopic(topic: string): SignalThumbnail {
  return {
    source: "fallback",
    isFallback: true,
    dominantColor: topicAccentColor(topic),
    alt: topic,
  };
}

/** The thumbnail to actually render: the real one, else a labeled topic fallback. */
export function resolveDisplayThumbnail(signal: SignalItem): SignalThumbnail {
  if (isRealThumbnail(signal.thumbnail)) {
    const t = signal.thumbnail as SignalThumbnail;
    return { ...t, url: upgradeThumbnailUrl(t.url!) };
  }
  return getFallbackThumbnailForTopic(signal.topic);
}

/**
 * Keep only signals that have a real, fetchable thumbnail URL (no topic placeholders).
 */
export function onlySignalsWithRealThumbnails(items: SignalItem[]): SignalItem[] {
  return items.filter((item) => isRealThumbnail(item.thumbnail));
}

/**
 * Drop duplicate thumbnail URLs (same lead image reused across stories) instead of
 * swapping later items to a placeholder — the UI should never show a fallback card.
 */
export function dedupeThumbnailUrls(items: SignalItem[]): SignalItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!isRealThumbnail(item.thumbnail)) return false;
    const url = upgradeThumbnailUrl(item.thumbnail!.url!);
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

/**
 * Pipeline used before ranking / display: real thumbnails only, unique image URLs.
 */
export function prepareSignalDisplayPool(items: SignalItem[]): SignalItem[] {
  return dedupeThumbnailUrls(onlySignalsWithRealThumbnails(items));
}

/** @deprecated Use {@link prepareSignalDisplayPool} — no longer injects placeholders on dupes. */
export function dedupeThumbnails(items: SignalItem[]): SignalItem[] {
  return prepareSignalDisplayPool(items);
}

// ============================================================
// Open Graph (server-only, cached) — best-effort, capped, never per render.
// ============================================================

type OgCacheEntry = { thumb: SignalThumbnail | null; at: number };
const OG_CACHE = new Map<string, OgCacheEntry>();
const OG_TTL_MS = 6 * 60 * 60 * 1000; // 6h — OG images rarely change
const OG_FETCH_TIMEOUT_MS = 4000;
const OG_MAX_HTML_BYTES = 200_000; // only need the <head>

function readMetaContent(html: string, attr: string, value: string): string | undefined {
  // <meta property="og:image" content="…"> OR name="twitter:image"
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = re.exec(html);
  if (m && isHttpUrl(m[1])) return m[1];
  // Attribute order can be reversed (content before property).
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`,
    "i",
  );
  const m2 = re2.exec(html);
  return m2 && isHttpUrl(m2[1]) ? m2[1] : undefined;
}

/**
 * Fetch a page's `og:image` / `twitter:image` (server-side, cached). Returns
 * `null` (cached) when none is found so we don't refetch dead pages. Must only
 * be called from server code (API route / cron), and only for a small set of
 * hero items — never in a component render path.
 *
 * TODO(v2): move to the daily cron + persist into `signal_items.thumbnail_url`
 * so the request path never does a live OG fetch at all.
 */
export async function extractThumbnailFromOpenGraph(
  url: string,
  signal?: AbortSignal,
): Promise<SignalThumbnail | null> {
  if (!isHttpUrl(url)) return null;
  const cached = OG_CACHE.get(url);
  if (cached && Date.now() - cached.at < OG_TTL_MS) return cached.thumb;

  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
      headers: { "user-agent": "MyLifeOS-Signals/1.0", accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok || !res.body) {
      OG_CACHE.set(url, { thumb: null, at: Date.now() });
      return null;
    }
    // Read only the head-ish prefix; abort once we have enough.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < OG_MAX_HTML_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    try {
      await reader.cancel();
    } catch {
      // ignore
    }

    const og = readMetaContent(html, "property", "og:image");
    const tw = og ?? readMetaContent(html, "name", "twitter:image");
    const thumb: SignalThumbnail | null = tw
      ? { url: upgradeThumbnailUrl(tw), source: "open_graph" }
      : null;
    OG_CACHE.set(url, { thumb, at: Date.now() });
    return thumb;
  } catch {
    OG_CACHE.set(url, { thumb: null, at: Date.now() });
    return null;
  }
}
