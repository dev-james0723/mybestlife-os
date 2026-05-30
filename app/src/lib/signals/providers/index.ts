/**
 * Signals — provider registry + candidate aggregation.
 *
 * Runs the enabled live providers concurrently (each isolated with try/catch so
 * one failure can't sink the rest), normalizes their raw items into canonical
 * `SignalItem`s, and dedupes/clusters cross-source duplicates.
 *
 * This is the Tier-A "shared candidate pool" build (§14), simplified for MVP:
 * run on demand inside the API route rather than a daily cron + DB cache.
 *
 * TODO(v2): move this behind a Vercel cron that writes `signal_items` +
 * `signal_summaries` once per day, so per-user selection (Tier B) only reads
 * cached rows. Add GDELT + official-alert providers to the registry.
 */

import { enrichSignalItems } from "../article-metadata";
import { dedupeSignals, normalizeSignalItem } from "../normalize";
import { onlySignalsWithRealThumbnails } from "../thumbnails";
import type { SignalItem } from "../types";
import { gdeltProvider } from "./gdelt";
import { marketsProvider } from "./markets";
import {
  publisherLocalProvider,
  publisherTopicProvider,
  publisherWorldProvider,
} from "./publisher-feeds";
import { customRssProvider } from "./rss";
import { youtubeVideoProvider } from "./youtube";
import type { SignalProvider, SignalProviderRequest } from "./types";

/**
 * All known providers (live + stubbed). The opt-in providers (markets, video,
 * custom RSS) self-gate on request flags so they cost nothing when disabled.
 */
export const ALL_PROVIDERS: SignalProvider[] = [
  publisherWorldProvider,
  publisherTopicProvider,
  publisherLocalProvider,
  marketsProvider,
  youtubeVideoProvider,
  customRssProvider,
  gdeltProvider,
];

export const LIVE_PROVIDERS = ALL_PROVIDERS.filter((p) => p.live);

export type AggregateResult = {
  items: SignalItem[];
  providersTried: string[];
  providersSucceeded: string[];
  providersFailed: string[];
};

/**
 * Fetch from all live providers, normalize + dedupe. Never throws: failures are
 * recorded and the partial result is returned (graceful degradation, §4).
 */
export async function aggregateCandidates(
  req: SignalProviderRequest,
): Promise<AggregateResult> {
  const nowIso = new Date().toISOString();
  const providersTried: string[] = [];
  const providersSucceeded: string[] = [];
  const providersFailed: string[] = [];

  const settled = await Promise.allSettled(
    LIVE_PROVIDERS.map(async (provider) => {
      providersTried.push(provider.id);
      const raw = await provider.fetch(req);
      return { providerId: provider.id, raw };
    }),
  );

  const normalized: SignalItem[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      providersSucceeded.push(result.value.providerId);
      for (const raw of result.value.raw) {
        const item = normalizeSignalItem(raw, { nowIso });
        if (item) normalized.push(item);
      }
    } else {
      providersFailed.push(String(result.reason));
    }
  }

  const deduped = dedupeSignals(normalized);
  // OG backfill only for stragglers (e.g. Hacker News) — publisher RSS already ships images.
  const enriched = await enrichSignalItems(deduped, {
    maxItems: 20,
    concurrency: 5,
    signal: req.signal,
  });
  const items = onlySignalsWithRealThumbnails(enriched);

  return {
    items,
    providersTried,
    providersSucceeded,
    providersFailed,
  };
}
