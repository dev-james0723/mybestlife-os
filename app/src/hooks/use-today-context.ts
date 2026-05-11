"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useCalendarItems } from "@/hooks/use-calendar";
import {
  buildDayContext,
  itemsForDate,
} from "@/lib/calendar/projection";
import { detectConflicts, summarizeDay } from "@/lib/calendar/ai";
import type {
  ConflictWarning,
  DailySummary,
  DayContext,
} from "@/lib/calendar/types";

export type TodayContextState = {
  today: string;
  context: DayContext | null;
  summary: DailySummary | null;
  conflicts: ConflictWarning[];
  isLoadingCalendar: boolean;
  isLoadingSummary: boolean;
  isLoadingConflicts: boolean;
};

/**
 * Compose the "Today" surface: calendar projection + AI summary +
 * conflicts. AI calls are async-only so the TodayBlock can render a
 * skeleton for the summary while items and free windows show first.
 */
export function useTodayContext(): TodayContextState {
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const { data: items, isLoading: isLoadingCalendar } = useCalendarItems();

  const context = useMemo<DayContext | null>(() => {
    if (!items) return null;
    return buildDayContext(today, items);
  }, [items, today]);

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(true);

  useEffect(() => {
    if (!items) return;
    let cancelled = false;
    // Loading flags flip before async calls fire; this is the idiomatic
    // pattern for "kick off two fetches when items are ready".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingSummary(true);
    setIsLoadingConflicts(true);
    const todayItems = itemsForDate(items, today);
    void summarizeDay(today, todayItems).then((r) => {
      if (!cancelled) {
        setSummary(r);
        setIsLoadingSummary(false);
      }
    });
    void detectConflicts(todayItems).then((r) => {
      if (!cancelled) {
        setConflicts(r);
        setIsLoadingConflicts(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [items, today]);

  return {
    today,
    context,
    summary,
    conflicts,
    isLoadingCalendar,
    isLoadingSummary,
    isLoadingConflicts,
  };
}
