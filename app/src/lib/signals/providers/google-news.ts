/**
 * Google News RSS provider — free, keyless, and the key unlock for
 * GPS-driven "any city" local + arbitrary topic/world feeds (§15).
 *
 * Served as XML; parsed with a small, dependency-free reader (the repo has no
 * RSS-parser dependency and we won't add one for this). Source-grounded:
 * Google News items carry a real `<source>` name + a link that resolves to the
 * publisher's article.
 *
 * Honest limit: Google News RSS does not provide article snippets, so summaries
 * fall back to "Summary limited — open the source for detail" (handled by the
 * normalizer). It also does not provide district-level local precision — only
 * city/region — which the UI labels truthfully.
 */

import type {
  RawSignalItem,
  SignalProvider,
  SignalProviderRequest,
} from "./types";
import { domainFromUrl } from "../normalize";
import { extractThumbnailFromRssItem } from "../thumbnails";

const RSS_BASE = "https://news.google.com/rss";

function localeParams(lang?: string, countryCode?: string) {
  const cc = (countryCode || "US").toUpperCase();
  if (lang === "zh-TW") {
    const gl = cc === "US" ? "HK" : cc;
    return { hl: "zh-HK", gl, ceid: `${gl}:zh-Hant` };
  }
  return { hl: "en-US", gl: cc, ceid: `${cc}:en` };
}

function buildUrl(query: string | null, lang?: string, countryCode?: string): string {
  const { hl, gl, ceid } = localeParams(lang, countryCode);
  if (query) {
    const q = encodeURIComponent(query);
    return `${RSS_BASE}/search?q=${q}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  return `${RSS_BASE}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  return m ? decodeEntities(m[1]) : undefined;
}

/** Raw inner content of a tag WITHOUT stripping HTML (for `<img>` scanning). */
function extractRawTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return undefined;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function attr(tagMatch: string, name: string): string | undefined {
  const m = new RegExp(`${name}=["']([^"']+)["']`, "i").exec(tagMatch);
  return m?.[1];
}

/**
 * Extract a REAL lead image from an RSS `<item>` block following the §thumbnail
 * priority chain (media:content → media:thumbnail → enclosure → description
 * <img>). Returns undefined when the feed carries no real image — the labeled
 * topic fallback is then applied downstream (never a fabricated image).
 */
function extractItemThumbnail(block: string): RawSignalItem["thumbnail"] {
  const mediaContent = /<media:content[^>]*>/i.exec(block)?.[0];
  const mediaThumb = /<media:thumbnail[^>]*>/i.exec(block)?.[0];
  const enclosure = /<enclosure[^>]*>/i.exec(block)?.[0];
  const descriptionHtml = extractRawTag(block, "description");
  return extractThumbnailFromRssItem({
    mediaContentUrl: mediaContent ? attr(mediaContent, "url") : undefined,
    mediaThumbnailUrl: mediaThumb ? attr(mediaThumb, "url") : undefined,
    enclosureUrl: enclosure ? attr(enclosure, "url") : undefined,
    enclosureType: enclosure ? attr(enclosure, "type") : undefined,
    descriptionHtml,
  });
}

function parseRssItems(
  xml: string,
  meta: { topic: string; region?: string; contentType: RawSignalItem["contentType"] },
  limit: number,
): RawSignalItem[] {
  const items: RawSignalItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) && items.length < limit) {
    const block = match[1];
    let title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    if (!title || !link) continue;

    const sourceMatch = /<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i.exec(block);
    const sourceUrl = sourceMatch?.[1];
    const sourceName = sourceMatch ? decodeEntities(sourceMatch[2]) : undefined;
    const domain = sourceUrl ? domainFromUrl(sourceUrl) : undefined;

    // Google News titles end with " - Source"; strip when we know the source.
    if (sourceName && title.endsWith(` - ${sourceName}`)) {
      title = title.slice(0, -(sourceName.length + 3)).trim();
    }

    items.push({
      title,
      url: link,
      sourceName: sourceName ?? domain,
      domain,
      publishedAt: pubDate,
      snippet: "",
      topic: meta.topic,
      region: meta.region,
      contentType: meta.contentType,
      tags: [meta.topic],
      providerId: "google-news",
      thumbnail: extractItemThumbnail(block),
    });
  }
  return items;
}

async function fetchRss(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    headers: { "user-agent": "MyLifeOS-Signals/1.0", accept: "application/rss+xml, text/xml" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`google-news http ${res.status}`);
  return res.text();
}

/** World top stories. */
export const googleNewsWorldProvider: SignalProvider = {
  id: "google-news-world",
  label: "Google News (World)",
  sections: ["world", "top3"],
  /** Disabled — Google News RSS has no thumbnails; use publisher-feeds instead. */
  live: false,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const xml = await fetchRss(buildUrl(null, req.lang, undefined), req.signal);
    return parseRssItems(xml, { topic: "World affairs", contentType: "global" }, req.limit ?? 8);
  },
};

/** One feed per followed topic (capped server-side to a few topics). */
export const googleNewsTopicProvider: SignalProvider = {
  id: "google-news-topic",
  label: "Google News (Topics)",
  sections: ["world", "personal", "top3"],
  live: false,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const topics = (req.topics ?? []).filter((t) => t && t !== "Local").slice(0, 4);
    if (topics.length === 0) return [];
    const perTopic = Math.max(2, Math.ceil((req.limit ?? 12) / topics.length));
    const results = await Promise.allSettled(
      topics.map(async (topic) => {
        const xml = await fetchRss(buildUrl(topic, req.lang, undefined), req.signal);
        return parseRssItems(xml, { topic, contentType: "analysis" }, perTopic);
      }),
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  },
};

/** Local feed scoped to the resolved city (city/region precision only). */
export const googleNewsLocalProvider: SignalProvider = {
  id: "google-news-local",
  label: "Google News (Local)",
  sections: ["local"],
  live: false,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const city = req.location?.city;
    if (!city) return [];
    const region = req.location?.region ?? city;
    const xml = await fetchRss(
      buildUrl(city, req.lang, req.location?.countryCode),
      req.signal,
    );
    return parseRssItems(
      xml,
      { topic: "Local", region, contentType: "local" },
      req.limit ?? 6,
    );
  },
};

/**
 * Run a Google News RSS *search* for an arbitrary query and shape the results
 * with the given topic/contentType metadata. Reused by the markets provider and
 * by custom-topic source queries — keeps all Google News parsing in one place.
 */
export async function fetchGoogleNewsQuery(
  query: string,
  meta: { topic: string; region?: string; contentType: RawSignalItem["contentType"] },
  req: SignalProviderRequest = {},
  limit = 6,
): Promise<RawSignalItem[]> {
  const xml = await fetchRss(
    buildUrl(query, req.lang, req.location?.countryCode),
    req.signal,
  );
  return parseRssItems(xml, meta, limit);
}

// ── Named convenience wrappers (brief's contract) ──

export async function fetchWorldSignals(req: SignalProviderRequest = {}) {
  return googleNewsWorldProvider.fetch(req);
}

export async function fetchLocalSignals(
  location: SignalProviderRequest["location"],
  req: Omit<SignalProviderRequest, "location"> = {},
) {
  return googleNewsLocalProvider.fetch({ ...req, location });
}

export async function fetchSignalsByTopic(topic: string, req: SignalProviderRequest = {}) {
  return googleNewsTopicProvider.fetch({ ...req, topics: [topic] });
}
