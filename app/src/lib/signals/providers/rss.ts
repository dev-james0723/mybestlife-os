/**
 * Generic RSS/Atom provider — custom topic feeds from the user.
 */

import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";
import { fetchRssXml, parseRssXml } from "./parse-rss";

const MAX_FEEDS = 5;
const PER_FEED = 5;

export const customRssProvider: SignalProvider = {
  id: "custom-rss",
  label: "Custom RSS feeds",
  sections: ["personal", "world"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const feeds = (req.customRssFeeds ?? [])
      .filter((f) => /^https?:\/\//i.test(f))
      .slice(0, MAX_FEEDS);
    if (feeds.length === 0) return [];

    const results = await Promise.allSettled(
      feeds.map(async (feedUrl) => {
        const xml = await fetchRssXml(feedUrl, req.signal);
        return parseRssXml(
          xml,
          {
            topic: "Following",
            contentType: "analysis",
            providerId: "custom-rss",
          },
          PER_FEED,
        );
      }),
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  },
};
