"use client";

import { useMemo, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";

import { OSSegmentedControl } from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import type {
  DailyForecastConfidence,
  DailyForecastEntry,
  HourlyForecastEntry,
  WeatherConditionCode,
} from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

interface WeatherForecastTabsProps {
  copy: WeatherUiCopy;
  hourly: HourlyForecastEntry[];
  daily: DailyForecastEntry[];
}

type TabKey = "today" | "7d" | "10d" | "15d";

export function WeatherForecastTabs({
  copy,
  hourly,
  daily,
}: WeatherForecastTabsProps) {
  const [tab, setTab] = useState<TabKey>("today");

  const tabs = useMemo<{ id: TabKey; label: string }[]>(
    () => [
      { id: "today", label: copy.forecastToday },
      { id: "7d", label: copy.forecast7Days },
      { id: "10d", label: copy.forecast10Days },
      { id: "15d", label: copy.forecast15Days },
    ],
    [copy],
  );

  const daysForTab = useMemo(() => {
    const limit = tab === "7d" ? 7 : tab === "10d" ? 10 : tab === "15d" ? 15 : 0;
    return daily.slice(0, limit);
  }, [tab, daily]);

  return (
    <section
      className="weather-glass-dark relative space-y-5 p-6"
      aria-labelledby="weather-forecast-heading"
    >
      <header className="flex items-center justify-between">
        <h3
          id="weather-forecast-heading"
          className="sr-only"
        >
          Forecast
        </h3>
        <OSSegmentedControl
          items={tabs}
          value={tab}
          onValueChange={setTab}
          ariaLabel="Forecast horizon"
          className="w-full sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none"
          layoutId="weather-forecast-horizon-active-pill"
        />
      </header>

      {tab === "today" ? (
        <HourlyStrip hourly={hourly} />
      ) : (
        <>
          <DailyList copy={copy} days={daysForTab} />
          {daysForTab.some((d) => d.confidence !== "high") ? (
            <p className="text-xs text-[var(--weather-text-muted)]">
              {copy.extendedOutlookNotice}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function HourlyStrip({ hourly }: { hourly: HourlyForecastEntry[] }) {
  if (hourly.length === 0) {
    return (
      <p className="text-sm text-[var(--weather-text-secondary)]">
        Hourly forecast unavailable.
      </p>
    );
  }
  return (
    <div className="flex gap-8 overflow-x-auto pb-2">
      {hourly.slice(0, 8).map((h, i) => (
        <div
          key={h.time}
          className="flex min-w-[60px] flex-col items-center gap-2"
        >
          <span className="text-xs text-[var(--weather-text-secondary)]">
            {i === 0 ? "Now" : h.hourLabel}
          </span>
          <ConditionIcon
            code={h.conditionCode}
            className={cn(
              "size-7",
              i === 0
                ? "text-[var(--weather-accent-lime)] drop-shadow-[0_0_8px_rgba(200,229,58,0.5)]"
                : "text-[var(--weather-text-primary)]",
            )}
          />
          <span className="text-lg font-semibold text-[var(--weather-text-primary)]">
            {h.temperature}°
          </span>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--weather-accent-lime)]"
              style={{ width: `${Math.min(100, h.rainChance)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyList({
  copy,
  days,
}: {
  copy: WeatherUiCopy;
  days: DailyForecastEntry[];
}) {
  if (days.length === 0) {
    return (
      <p className="text-sm text-[var(--weather-text-secondary)]">
        Forecast unavailable for this horizon.
      </p>
    );
  }
  // Compute global temp range so we can render a consistent track.
  const allHighs = days.map((d) => d.high);
  const allLows = days.map((d) => d.low);
  const globalHi = Math.max(...allHighs);
  const globalLo = Math.min(...allLows);

  return (
    <ul className="space-y-1.5">
      {days.map((d) => {
        const isExtended = d.confidence !== "high";
        return (
          <li
            key={d.date}
            className={cn(
              "flex items-center gap-4 rounded-lg px-3 py-2 text-sm",
              isExtended
                ? "border border-dashed border-[var(--weather-glass-border-subtle)] opacity-85"
                : "bg-white/5",
            )}
          >
            <span className="w-12 font-medium text-[var(--weather-text-primary)]">
              {d.dayLabel}
            </span>
            <ConditionIcon
              code={d.conditionCode}
              className="size-5 shrink-0 text-[var(--weather-accent-lime)]"
            />
            <span className="hidden flex-1 truncate text-[var(--weather-text-secondary)] sm:block">
              {d.condition}
            </span>
            <span className="hidden tabular-nums text-[var(--weather-text-secondary)] md:inline-block">
              {d.rainChance}%
            </span>
            <TempRangeTrack
              low={d.low}
              high={d.high}
              globalLo={globalLo}
              globalHi={globalHi}
            />
            <span className="ml-2 hidden text-xs sm:inline-block">
              <ConfidenceTag copy={copy} confidence={d.confidence} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TempRangeTrack({
  low,
  high,
  globalLo,
  globalHi,
}: {
  low: number;
  high: number;
  globalLo: number;
  globalHi: number;
}) {
  const range = Math.max(1, globalHi - globalLo);
  const start = ((low - globalLo) / range) * 100;
  const end = ((high - globalLo) / range) * 100;
  return (
    <div className="flex flex-1 items-center gap-2">
      <span className="w-7 text-right text-xs tabular-nums text-[var(--weather-text-secondary)]">
        {low}°
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 rounded-full bg-gradient-to-r from-blue-400 via-[var(--weather-accent-lime)] to-orange-400"
          style={{ left: `${start}%`, right: `${100 - end}%` }}
        />
      </div>
      <span className="w-7 text-xs tabular-nums text-[var(--weather-text-primary)]">
        {high}°
      </span>
    </div>
  );
}

function ConfidenceTag({
  copy,
  confidence,
}: {
  copy: WeatherUiCopy;
  confidence: DailyForecastConfidence;
}) {
  const label =
    confidence === "high"
      ? copy.confidenceHigh
      : confidence === "medium"
        ? copy.confidenceMedium
        : copy.confidenceLow;
  const cls =
    confidence === "high"
      ? "bg-[var(--weather-accent-lime-bg)] text-[var(--weather-accent-lime)] border-[color-mix(in_srgb,var(--weather-accent-lime)_30%,transparent)]"
      : confidence === "medium"
        ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
        : "bg-white/5 text-[var(--weather-text-muted)] border-white/10";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function ConditionIcon({
  code,
  className,
}: {
  code: WeatherConditionCode;
  className?: string;
}) {
  switch (code) {
    case "clear-day":
      return <Sun className={className} />;
    case "clear-night":
      return <Moon className={className} />;
    case "partly-cloudy-day":
      return <CloudSun className={className} />;
    case "partly-cloudy-night":
      return <Cloud className={className} />;
    case "cloudy":
      return <Cloud className={className} />;
    case "fog":
      return <CloudFog className={className} />;
    case "light-rain":
    case "rain":
    case "heavy-rain":
      return <CloudRain className={className} />;
    case "thunderstorm":
      return <CloudLightning className={className} />;
    case "snow":
    case "sleet":
      return <CloudSnow className={className} />;
    default:
      return <Cloud className={className} />;
  }
}
