/**
 * Signals — news source adapter foundation.
 *
 * Every live source (RSS / Google News RSS / GDELT / Hacker News / official
 * alert feeds) implements the same `SignalProvider` interface and emits
 * `RawSignalItem`s. The normalizer turns those into the canonical `SignalItem`
 * shape. This keeps real-source logic completely separate from the UI and from
 * ranking — providers only fetch + shape; they never rank or personalize.
 *
 * Providers MUST be source-grounded: a `RawSignalItem` without a real `url` is
 * dropped by the normalizer.
 */

import type {
  SignalContentType,
  SignalMediaType,
  SignalSectionKey,
  SignalThumbnail,
  SignalVideoProvider,
} from "../types";

export type RawSignalItem = {
  /** Real article headline from the source. Never generated. */
  title: string;
  /** Canonical / resolvable link to the real article. Required. */
  url: string;
  /** Publisher name if the feed provides it. */
  sourceName?: string;
  /** Bare domain if known. */
  domain?: string;
  /** ISO timestamp or any Date-parseable string from the feed. */
  publishedAt?: string;
  /** Source's own snippet/description (used verbatim as the summary). */
  snippet?: string;
  /** Topic hint the provider can attach (e.g. a Google News topic query). */
  topic?: string;
  /** City/region scope for local items. */
  region?: string;
  contentType?: SignalContentType;
  tags?: string[];
  /** Which provider produced this (for debugging + dedupe tie-breaks). */
  providerId: string;

  // ── Media (optional; populated by RSS/YouTube/markets providers) ──
  mediaType?: SignalMediaType;
  /** Real lead image extracted from the feed (never invented). */
  thumbnail?: SignalThumbnail;
  /** Raw thumbnail URL when the provider only has a bare URL (normalizer wraps it). */
  thumbnailUrl?: string;
  videoUrl?: string;
  videoProvider?: SignalVideoProvider;
  channelName?: string;
  duration?: string;
  marketTag?: string;
};

export type SignalProviderRequest = {
  /** Followed topics, used by topic/world providers. */
  topics?: string[];
  /** Resolved location for local providers. */
  location?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
  };
  /** Language/region hint for feeds that support it (e.g. "en", "zh-TW"). */
  lang?: string;
  /** Soft cap on items to return per provider. */
  limit?: number;
  /** Include the (opt-in) YouTube video provider this run. */
  includeVideo?: boolean;
  /** Include the (opt-in) source-grounded markets provider this run. */
  includeMarkets?: boolean;
  /** Arbitrary RSS/Atom feed URLs from the user's custom topics. */
  customRssFeeds?: string[];
  /** Abort signal so the API route can enforce an overall timeout. */
  signal?: AbortSignal;
};

export type SignalProvider = {
  /** Stable id, e.g. "hacker-news", "google-news-world". */
  id: string;
  label: string;
  /** Which page sections this provider is suited to feed. */
  sections: SignalSectionKey[];
  /** Whether this provider is wired to a real source (vs. a v2 stub). */
  live: boolean;
  fetch(req: SignalProviderRequest): Promise<RawSignalItem[]>;
};
