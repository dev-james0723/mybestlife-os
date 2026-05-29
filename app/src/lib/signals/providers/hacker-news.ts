/**
 * Hacker News provider (Algolia API) — free, keyless, high quality for an AI
 * builder. Source-grounded: every hit has a real story URL.
 *
 * https://hn.algolia.com/api  — no auth required.
 */

import type { RawSignalItem, SignalProvider, SignalProviderRequest } from "./types";
import { domainFromUrl } from "../normalize";

const FRONT_PAGE = "https://hn.algolia.com/api/v1/search?tags=front_page";

type AlgoliaHit = {
  objectID: string;
  title?: string | null;
  url?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at?: string | null;
};

type AlgoliaResponse = { hits?: AlgoliaHit[] };

function topicForTitle(title: string): string {
  const t = title.toLowerCase();
  if (/\b(ai|llm|gpt|model|neural|ml)\b/.test(t)) return "AI";
  if (/\b(startup|funding|yc|raise|series [a-d])\b/.test(t)) return "Startups";
  if (/\b(science|research|physics|biology|space)\b/.test(t)) return "Science";
  return "Technology";
}

export const hackerNewsProvider: SignalProvider = {
  id: "hacker-news",
  label: "Hacker News",
  sections: ["world", "personal"],
  live: true,
  async fetch(req: SignalProviderRequest): Promise<RawSignalItem[]> {
    const limit = req.limit ?? 15;
    const res = await fetch(`${FRONT_PAGE}&hitsPerPage=${limit}`, {
      signal: req.signal,
      headers: { accept: "application/json" },
      // News is shared/public: cache briefly at the edge.
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`hacker-news http ${res.status}`);
    const data = (await res.json()) as AlgoliaResponse;
    const hits = data.hits ?? [];
    return hits
      .filter((h): h is AlgoliaHit & { title: string; url: string } => !!h.title && !!h.url)
      .map((h) => {
        const domain = domainFromUrl(h.url) ?? undefined;
        const topic = topicForTitle(h.title);
        return {
          title: h.title,
          url: h.url,
          sourceName: domain ?? "Hacker News",
          domain,
          publishedAt: h.created_at ?? undefined,
          snippet: `Discussed on Hacker News${
            h.points != null ? ` · ${h.points} points` : ""
          }${h.num_comments != null ? ` · ${h.num_comments} comments` : ""}.`,
          topic,
          contentType: "developing",
          tags: [topic, "Technology"],
          providerId: "hacker-news",
        } satisfies RawSignalItem;
      });
  },
};

/** Named convenience wrapper (brief's contract). */
export async function fetchTechSignals(
  req: SignalProviderRequest = {},
): Promise<RawSignalItem[]> {
  return hackerNewsProvider.fetch(req);
}
