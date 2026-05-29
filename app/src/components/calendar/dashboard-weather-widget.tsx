"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { ChevronRight, CloudOff, RotateCw, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { getWeatherWidgetCopy } from "@/lib/i18n/weather-widget-ui";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useWeatherSummary } from "@/hooks/weather/use-weather-summary";
import { buildWeatherSuggestion } from "@/lib/weather/widget-suggestion";
import { resolveWeatherAnimationKey } from "@/lib/weather/lottie-animation";
import { WeatherLottie } from "@/components/weather/WeatherLottie";
import type { WeatherAlert } from "@/lib/weather/widget-summary";
import type { DayLoad } from "@/lib/calendar/types";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  load: DayLoad;
  hasOutdoorEvents: boolean;
  className?: string;
};

const CARD_BASE =
  "block rounded-xl border border-border/60 bg-card/70 px-4 py-3.5 text-left shadow-sm";

/**
 * Compact "today" weather summary inside the dashboard Today card.
 *
 * A decision hint, not a weather app: current temperature, a one-line
 * private-assistant suggestion, and up to three rain metrics. Tapping the
 * card opens the full Weather page. Reuses `useWeatherSummary` (same data
 * source as the Weather page) and degrades to loading / error states.
 */
export function DashboardWeatherWidget({ load, hasOutdoorEvents, className }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getWeatherWidgetCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const weatherHref = useLocalizedPath("/weather");

  const { state, refresh } = useWeatherSummary();

  if (state.status === "loading") {
    return (
      <div className={cn(CARD_BASE, className)} aria-busy="true">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="mt-3 h-3.5 w-[90%]" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={cn(CARD_BASE, className)}>
        <div className="flex items-center gap-2.5">
          <CloudOff className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{copy.unavailableTitle}</p>
            <p className="truncate text-xs text-muted-foreground">{copy.unavailableHint}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/40"
          >
            <RotateCw className="h-3 w-3" />
            {copy.retry}
          </button>
          <Link
            href={weatherHref}
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {copy.openWeatherPage}
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  const { summary } = state;
  const suggestion = buildWeatherSuggestion({
    summary,
    load,
    hasOutdoorEvents,
    locale: language,
  });

  const nextRainLabel = summary.nextRainTime
    ? format(parseISO(summary.nextRainTime), "h aa", { locale: dateLocale })
    : copy.none;

  return (
    <Link
      href={weatherHref}
      prefetch={false}
      aria-label={copy.ariaOpen}
      className={cn(
        CARD_BASE,
        "transition-[transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Live condition animation — the visual anchor of the card. */}
        <WeatherLottie
          mode="icon"
          animationKey={resolveWeatherAnimationKey({
            conditionCode: summary.conditionCode,
          })}
          className="-ml-1 size-28 shrink-0 sm:size-44"
        />

        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Temperature + condition/location/feels-like + chevron */}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
                  {summary.temperature}°C
                </span>
                {summary.alert && <AlertPill alert={summary.alert} label={copy.alertTitles[summary.alert.titleKey]} />}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {summary.condition} · {summary.location} · {copy.feelsLike(summary.feelsLike)}
              </p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/60" />
          </div>

          {/* AI suggestion — the most useful line */}
          <p className="line-clamp-2 text-sm leading-snug text-foreground/85">
            {suggestion}
          </p>

          {/* Mini metrics: rain chance, amount, next rain window */}
          <div className="flex flex-wrap gap-1.5">
            <MetricPill label={copy.rainLabel} value={`${summary.rainChance}%`} />
            <MetricPill label={copy.amountLabel} value={`${summary.precipitationMm}mm`} />
            <MetricPill label={copy.nextLabel} value={nextRainLabel} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[11px] font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground/90">{value}</span>
    </span>
  );
}

function AlertPill({ alert, label }: { alert: WeatherAlert; label: string }) {
  const tone =
    alert.level === "severe"
      ? "border-rose-400/40 bg-rose-500/15 text-rose-700 dark:text-rose-300"
      : "border-amber-400/40 bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      <TriangleAlert className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

