"use client";

/**
 * Weather badge — display-only glass pill between the search and the
 * utility pill. Intentionally non-interactive (no dropdown, no forecast)
 * per the liquid-glass spec.
 *
 * Falls back to a muted "Weather unavailable" badge whenever any part of
 * the pipeline fails (no key, no location, network error) so the top bar
 * never "breaks".
 */

import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Moon,
  CloudOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useWeather } from "@/hooks/use-weather";

type Props = {
  className?: string;
  /** Hide the description on narrow viewports. */
  compact?: boolean;
};

function WeatherGlyph({ main, icon }: { main: string; icon: string }) {
  const isNight = icon.endsWith("n");
  const cls = "h-4 w-4 opacity-85";
  switch (main) {
    case "Clear":
      return isNight ? <Moon className={cls} /> : <Sun className={cls} />;
    case "Clouds":
      return isNight ? <Cloud className={cls} /> : <CloudSun className={cls} />;
    case "Rain":
      return <CloudRain className={cls} />;
    case "Drizzle":
      return <CloudDrizzle className={cls} />;
    case "Thunderstorm":
      return <CloudLightning className={cls} />;
    case "Snow":
      return <CloudSnow className={cls} />;
    case "Mist":
    case "Fog":
    case "Haze":
    case "Smoke":
      return <CloudFog className={cls} />;
    default:
      return <Cloud className={cls} />;
  }
}

export function WeatherBadge({ className, compact = false }: Props) {
  const { result } = useWeather();

  if (!result) {
    return (
      <div
        className={cn("topbar-weather-badge", className)}
        aria-label="Weather loading"
      >
        <span className="inline-flex items-center gap-2 animate-pulse">
          <Cloud className="h-4 w-4 opacity-85" />
          <span className="opacity-85">—</span>
        </span>
      </div>
    );
  }

  if (result.status !== "ok") {
    return (
      <div
        className={cn("topbar-weather-badge", className)}
        role="status"
        aria-label="Weather unavailable"
        title="Weather unavailable"
      >
        <CloudOff className="h-4 w-4 opacity-85" />
        <span className="hidden opacity-90 sm:inline">Weather unavailable</span>
        <span className="opacity-90 sm:hidden">N/A</span>
      </div>
    );
  }

  return (
    <div
      className={cn("topbar-weather-badge", className)}
      role="status"
      aria-label={`Weather: ${result.description}, ${result.tempC} degrees Celsius`}
      title={result.city ? `${result.city} • ${result.description}` : result.description}
    >
      <WeatherGlyph main={result.main} icon={result.icon} />
      <span className="font-semibold tabular-nums">{result.tempC}°C</span>
      {!compact ? (
        <span className="hidden opacity-95 md:inline">{result.description}</span>
      ) : null}
    </div>
  );
}
