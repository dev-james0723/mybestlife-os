/**
 * Markets provider — source-grounded market NEWS only (§ Stocks/Markets).
 *
 * Opt-in (runs only when `req.includeMarkets`). Pulls headlines for a small set
 * of curated market queries from Google News RSS and tags them `mediaType:
 * "market"`. It does NOT fetch or fabricate live prices/quotes — a real
 * price/quote API is a deliberate TODO adapter (see below). No financial advice
 * is ever generated; we only surface what the source reported.
 *
 * TODO(v2): add an optional, source-attributed quote adapter (e.g. a licensed
 * market-data API) behind a server env key. Until then, Markets stays NEWS-only.
 */

import { MARKET_NEWS_QUERIES, MARKET_TOPIC } from "../constants";
import { fetchGoogleNewsQuery } from "./google-news";
import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";

/** Derive a coarse, honest market tag from the query (never a fabricated label). */
function marketTagForQuery(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("earnings")) return "Earnings";
  if (q.includes("fed") || q.includes("interest rate") || q.includes("inflation")) return "Macro";
  if (q.includes("index") || q.includes("s&p") || q.includes("nasdaq") || q.includes("dow")) {
    return "Indices";
  }
  if (q.includes("chip") || q.includes("ai")) return "Tech stocks";
  return "Equities";
}

export const marketsProvider: SignalProvider = {
  id: "markets-google-news",
  label: "Markets (Google News)",
  sections: ["markets"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    if (!req.includeMarkets) return [];
    const perQuery = Math.max(2, Math.ceil((req.limit ?? 12) / MARKET_NEWS_QUERIES.length));
    const results = await Promise.allSettled(
      MARKET_NEWS_QUERIES.map((query) =>
        fetchGoogleNewsQuery(
          query,
          { topic: MARKET_TOPIC, contentType: "analysis" },
          req,
          perQuery,
        ),
      ),
    );
    const out: RawSignalItem[] = [];
    results.forEach((r, i) => {
      if (r.status !== "fulfilled") return;
      const tag = marketTagForQuery(MARKET_NEWS_QUERIES[i]);
      for (const item of r.value) {
        out.push({
          ...item,
          topic: MARKET_TOPIC,
          mediaType: "market",
          marketTag: tag,
          tags: [MARKET_TOPIC, tag],
        });
      }
    });
    return out;
  },
};
