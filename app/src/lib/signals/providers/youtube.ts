/**
 * YouTube video provider — keyless channel RSS (§ Video Signals).
 *
 * Opt-in (runs only when `req.includeVideo`). Uses YouTube's public channel
 * Atom feed (`/feeds/videos.xml?channel_id=…`) — no API key required. Every
 * item is source-grounded: a real `videoId` → a real watch URL + the real
 * YouTube thumbnail (`getYouTubeThumbnail`). We never fabricate video content;
 * the description (when present) is the only text used for an overview.
 *
 * TODO(v2): a YouTube Data API adapter (search by topic, durations, captions)
 * behind a server `YOUTUBE_API_KEY`. Until then we use curated channel feeds.
 */

import { VIDEO_CHANNEL_SEEDS } from "../constants";
import { getYouTubeThumbnail } from "../thumbnails";
import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";

const FEED_BASE = "https://www.youtube.com/feeds/videos.xml?channel_id=";

function tag(block: string, name: string): string | undefined {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(block);
  if (!m) return undefined;
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseEntries(
  xml: string,
  seedTopic: string,
  seedName: string,
  limit: number,
): RawSignalItem[] {
  const items: RawSignalItem[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(xml)) && items.length < limit) {
    const block = match[1];
    const videoId = tag(block, "yt:videoId");
    const title = tag(block, "title");
    if (!videoId || !title) continue;
    const published = tag(block, "published");
    const author = tag(block, "name") ?? seedName;
    const description = tag(block, "media:description");

    items.push({
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      sourceName: author,
      domain: "youtube.com",
      publishedAt: published,
      snippet: description && description.length > 0 ? description : "",
      topic: seedTopic,
      contentType: "analysis",
      tags: [seedTopic, "Video"],
      providerId: "youtube",
      mediaType: "video",
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoProvider: "youtube",
      channelName: author,
      thumbnail: getYouTubeThumbnail(videoId, title),
    });
  }
  return items;
}

async function fetchFeed(channelId: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${FEED_BASE}${encodeURIComponent(channelId)}`, {
    signal,
    headers: { "user-agent": "MyLifeOS-Signals/1.0", accept: "application/atom+xml, text/xml" },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`youtube http ${res.status}`);
  return res.text();
}

export const youtubeVideoProvider: SignalProvider = {
  id: "youtube",
  label: "YouTube (channel RSS)",
  sections: ["video"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    if (!req.includeVideo) return [];
    const perChannel = Math.max(2, Math.ceil((req.limit ?? 12) / VIDEO_CHANNEL_SEEDS.length));
    const results = await Promise.allSettled(
      VIDEO_CHANNEL_SEEDS.map(async (seed) => {
        const xml = await fetchFeed(seed.channelId, req.signal);
        return parseEntries(xml, seed.topic, seed.name, perChannel);
      }),
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  },
};
