/**
 * Generic RSS/Atom provider — pulls arbitrary feeds the user attached to a
 * custom topic (§ Custom topics). Source-grounded by construction: items come
 * straight from the user's chosen feed with their real links + images.
 *
 * Handles both RSS (`<item>`) and Atom (`<entry>`). Dependency-free parsing,
 * matching the house approach in `google-news.ts` (no rss-parser dependency).
 */

import { domainFromUrl } from "../normalize";
import { extractThumbnailFromRssItem } from "../thumbnails";
import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";

const MAX_FEEDS = 5;
const PER_FEED = 5;

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagText(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(block);
  return m ? decode(m[1]) : undefined;
}

function rawTag(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(block);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") : undefined;
}

function attr(tagMatch: string, name: string): string | undefined {
  return new RegExp(`${name}=["']([^"']+)["']`, "i").exec(tagMatch)?.[1];
}

/** Atom `<link href>` (rel="alternate" or first), else RSS `<link>text</link>`. */
function extractLink(block: string): string | undefined {
  const alt = /<link[^>]*rel=["']alternate["'][^>]*>/i.exec(block)?.[0];
  if (alt) {
    const href = attr(alt, "href");
    if (href) return href;
  }
  const anyLink = /<link[^>]*href=["']([^"']+)["'][^>]*>/i.exec(block);
  if (anyLink) return anyLink[1];
  return tagText(block, "link");
}

function thumbFor(block: string): RawSignalItem["thumbnail"] {
  const mediaContent = /<media:content[^>]*>/i.exec(block)?.[0];
  const mediaThumb = /<media:thumbnail[^>]*>/i.exec(block)?.[0];
  const enclosure = /<enclosure[^>]*>/i.exec(block)?.[0];
  const descriptionHtml = rawTag(block, "description") ?? rawTag(block, "content") ?? rawTag(block, "summary");
  return extractThumbnailFromRssItem({
    mediaContentUrl: mediaContent ? attr(mediaContent, "url") : undefined,
    mediaThumbnailUrl: mediaThumb ? attr(mediaThumb, "url") : undefined,
    enclosureUrl: enclosure ? attr(enclosure, "url") : undefined,
    enclosureType: enclosure ? attr(enclosure, "type") : undefined,
    descriptionHtml,
  });
}

function parseFeed(xml: string, limit: number): RawSignalItem[] {
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blockRe = isAtom ? /<entry>([\s\S]*?)<\/entry>/g : /<item>([\s\S]*?)<\/item>/g;
  const items: RawSignalItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(xml)) && items.length < limit) {
    const block = match[1];
    const title = tagText(block, "title");
    const link = extractLink(block);
    if (!title || !link) continue;
    const published = tagText(block, "pubDate") ?? tagText(block, "published") ?? tagText(block, "updated");
    const snippetRaw = tagText(block, "description") ?? tagText(block, "summary");
    const domain = domainFromUrl(link);
    items.push({
      title,
      url: link,
      sourceName: domain,
      domain,
      publishedAt: published,
      snippet: snippetRaw ?? "",
      topic: "Following",
      contentType: "analysis",
      tags: ["Following"],
      providerId: "custom-rss",
      thumbnail: thumbFor(block),
    });
  }
  return items;
}

async function fetchFeed(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    headers: { "user-agent": "MyLifeOS-Signals/1.0", accept: "application/rss+xml, application/atom+xml, text/xml" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error(`custom-rss http ${res.status}`);
  return res.text();
}

export const customRssProvider: SignalProvider = {
  id: "custom-rss",
  label: "Custom RSS feeds",
  sections: ["personal", "world"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const feeds = (req.customRssFeeds ?? []).filter((f) => /^https?:\/\//i.test(f)).slice(0, MAX_FEEDS);
    if (feeds.length === 0) return [];
    const results = await Promise.allSettled(
      feeds.map(async (feed) => parseFeed(await fetchFeed(feed, req.signal), PER_FEED)),
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  },
};
