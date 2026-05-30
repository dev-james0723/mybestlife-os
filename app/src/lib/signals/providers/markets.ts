/**
 * Markets provider — source-grounded market NEWS with real feed thumbnails.
 * Uses publisher business RSS (Guardian + BBC), not Google News.
 */

import { MARKET_TOPIC } from "../constants";
import { fetchPublisherBusinessFeeds } from "./publisher-feeds";
import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";

function marketTagFromHeadline(headline: string): string {
  const h = headline.toLowerCase();
  if (h.includes("earnings") || h.includes("profit") || h.includes("revenue")) return "Earnings";
  if (h.includes("fed") || h.includes("rate") || h.includes("inflation")) return "Macro";
  if (h.includes("s&p") || h.includes("nasdaq") || h.includes("dow") || h.includes("index")) {
    return "Indices";
  }
  if (h.includes("chip") || h.includes("ai") || h.includes("nvidia")) return "Tech stocks";
  return "Equities";
}

export const marketsProvider: SignalProvider = {
  id: "markets-publisher-rss",
  label: "Markets (Publisher RSS)",
  sections: ["markets"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    if (!req.includeMarkets) return [];
    const raw = await fetchPublisherBusinessFeeds(req, req.limit ?? 12);
    return raw.map((item) => ({
      ...item,
      topic: MARKET_TOPIC,
      mediaType: "market" as const,
      marketTag: marketTagFromHeadline(item.title),
      tags: [MARKET_TOPIC, marketTagFromHeadline(item.title)],
    }));
  },
};
