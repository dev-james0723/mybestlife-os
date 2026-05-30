/**
 * Signals — normalization + dedupe.
 *
 * Turns provider `RawSignalItem`s into canonical `SignalItem`s and collapses
 * duplicates reported by multiple sources (which is itself the corroboration /
 * importance signal). Pure + deterministic. No facts are invented here: every
 * field is derived from the raw item or from static registries.
 */

import {
  SOURCE_QUALITY_REGISTRY,
} from "./constants";
import type {
  SignalContentType,
  SignalItem,
  SignalSourceTier,
  SignalThumbnail,
} from "./types";
import type { RawSignalItem } from "./providers/types";
import { normalizeText } from "./matching";
import { isHttpUrl } from "./thumbnails";
import { upgradeThumbnailUrl } from "./thumbnail-resolution";

/** Stable, collision-resistant-enough id from a string (djb2 → base36). */
function hashId(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function domainFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/** Strip tracking params + trailing slash so the same article dedupes cleanly. */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const TRACKING = /^(utm_|fbclid|gclid|ref|ref_src|cmpid|ico)/i;
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING.test(key)) u.searchParams.delete(key);
    }
    u.hash = "";
    let out = u.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return url;
  }
}

export function lookupSourceTier(domain: string | undefined): SignalSourceTier {
  if (!domain) return "unknown";
  return SOURCE_QUALITY_REGISTRY[domain] ?? "unknown";
}

/** Deterministic, generic "why it matters" — never invents facts. */
function defaultWhyItMatters(contentType: SignalContentType, topic: string): string {
  switch (contentType) {
    case "breaking":
      return "A fast-moving story worth a quick glance before it develops further.";
    case "developing":
      return `An evolving ${topic} story that may keep changing — useful to track early.`;
    case "opinion":
      return "An opinion piece — useful for perspective, not as established fact.";
    case "local":
      return "Local to your area, so it may touch your day-to-day directly.";
    case "analysis":
    default:
      return `Context on ${topic} that helps you read the bigger picture.`;
  }
}

/**
 * Normalize one raw item → canonical SignalItem. Returns null if the item lacks
 * a real URL (source-grounding rule: no signal without a source).
 */
export function normalizeSignalItem(
  raw: RawSignalItem,
  options?: { nowIso?: string },
): SignalItem | null {
  if (!raw.url || !raw.title) return null;
  const sourceUrl = raw.url;
  const domain = raw.domain ?? domainFromUrl(sourceUrl);
  const tier = lookupSourceTier(domain);
  const topic = raw.topic ?? "World affairs";
  const contentType: SignalContentType = raw.contentType ?? "analysis";
  const nowIso = options?.nowIso ?? new Date().toISOString();

  const publishedAt = parsePublishedAt(raw.publishedAt) ?? nowIso;
  const summary =
    raw.snippet && raw.snippet.trim().length > 0
      ? raw.snippet.trim()
      : "Summary limited — open the source for detail.";

  // Carry the REAL thumbnail through, if the provider extracted one. A bare
  // `thumbnailUrl` is wrapped as an "rss" thumbnail; a full `thumbnail` object
  // (with provenance) is preferred. We NEVER synthesize an image here — the
  // labeled topic fallback is applied at render time, not baked into the data.
  let thumbnail: SignalThumbnail | undefined = raw.thumbnail;
  if (!thumbnail && isHttpUrl(raw.thumbnailUrl)) {
    thumbnail = { url: upgradeThumbnailUrl(raw.thumbnailUrl), source: "rss" };
  }
  if (thumbnail?.url && isHttpUrl(thumbnail.url)) {
    thumbnail = { ...thumbnail, url: upgradeThumbnailUrl(thumbnail.url) };
  }

  return {
    id: hashId(canonicalizeUrl(sourceUrl)),
    headline: raw.title.trim(),
    summary,
    source: {
      name: raw.sourceName ?? domain ?? "Source",
      url: domain ? `https://${domain}` : sourceUrl,
      domain,
      qualityTier: tier,
    },
    sourceUrl,
    publishedAt,
    lastCheckedAt: nowIso,
    topic,
    region: raw.region,
    contentType,
    tags: raw.tags && raw.tags.length > 0 ? raw.tags : [topic],
    whyItMatters: defaultWhyItMatters(contentType, topic),
    relevanceBasis: contentType === "local" ? "location_match" : "global_importance",
    isDemo: false,
    corroborationCount: 1,
    mediaType: raw.mediaType ?? (raw.videoUrl ? "video" : "article"),
    thumbnail,
    videoUrl: raw.videoUrl,
    videoProvider: raw.videoProvider,
    channelName: raw.channelName,
    duration: raw.duration,
    marketTag: raw.marketTag,
    transcriptAvailable: raw.videoUrl ? !!raw.snippet : undefined,
  };
}

function parsePublishedAt(value: string | undefined): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

const TITLE_TIER_RANK: Record<SignalSourceTier, number> = {
  high: 3,
  medium: 2,
  unknown: 1,
};

/**
 * Collapse duplicate stories. Items are grouped by canonical URL first, then by
 * normalized title. The best-tier (then freshest) representative is kept, and
 * `corroborationCount` is set to the cluster size — the "N sources reporting"
 * trust + importance signal (§15).
 */
export function dedupeSignals(items: SignalItem[]): SignalItem[] {
  const byKey = new Map<string, SignalItem[]>();

  for (const item of items) {
    const titleKey = normalizeText(item.headline).slice(0, 80);
    // Cluster by normalized title (catches the same story across sources);
    // fall back to canonical URL when the title is too short to be reliable.
    const key =
      titleKey.length >= 12 ? `t:${titleKey}` : `u:${canonicalizeUrl(item.sourceUrl)}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(item);
    else byKey.set(key, [item]);
  }

  const result: SignalItem[] = [];
  for (const bucket of byKey.values()) {
    if (bucket.length === 1) {
      result.push(bucket[0]);
      continue;
    }
    const sorted = [...bucket].sort((a, b) => {
      const tierDiff =
        TITLE_TIER_RANK[b.source.qualityTier ?? "unknown"] -
        TITLE_TIER_RANK[a.source.qualityTier ?? "unknown"];
      if (tierDiff !== 0) return tierDiff;
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
    const best = sorted[0];
    result.push({
      ...best,
      corroborationCount: bucket.length,
    });
  }

  return result;
}
