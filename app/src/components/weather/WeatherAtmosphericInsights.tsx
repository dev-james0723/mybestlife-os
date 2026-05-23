"use client";

import { Activity, MoveRight } from "lucide-react";

import type { CurrentWeather } from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

interface WeatherAtmosphericInsightsProps {
  copy: WeatherUiCopy;
  current: CurrentWeather;
}

export function WeatherAtmosphericInsights({
  copy,
  current,
}: WeatherAtmosphericInsightsProps) {
  return (
    <section
      className="weather-glass-dark space-y-5 p-6"
      aria-labelledby="weather-atmospheric-heading"
    >
      <header className="flex items-center gap-2 text-[var(--weather-text-primary)]">
        <Activity className="size-5 text-[var(--weather-accent-lime)]" aria-hidden />
        <h3
          id="weather-atmospheric-heading"
          className="text-base font-medium"
        >
          {copy.atmosphericInsightsTitle}
        </h3>
      </header>

      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--weather-text-secondary)]">
            {copy.metricVisibility}
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--weather-text-primary)]">
            {current.visibility != null ? `${current.visibility} km` : "—"}
          </dd>
          {current.visibility != null && current.visibility < 5 ? (
            <span className="mt-1 inline-block rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-red-200">
              Low Visibility
            </span>
          ) : null}
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--weather-text-secondary)]">
            {copy.metricPressure}
          </dt>
          <dd className="mt-1 flex items-center gap-1 text-xl font-semibold tabular-nums text-[var(--weather-text-primary)]">
            {current.pressure != null ? `${current.pressure} hPa` : "—"}
            {current.pressure != null ? (
              <MoveRight
                className="size-4 text-[var(--weather-accent-lime)]"
                aria-hidden
              />
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-[var(--weather-text-secondary)]">
            {copy.metricDewPoint}
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-[var(--weather-text-primary)]">
            {current.dewPoint != null ? `${current.dewPoint}°C` : "—"}
          </dd>
        </div>
      </dl>

      {/* Subtle sparkline placeholder — matches Stitch direction. */}
      <svg
        className="h-8 w-full opacity-60"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 10 Q 12.5 2, 25 10 T 50 10 T 75 10 T 100 10"
          fill="none"
          stroke="var(--weather-accent-lime)"
          strokeWidth="1.5"
        />
      </svg>
    </section>
  );
}
