/**
 * Shared RSS/Atom parser for Signals providers.
 * Extracts real thumbnails from media:content, media:thumbnail, enclosure,
 * and description/content HTML — dependency-free.
 */

import { domainFromUrl } from "../normalize";
import { extractThumbnailFromRssItem } from "../thumbnails";
import type { RawSignalItem } from "./types";

export function decodeRssEntities(value: string): string {
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

export function extractRssTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  return m ? decodeRssEntities(m[1]) : undefined;
}

/** Raw inner tag content (keeps HTML for `<img>` scanning). */
export function extractRssRawTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(block);
  if (!m) return undefined;
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function attr(tagMatch: string, name: string): string | undefined {
  const m = new RegExp(`${name}=["']([^"']+)["']`, "i").exec(tagMatch);
  return m?.[1];
}

export function extractItemThumbnail(block: string): RawSignalItem["thumbnail"] {
  const mediaContent = /<media:content[^>]*>/i.exec(block)?.[0];
  const mediaThumb = /<media:thumbnail[^>]*>/i.exec(block)?.[0];
  const enclosure = /<enclosure[^>]*>/i.exec(block)?.[0];
  const descriptionHtml =
    extractRssRawTag(block, "content:encoded") ??
    extractRssRawTag(block, "description") ??
    extractRssRawTag(block, "content") ??
    extractRssRawTag(block, "summary");
  return extractThumbnailFromRssItem({
    mediaContentUrl: mediaContent ? attr(mediaContent, "url") : undefined,
    mediaThumbnailUrl: mediaThumb ? attr(mediaThumb, "url") : undefined,
    enclosureUrl: enclosure ? attr(enclosure, "url") : undefined,
    enclosureType: enclosure ? attr(enclosure, "type") : undefined,
    descriptionHtml,
  });
}

/** Atom `<link href>` (rel=alternate) or RSS `<link>`. */
function extractLink(block: string): string | undefined {
  const alt = /<link[^>]*rel=["']alternate["'][^>]*>/i.exec(block)?.[0];
  if (alt) {
    const href = attr(alt, "href");
    if (href) return href;
  }
  const anyLink = /<link[^>]*href=["']([^"']+)["'][^>]*>/i.exec(block);
  if (anyLink) return anyLink[1];
  return extractRssTag(block, "link");
}

export type ParseRssMeta = {
  topic: string;
  region?: string;
  contentType: RawSignalItem["contentType"];
  providerId: string;
  /** Override detected publisher name (e.g. "BBC News"). */
  sourceName?: string;
};

export function parseRssXml(
  xml: string,
  meta: ParseRssMeta,
  limit: number,
): RawSignalItem[] {
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blockRe = isAtom ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
  const items: RawSignalItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(xml)) && items.length < limit) {
    const block = match[1];
    const title = extractRssTag(block, "title");
    const link = extractLink(block);
    if (!title || !link) continue;

    const pubDate =
      extractRssTag(block, "pubDate") ??
      extractRssTag(block, "published") ??
      extractRssTag(block, "updated");
    const snippetRaw =
      extractRssTag(block, "description") ??
      extractRssTag(block, "summary") ??
      extractRssTag(block, "content");
    const domain = domainFromUrl(link);
    const thumbnail = extractItemThumbnail(block);

    items.push({
      title,
      url: link,
      sourceName: meta.sourceName ?? domain ?? "Source",
      domain,
      publishedAt: pubDate,
      snippet: snippetRaw ?? "",
      topic: meta.topic,
      region: meta.region,
      contentType: meta.contentType,
      tags: [meta.topic],
      providerId: meta.providerId,
      thumbnail,
    });
  }
  return items;
}

export async function fetchRssXml(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; MyLifeOS-Signals/1.0; +https://www.mybestlife-os.com)",
      accept: "application/rss+xml, application/atom+xml, text/xml, application/xml",
    },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`rss http ${res.status} for ${url}`);
  return res.text();
}
