"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppStore } from "@/stores/app-store";
import { getSignalsUiCopy } from "@/lib/i18n/signals-ui";
import {
  clearCandidatesCache,
  fetchSignalCandidates,
} from "@/lib/signals/client-fetch";
import { customTopicRssFeeds } from "@/lib/signals/custom-topics";
import { deriveRelevance } from "@/lib/signals/relevance";
import { selectDailyTop3Signals } from "@/lib/signals/scoring";
import { dedupeThumbnails } from "@/lib/signals/thumbnails";
import { capWidgetSignals } from "@/lib/signals/widget";
import type { SignalItem, SignalsDataSource } from "@/lib/signals/types";
import { useSignalsPreferences } from "./use-signals-preferences";
import { useLifeOsContext } from "./use-life-os-context";

export type SignalsSummaryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; items: SignalItem[]; dataSource: SignalsDataSource; onboarded: boolean };

export type UseSignalsSummaryReturn = {
  state: SignalsSummaryState;
  refresh: () => void;
};

/**
 * Dashboard "Today's Signals" widget data — reads the SAME cached candidate
 * pool as the page (via `fetchSignalCandidates`) and applies the SAME
 * deterministic Top-3 selection, so the widget never drifts from the page (§9).
 * Returns at most 3 items (enforced by `capWidgetSignals`).
 */
export function useSignalsSummary(): UseSignalsSummaryReturn {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getSignalsUiCopy(language), [language]);
  const { prefs, ready } = useSignalsPreferences();
  const ctx = useLifeOsContext(prefs);

  const [state, setState] = useState<SignalsSummaryState>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const topicsKey = prefs.followedTopics.join(",");
  const cityKey = prefs.localLocation?.city ?? "";
  const rssFeeds = useMemo(
    () => customTopicRssFeeds(prefs.customTopics),
    [prefs.customTopics],
  );
  const rssKey = rssFeeds.join(",");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchSignalCandidates({
      topics: prefs.followedTopics,
      location: prefs.localLocation,
      lang: language,
      force: refreshKey > 0,
      includeMarkets: prefs.marketsEnabled,
      includeVideo: prefs.videoEnabled,
      customRssFeeds: rssFeeds,
    })
      .then((result) => {
        if (cancelled || !mountedRef.current) return;
        const top3 = capWidgetSignals(
          selectDailyTop3Signals(dedupeThumbnails(result.items), prefs, ctx),
        ).map((item) => {
          const { basis, term } = deriveRelevance(item, prefs, ctx, "top3");
          return {
            ...item,
            relevanceBasis: basis,
            whyRelevantToUser: copy.relevanceReason[basis](term),
          };
        });
        setState({
          status: "ok",
          items: top3,
          dataSource: result.dataSource,
          onboarded: prefs.onboardingCompleted,
        });
      })
      .catch(() => {
        if (cancelled || !mountedRef.current) return;
        setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    topicsKey,
    cityKey,
    language,
    refreshKey,
    prefs.marketsEnabled,
    prefs.videoEnabled,
    rssKey,
  ]);

  const refresh = useCallback(() => {
    clearCandidatesCache();
    setState({ status: "loading" });
    setRefreshKey((k) => k + 1);
  }, []);

  return { state, refresh };
}
