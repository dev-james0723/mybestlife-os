"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/lib/theme-context";

import { WeatherAtmosphericInsights } from "@/components/weather/WeatherAtmosphericInsights";
import { WeatherBackgroundScene } from "@/components/weather/WeatherBackgroundScene";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { WeatherImpactPanel } from "@/components/weather/WeatherImpactPanel";
import { WeatherMetricsGrid } from "@/components/weather/WeatherMetricsGrid";
import { WeatherRainIntensity } from "@/components/weather/WeatherRainIntensity";
import { WeatherSmartReminders } from "@/components/weather/WeatherSmartReminders";
import { WeatherTopBar } from "@/components/weather/WeatherTopBar";

import { useWeatherPage } from "@/hooks/weather/use-weather-page";
import { getWeatherUiCopy } from "@/lib/i18n/weather-ui";
import { useAppStore } from "@/stores/app-store";
import { requestDeviceGeolocation } from "@/lib/weather/openweather";
import { cn } from "@/lib/utils";

/**
 * Cinematic, full-bleed Weather page. Sits under Command Center between
 * Calendar and Analytics. Phase B lands the background scene + hero +
 * location search; Phases C/D fill in metric cards, radar, charts and
 * forecast tabs. The workspace deliberately bypasses PageShell so the
 * cinematic background can extend edge-to-edge.
 */
export default function WeatherPage() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getWeatherUiCopy(language), [language]);
  const { colorMode } = useTheme();

  const { data, scene, insight, refresh, setSelectedLocation } = useWeatherPage();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleUseMyLocation = async () => {
    const coords = await requestDeviceGeolocation();
    if (!coords) return;
    setSelectedLocation({
      name: "Current location",
      city: "Current location",
      country: "",
      latitude: coords.lat,
      longitude: coords.lon,
      precision: "gps",
      displayLabel: "Current location",
    });
  };

  return (
    <div
      className={cn(
        "weather-workspace relative -mx-4 min-h-[calc(100vh-3.5rem)] overflow-hidden px-4 pb-8 pt-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
        colorMode === "light" && "weather-light",
      )}
    >
      <WeatherBackgroundScene
        scene={scene}
        backgroundImageUrl={data.backgroundImageUrl}
      />

      <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col gap-5">
        <WeatherTopBar
          copy={copy}
          selectedLabel={
            data.location?.precision === "manual"
              ? data.location.displayLabel
              : undefined
          }
          onSelect={setSelectedLocation}
          onClear={() => setSelectedLocation(null)}
          onUseMyLocation={handleUseMyLocation}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        {data.status === "error" ? (
          <ErrorPanel message={data.errorMessage} retry={handleRefresh} />
        ) : data.status === "loading" || !data.current || !data.location ? (
          <HeroSkeleton />
        ) : (
          <>
            <WeatherHero
              copy={copy}
              location={data.location}
              current={data.current}
              insight={insight}
            />

            <WeatherMetricsGrid copy={copy} current={data.current} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <WeatherAtmosphericInsights copy={copy} current={data.current} />
              <WeatherRainIntensity copy={copy} hourly={data.hourly} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <WeatherSmartReminders copy={copy} insight={insight} />
              <WeatherImpactPanel copy={copy} insight={insight} />
            </div>

            {/* Phase D placeholder — radar + charts + forecast tabs. */}
            <PhasePlaceholders
              hourly={data.hourly.length}
              daily={data.daily.length}
            />
          </>
        )}

        {/* Unsplash attribution footer. */}
        {data.backgroundCredit ? (
          <p className="text-right text-[11px] text-[var(--weather-text-muted)]">
            <a
              href={data.backgroundCredit.photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              {copy.photoCredit(data.backgroundCredit.name)}
            </a>
            {" · "}
            <a
              href="https://unsplash.com?utm_source=mybestlife-os&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline"
            >
              Unsplash
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="weather-glass-panel h-[360px] animate-pulse" aria-hidden />
  );
}

function ErrorPanel({
  message,
  retry,
}: {
  message?: string;
  retry: () => void;
}) {
  return (
    <div className="weather-glass-panel space-y-3 p-6">
      <h2 className="text-lg font-semibold text-[var(--weather-text-primary)]">
        Weather unavailable
      </h2>
      <p className="text-sm text-[var(--weather-text-secondary)]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="weather-glass-pill"
        data-accent="lime"
      >
        Retry
      </button>
    </div>
  );
}

function PhasePlaceholders({
  hourly,
  daily,
}: {
  hourly: number;
  daily: number;
}) {
  return (
    <div className="weather-glass-panel space-y-2 p-5 text-xs text-[var(--weather-text-secondary)]">
      <p>
        ▸ Metric cards / radar / charts / forecast tabs land in Phase C + D.
      </p>
      <p>
        Pipeline check: hourly={hourly} entries, daily={daily} entries (incl.
        extended outlook).
      </p>
    </div>
  );
}
