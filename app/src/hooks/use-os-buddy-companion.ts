"use client";

import { useCallback, useMemo, useRef } from "react";

import { useGratefulThings } from "@/hooks/use-grateful-things";
import { useIdeas } from "@/hooks/use-ideas";
import { useRecentJournalEntries } from "@/hooks/use-journal";
import { useQuotes } from "@/hooks/use-quotes";
import { useTodayContext } from "@/hooks/use-today-context";
import { useWeatherSummary } from "@/hooks/weather/use-weather-summary";
import {
  buildLocalOSBuddyCompanionResponse,
  compactOSBuddyText,
  isOSBuddyLocalOnlyKind,
  nextOSBuddyRecentKinds,
  normalizeOSBuddyCompanionResponse,
  selectOSBuddyCompanionKind,
  type OSBuddyCompactContext,
  type OSBuddyCompanionKind,
  type OSBuddyCompanionResponse,
  type OSBuddyMiniGame,
} from "@/lib/os-buddy/os-buddy-companion";
import type { CalendarItem } from "@/lib/calendar/types";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { Idea, JournalEntry } from "@/types/database";
import type { Quote } from "@/types/quote";

const OS_BUDDY_GAMES: OSBuddyMiniGame[] = ["pixel-catch", "focus-tap", "clean-desk", "play-ball"];

function itemPriority(item: CalendarItem): string | null {
  if ("priority" in item && typeof item.priority === "string") return item.priority;
  if ("free_priority" in item && typeof item.free_priority === "string") return item.free_priority;
  return null;
}

function itemOverdue(item: CalendarItem): boolean {
  return "overdue" in item && item.overdue === true;
}

function compactJournalEntry(entry: JournalEntry): string {
  return compactOSBuddyText(
    [entry.topic, entry.primaryEmotion, entry.nextTinyStep ? `next: ${entry.nextTinyStep}` : null]
      .filter(Boolean)
      .join(" - "),
    110,
  );
}

function compactIdea(idea: Idea): string {
  return compactOSBuddyText(idea.title || idea.content, 110);
}

function compactQuote(quote: Quote) {
  return {
    text: compactOSBuddyText(quote.quote_text, 200),
    author: quote.source_author ? compactOSBuddyText(quote.source_author, 80) : null,
    favorite: quote.is_favorite,
  };
}

function compactItems(items: CalendarItem[] | undefined) {
  return (items ?? []).slice(0, 8).map((item) => ({
    title: compactOSBuddyText(item.title, 90),
    sourceType: item.source_type,
    startTime: item.start_time,
    endTime: item.end_time,
    overdue: itemOverdue(item),
    priority: itemPriority(item),
  }));
}

export function useOSBuddyCompanion(params: {
  locale: AppLocale;
  buddyName: string;
}) {
  const today = useTodayContext();
  const weather = useWeatherSummary();
  const quotes = useQuotes();
  const recentJournal = useRecentJournalEntries(6);
  const ideas = useIdeas();
  const gratefulThings = useGratefulThings();
  const recentKindsRef = useRef<OSBuddyCompanionKind[]>([]);

  const context = useMemo<OSBuddyCompactContext>(() => {
    const weatherState = weather.state;
    return {
      locale: params.locale,
      buddyName: params.buddyName,
      today: today.today,
      schedule: {
        load: today.context?.load ?? null,
        itemCount: today.context?.items.length ?? 0,
        overdueCount: today.context?.overdue_count ?? 0,
        scheduledMinutes: today.context?.scheduled_minutes ?? 0,
        freeWindows: (today.context?.free_windows ?? []).slice(0, 5).map((window) => window.label),
        items: compactItems(today.context?.items),
      },
      weather:
        weatherState.status === "ok"
          ? {
              status: "ok",
              location: weatherState.summary.location,
              temperature: weatherState.summary.temperature,
              condition: weatherState.summary.condition,
              rainChance: weatherState.summary.rainChance,
              alertLevel: weatherState.summary.alert?.level ?? null,
              alertKey: weatherState.summary.alert?.titleKey ?? null,
            }
          : weatherState.status === "loading"
            ? { status: "loading" }
            : { status: "error" },
      quotes: (quotes.data ?? [])
        .map(compactQuote)
        .filter((quote) => quote.text.length > 0)
        .slice(0, 12),
      memories: {
        journal: (recentJournal.data ?? [])
          .map(compactJournalEntry)
          .filter(Boolean)
          .slice(0, 6),
        ideas: (ideas.data ?? [])
          .map(compactIdea)
          .filter(Boolean)
          .slice(0, 8),
        gratefulThings: (gratefulThings.data ?? [])
          .map((entry) => compactOSBuddyText(entry.content, 110))
          .filter(Boolean)
          .slice(0, 8),
      },
      games: OS_BUDDY_GAMES,
    };
  }, [
    gratefulThings.data,
    ideas.data,
    params.buddyName,
    params.locale,
    quotes.data,
    recentJournal.data,
    today.context,
    today.today,
    weather.state,
  ]);

  const rememberKind = useCallback((kind: OSBuddyCompanionKind) => {
    recentKindsRef.current = nextOSBuddyRecentKinds(recentKindsRef.current, kind);
  }, []);

  const getCompanionLine = useCallback(async (): Promise<OSBuddyCompanionResponse> => {
    const kind = selectOSBuddyCompanionKind({
      context,
      recentKinds: recentKindsRef.current,
    });

    const local = buildLocalOSBuddyCompanionResponse({ kind, context });

    if (isOSBuddyLocalOnlyKind(kind)) {
      rememberKind(local.kind);
      return local;
    }

    try {
      const response = await fetch("/api/os-buddy/companion-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, context }),
      });

      if (!response.ok) {
        const fallback = buildLocalOSBuddyCompanionResponse({
          kind,
          context,
          source: "fallback",
        });
        rememberKind(fallback.kind);
        return fallback;
      }

      const payload = (await response.json().catch(() => null)) as Partial<OSBuddyCompanionResponse> | null;
      const normalized = normalizeOSBuddyCompanionResponse(payload, local);
      rememberKind(normalized.kind);
      return normalized;
    } catch {
      const fallback = buildLocalOSBuddyCompanionResponse({
        kind,
        context,
        source: "fallback",
      });
      rememberKind(fallback.kind);
      return fallback;
    }
  }, [context, rememberKind]);

  return { context, getCompanionLine };
}
