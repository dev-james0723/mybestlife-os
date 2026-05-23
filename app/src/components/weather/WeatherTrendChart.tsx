"use client";

import dynamic from "next/dynamic";
import { CloudRain, Thermometer } from "lucide-react";

import type { HourlyForecastEntry } from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

const ChartInner = dynamic(() => import("./WeatherTrendChartInner"), {
  ssr: false,
  loading: () => <div className="h-44 w-full animate-pulse rounded-md bg-white/5" />,
});

interface WeatherTrendChartProps {
  copy: WeatherUiCopy;
  hourly: HourlyForecastEntry[];
  /** Which series to render. */
  kind: "temperature" | "precipitation";
}

export function WeatherTrendChart({ copy, hourly, kind }: WeatherTrendChartProps) {
  const title =
    kind === "temperature"
      ? copy.temperatureTrendTitle
      : copy.precipitationTrendTitle;
  const Icon = kind === "temperature" ? Thermometer : CloudRain;
  return (
    <section
      className="weather-glass-dark space-y-4 p-6"
      aria-labelledby={`weather-trend-${kind}-heading`}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--weather-text-primary)]">
          <Icon
            className="size-5 text-[var(--weather-accent-lime)]"
            aria-hidden
          />
          <h3
            id={`weather-trend-${kind}-heading`}
            className="text-base font-medium"
          >
            {title}
          </h3>
        </div>
        <span className="text-xs text-[var(--weather-text-secondary)]">
          {copy.next24h}
        </span>
      </header>
      <ChartInner hourly={hourly} kind={kind} />
    </section>
  );
}
