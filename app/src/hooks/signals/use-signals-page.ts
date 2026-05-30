"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppStore } from "@/stores/app-store";
import { getSignalsUiCopy } from "@/lib/i18n/signals-ui";
import {
  clearCandidatesCache,
  fetchSignalCandidates,
  type CandidatesResult,
} from "@/lib/signals/client-fetch";
import { customTopicRssFeeds } from "@/lib/signals/custom-topics";
import { deriveRelevance } from "@/lib/signals/relevance";
import {
  buildDeterministicOverview,
  fetchSignalOverviews,
  isOverviewWorthyText,
  type OverviewResult,
} from "@/lib/signals/overview";
import { prepareSignalDisplayPool } from "@/lib/signals/thumbnails";
import {
  selectDailyTop3Signals,
  selectLocalSignals,
  selectMarketsSignals,
  selectPersonalSignals,
  selectVideoSignals,
  selectWorldSignals,
} from "@/lib/signals/scoring";
import type {
  LifeOsContext,
  SignalItem,
  SignalSectionKey,
  SignalsPageData,
  SignalsPreferences,
} from "@/lib/signals/types";

export type UseSignalsPageReturn = {
  data: SignalsPageData;
  /** "Refresh latest sources" — force a new candidate fetch (+ demo rotation). */
  refreshSources: () => void;
  /** "Regenerate my Top 3" — re-rank/personalize the existing pool. */
  regenerateTop3: () => void;
  refreshing: boolean;
  regenerating: boolean;
};

const IDLE_DATA: SignalsPageData = {
  status: "idle",
  dataSource: "live",
  top3: [],
  world: [],
  local: [],
  personal: [],
  markets: [],
  video: [],
  pool: [],
  location: null,
  generatedAt: null,
};

/**
 * Orchestrates the Signals page: fetches the shared candidate pool (cached),
 * then runs the DETERMINISTIC ranking + section selection client-side against
 * the user's local Life OS context, attaches a truthful "why" + a
 * source-grounded AI overview to each card, and exposes the full ranked pool
 * for the Grid/Table/Compact/Gallery views (so view switches + gallery rotation
 * never hit the network).
 *
 * Two distinct refresh actions (§ refresh): `refreshSources` forces a new fetch
 * (rotating the demo pool when live providers are thin, so the change is
 * visible), and `regenerateTop3` re-ranks the existing pool (rotating within
 * score ties) without any network call.
 */
export function useSignalsPage(
  prefs: SignalsPreferences,
  ctx: LifeOsContext,
  enabled: boolean,
): UseSignalsPageReturn {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getSignalsUiCopy(language), [language]);

  const [candidates, setCandidates] = useState<CandidatesResult | null>(null);
  const [status, setStatus] = useState<SignalsPageData["status"]>("idle");
  const [refreshing, setRefreshing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [regenSeed, setRegenSeed] = useState(0);
  const [overviewMap, setOverviewMap] = useState<Record<string, OverviewResult>>({});
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Stable request signature so we only refetch when inputs really change.
  const topicsKey = prefs.followedTopics.join(",");
  const cityKey = prefs.localLocation?.city ?? "";
  const rssFeeds = useMemo(
    () => customTopicRssFeeds(prefs.customTopics),
    [prefs.customTopics],
  );
  const rssKey = rssFeeds.join(",");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus((prev) => (prev === "ok" ? "ok" : "loading"));
    fetchSignalCandidates({
      topics: prefs.followedTopics,
      location: prefs.localLocation,
      lang: language,
      force: refreshSeed > 0,
      includeMarkets: prefs.marketsEnabled,
      includeVideo: prefs.videoEnabled,
      customRssFeeds: rssFeeds,
      rotateSeed: refreshSeed,
    })
      .then((result) => {
        if (cancelled || !mountedRef.current) return;
        setCandidates(result);
        setStatus("ok");
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        setStatus("error");
      })
      .finally(() => {
        if (cancelled || !mountedRef.current) return;
        setRefreshing(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    topicsKey,
    cityKey,
    language,
    refreshSeed,
    prefs.marketsEnabled,
    prefs.videoEnabled,
    rssKey,
  ]);

  const refreshSources = useCallback(() => {
    clearCandidatesCache();
    setRefreshing(true);
    setRefreshSeed((k) => k + 1);
  }, []);

  const regenerateTop3 = useCallback(() => {
    setRegenerating(true);
    setRegenSeed((k) => k + 1);
    // No network — clear the regenerating flag on the next frame.
    window.setTimeout(() => {
      if (mountedRef.current) setRegenerating(false);
    }, 350);
  }, []);

  const data = useMemo<SignalsPageData>(() => {
    if (!enabled) return IDLE_DATA;
    if (!candidates) {
      return { ...IDLE_DATA, status: status === "error" ? "error" : "loading" };
    }

    // Dedupe repeated REAL thumbnails up-front so no image shows twice anywhere.
    const poolItems = prepareSignalDisplayPool(candidates.items);

    const sectionOf = new Map<string, SignalSectionKey>();
    const attach = (item: SignalItem, section: SignalSectionKey): SignalItem => {
      const { basis, term } = deriveRelevance(item, prefs, ctx, section);
      const overlay = overviewMap[item.id];
      const det = buildDeterministicOverview(item, language);
      return {
        ...item,
        relevanceBasis: basis,
        whyRelevantToUser: copy.relevanceReason[basis](term),
        aiOverview: overlay?.overview ?? det.text,
        aiOverviewGrounded: overlay?.grounded ?? det.grounded,
        suggestedAction:
          item.suggestedAction ?? (item.isDemo ? undefined : copy.card.save),
      };
    };

    const top3 = selectDailyTop3Signals(poolItems, prefs, ctx, { regenSeed }).map((s) => {
      sectionOf.set(s.id, "top3");
      return attach(s, "top3");
    });
    const exclude = new Set(top3.map((s) => s.id));

    const world = selectWorldSignals(poolItems, prefs, ctx, exclude).map((s) => {
      sectionOf.set(s.id, "world");
      return attach(s, "world");
    });
    world.forEach((s) => exclude.add(s.id));

    const local = selectLocalSignals(poolItems, prefs, ctx, exclude).map((s) => {
      sectionOf.set(s.id, "local");
      return attach(s, "local");
    });
    local.forEach((s) => exclude.add(s.id));

    const personal = selectPersonalSignals(poolItems, prefs, ctx, exclude).map((s) => {
      sectionOf.set(s.id, "personal");
      return attach(s, "personal");
    });
    personal.forEach((s) => exclude.add(s.id));

    const markets = prefs.marketsEnabled
      ? selectMarketsSignals(poolItems, prefs, ctx).map((s) => {
          if (!sectionOf.has(s.id)) sectionOf.set(s.id, "markets");
          return attach(s, "markets");
        })
      : [];

    const video = prefs.videoEnabled
      ? selectVideoSignals(poolItems, prefs, ctx).map((s) => {
          if (!sectionOf.has(s.id)) sectionOf.set(s.id, "video");
          return attach(s, "video");
        })
      : [];

    // Full ranked pool (for Grid/Table/Compact/Gallery + filtering). Each item
    // is tagged with the section it best belongs to for honest "why" copy.
    const pool = poolItems.map((item) => attach(item, sectionOf.get(item.id) ?? "world"));

    return {
      status: "ok",
      dataSource: candidates.dataSource,
      top3,
      world,
      local,
      personal,
      markets,
      video,
      pool,
      location: ctx.location,
      generatedAt: candidates.generatedAt,
    };
  }, [enabled, candidates, prefs, ctx, copy, status, regenSeed, overviewMap, language]);

  // Best-effort AI overviews for visible cards (cached; never blocks UI).
  const overviewKey = [
    ...data.top3,
    ...data.world.slice(0, 8),
    ...data.personal.slice(0, 6),
  ]
    .map((s) => s.id)
    .join(",");
  useEffect(() => {
    if (!enabled || data.dataSource === "demo") return;
    const seen = new Set<string>();
    const candidates = [...data.top3, ...data.world, ...data.personal].filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    const worthy = candidates.filter(
      (s) => isOverviewWorthyText(s.summary) || (s.headline?.trim().length ?? 0) >= 20,
    );
    if (worthy.length === 0) return;
    let cancelled = false;
    fetchSignalOverviews(
      worthy.slice(0, 12).map((s) => ({
        id: s.id,
        headline: s.headline,
        snippet: isOverviewWorthyText(s.summary)
          ? s.summary
          : `${s.headline}. Source: ${s.source.name}.`,
        topic: s.topic,
        sourceName: s.source.name,
      })),
      language,
    ).then((map) => {
      if (cancelled || !mountedRef.current) return;
      if (Object.keys(map).length > 0) setOverviewMap((prev) => ({ ...prev, ...map }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, overviewKey, language, data.dataSource]);

  return { data, refreshSources, regenerateTop3, refreshing, regenerating };
}
