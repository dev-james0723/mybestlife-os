/**
 * Signals — fetch real article metadata (OG image + description) from source URLs.
 *
 * Used server-side during feed aggregation so Google News items (which ship
 * without RSS media or snippets) still get publisher thumbnails and prose for
 * overviews. One HTTP fetch per article; results are cached in-process.
 */

import type { SignalThumbnail } from "./types";
import { isHttpUrl } from "./thumbnails";
import { upgradeThumbnailUrl } from "./thumbnail-resolution";

export type ArticleMetadata = {
  /** Final URL after redirects (e.g. news.google.com → publisher). */
  resolvedUrl: string;
  thumbnail: SignalThumbnail | null;
  /** Best-effort description from og:description / meta description. */
  description: string | null;
};

type CacheEntry = { data: ArticleMetadata | null; at: number };
const CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 250_000;

function readMetaContent(html: string, attr: string, value: string): string | undefined {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${value}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
  const m = re.exec(html);
  if (m?.[1]) return decodeEntities(m[1].trim());
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`,
    "i",
  );
  const m2 = re2.exec(html);
  return m2?.[1] ? decodeEntities(m2[1].trim()) : undefined;
}

function decodeEntities(value: string): string {
  return value
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

function pickDescription(html: string): string | undefined {
  const candidates = [
    readMetaContent(html, "property", "og:description"),
    readMetaContent(html, "name", "twitter:description"),
    readMetaContent(html, "name", "description"),
  ].filter((c): c is string => !!c && c.length > 24);
  if (candidates.length === 0) return undefined;
  // Prefer the longest substantive description (often og:description).
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function pickThumbnailUrl(html: string, baseUrl: string): string | undefined {
  const og = readMetaContent(html, "property", "og:image");
  const tw = og ?? readMetaContent(html, "name", "twitter:image");
  if (!tw) return undefined;
  if (isHttpUrl(tw)) return tw;
  try {
    return new URL(tw, baseUrl).href;
  } catch {
    return undefined;
  }
}

const PLACEHOLDER_SUMMARY = /^summary limited/i;

/** True when the signal still needs a real snippet from the article page. */
export function needsArticleEnrichment(
  item: { summary?: string; thumbnail?: SignalThumbnail },
): boolean {
  const summary = item.summary?.trim() ?? "";
  const missingSnippet =
    summary.length === 0 || PLACEHOLDER_SUMMARY.test(summary) || summary.length < 80;
  const missingThumb =
    !item.thumbnail?.url || item.thumbnail.isFallback === true;
  return missingSnippet || missingThumb;
}

/**
 * Fetch og:image + description from an article URL (follows redirects).
 * Cached per URL; returns null on failure (never throws).
 */
export async function fetchArticleMetadata(
  url: string,
  signal?: AbortSignal,
): Promise<ArticleMetadata | null> {
  if (!isHttpUrl(url)) return null;
  const cached = CACHE.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  try {
    const res = await fetch(url, {
      signal: signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; MyLifeOS-Signals/1.0; +https://www.mybestlife-os.com)",
        accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok || !res.body) {
      CACHE.set(url, { data: null, at: Date.now() });
      return null;
    }

    const resolvedUrl = res.url || url;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < MAX_HTML_BYTES) {
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

    const imageUrl = pickThumbnailUrl(html, resolvedUrl);
    const description = pickDescription(html);
    const thumb: SignalThumbnail | null = imageUrl
      ? {
          url: upgradeThumbnailUrl(imageUrl),
          source: "open_graph",
          alt: description?.slice(0, 120),
        }
      : null;

    const data: ArticleMetadata = {
      resolvedUrl,
      thumbnail: thumb,
      description: description ?? null,
    };
    CACHE.set(url, { data, at: Date.now() });
    // Also cache under resolved URL so repeat lookups are instant.
    if (resolvedUrl !== url) CACHE.set(resolvedUrl, { data, at: Date.now() });
    return data;
  } catch {
    CACHE.set(url, { data: null, at: Date.now() });
    return null;
  }
}

/** Run async tasks with a concurrency cap. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

const SUMMARY_LIMITED = "Summary limited — open the source for detail.";

/**
 * Enrich signals missing thumbnails and/or real snippets by fetching publisher
 * pages (especially Google News redirect links). Pure merge — never invents facts.
 */
export async function enrichSignalItems<T extends {
  sourceUrl: string;
  summary: string;
  thumbnail?: SignalThumbnail;
}>(
  items: T[],
  options?: { maxItems?: number; concurrency?: number; signal?: AbortSignal },
): Promise<T[]> {
  const maxItems = options?.maxItems ?? 24;
  const concurrency = options?.concurrency ?? 5;

  const indices = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => needsArticleEnrichment(item))
    .slice(0, maxItems);

  if (indices.length === 0) return items;

  const enriched = await mapPool(indices, concurrency, async ({ item, i }) => {
    const meta = await fetchArticleMetadata(item.sourceUrl, options?.signal);
    if (!meta) return { i, item };
    const next = { ...item };
    if (
      meta.thumbnail?.url &&
      (!item.thumbnail?.url || item.thumbnail.isFallback)
    ) {
      next.thumbnail = meta.thumbnail;
    }
    const summary = item.summary?.trim() ?? "";
    if (
      meta.description &&
      (summary.length === 0 ||
        PLACEHOLDER_SUMMARY.test(summary) ||
        summary.length < 80)
    ) {
      next.summary = meta.description.slice(0, 600);
    }
    if (meta.resolvedUrl && meta.resolvedUrl !== item.sourceUrl) {
      next.sourceUrl = meta.resolvedUrl;
    }
    return { i, item: next };
  });

  const out = [...items];
  for (const { i, item } of enriched) {
    out[i] = item;
  }
  return out;
}

export { SUMMARY_LIMITED };
