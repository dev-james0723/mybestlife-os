"use client";

import { useMemo } from "react";
import { CloudRain } from "lucide-react";

import { cn } from "@/lib/utils";
import type { HourlyForecastEntry } from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

interface WeatherRainIntensityProps {
  copy: WeatherUiCopy;
  hourly: HourlyForecastEntry[];
}

type Bucket = "LIGHT" | "MOD" | "HEAVY" | "NONE";

/**
 * 4-block horizontal heatmap of the next 4 hourly buckets, each labelled
 * LIGHT / MOD / HEAVY / NONE. Mirrors the Stitch prototype's
 * "Precipitation Intensity" card.
 */
export function WeatherRainIntensity({ copy, hourly }: WeatherRainIntensityProps) {
  const buckets = useMemo(() => bucketize(hourly), [hourly]);

  return (
    <section
      className="weather-glass-dark space-y-5 p-6"
      aria-labelledby="weather-rain-intensity-heading"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--weather-text-primary)]">
          <CloudRain
            className="size-5 text-[var(--weather-accent-lime)]"
            aria-hidden
          />
          <h3
            id="weather-rain-intensity-heading"
            className="text-base font-medium"
          >
            {copy.precipitationIntensityTitle}
          </h3>
        </div>
        <span className="text-xs text-[var(--weather-text-secondary)]">
          Next 4h
        </span>
      </header>

      <div className="flex h-12 gap-1.5">
        {buckets.map((b, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-1 items-center justify-center rounded-lg text-[10px] font-semibold uppercase tracking-wider",
              bucketClass(b.label),
            )}
            aria-label={`${b.hourLabel}: ${b.label.toLowerCase()} precipitation`}
          >
            {b.label}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs tabular-nums text-[var(--weather-text-secondary)]">
        {buckets.map((b, i) => (
          <span key={i}>{b.hourLabel}</span>
        ))}
      </div>
    </section>
  );
}

function bucketize(
  hourly: HourlyForecastEntry[],
): Array<{ label: Bucket; hourLabel: string }> {
  return hourly.slice(0, 4).map((h) => {
    let label: Bucket = "NONE";
    if (h.rainChance >= 70) label = "HEAVY";
    else if (h.rainChance >= 40) label = "MOD";
    else if (h.rainChance >= 15) label = "LIGHT";
    if (h.conditionCode === "heavy-rain" || h.conditionCode === "thunderstorm") {
      label = "HEAVY";
    }
    return { label, hourLabel: h.hourLabel };
  });
}

function bucketClass(label: Bucket): string {
  switch (label) {
    case "HEAVY":
      return "bg-[var(--weather-accent-lime)] text-black";
    case "MOD":
      return "bg-[var(--weather-accent-lime)]/40 border border-[var(--weather-accent-lime)]/30 text-[var(--weather-text-primary)]";
    case "LIGHT":
      return "bg-white/10 border border-white/15 text-[var(--weather-text-secondary)]";
    case "NONE":
      return "bg-white/5 border border-white/10 text-[var(--weather-text-muted)]";
  }
}
