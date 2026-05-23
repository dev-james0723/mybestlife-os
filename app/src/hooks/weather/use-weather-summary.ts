"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { settingsRepository } from "@/lib/repositories/settings";

import type { WeatherCoords } from "@/lib/weather/openweather";
import {
  fetchCurrentWeatherRich,
  fetchForecast,
  reverseGeocodeCoordinates,
  uvLabelFromIndex,
} from "@/lib/weather/openweather-forecast";
import { fetchUvAndAirQuality } from "@/lib/weather/open-meteo";
import { resolveCoordsForWeather } from "@/lib/weather/resolve-weather-coords";
import type { CurrentWeather } from "@/lib/weather/types";
import {
  buildWeatherSummary,
  type WeatherSummary,
} from "@/lib/weather/widget-summary";

const SUMMARY_CACHE_KEY = "mylifeos.weather.summary.v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export type WeatherSummaryState =
  | { status: "loading" }
  | { status: "error"; reason: "no_key" | "no_location" | "network" | "api" }
  | { status: "ok"; summary: WeatherSummary };

export type UseWeatherSummaryReturn = {
  state: WeatherSummaryState;
  refresh: () => void;
};

type CachedSummary = {
  summary: WeatherSummary;
  savedAt: number;
  lat: number;
  lon: number;
};

function readCache(): CachedSummary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SUMMARY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSummary;
    if (
      !parsed?.summary ||
      typeof parsed.savedAt !== "number" ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lon !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(summary: WeatherSummary, lat: number, lon: number) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedSummary = { summary, savedAt: Date.now(), lat, lon };
    window.localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / privacy errors */
  }
}

function cacheMatchesCoords(c: CachedSummary | null, lat: number, lon: number): boolean {
  if (!c) return false;
  return Math.abs(c.lat - lat) < 0.04 && Math.abs(c.lon - lon) < 0.04;
}

/**
 * Compact weather for the dashboard "Today" widget. Shares the exact same
 * data source as the full Weather page (`fetchCurrentWeatherRich` +
 * `fetchForecast` + Open-Meteo UV) but skips the page's heavy background
 * photo pipeline and reduces the result to a glanceable `WeatherSummary`.
 *
 * Always resolves to a definite state (loading → ok | error) so the widget
 * can render skeletons and a graceful fallback instead of crashing.
 */
export function useWeatherSummary(): UseWeatherSummaryReturn {
  const [state, setState] = useState<WeatherSummaryState>({ status: "loading" });
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: settingsRepository.getProfile,
    enabled: !!user,
  });

  const refresh = useCallback(async () => {
    setState((prev) => (prev.status === "ok" ? prev : { status: "loading" }));

    const coords = await resolveCoordsForWeather(profile ?? null, !!user);
    if (!coords) {
      setState((prev) => (prev.status === "ok" ? prev : { status: "error", reason: "no_location" }));
      return;
    }

    const cached = readCache();
    if (
      cached &&
      cacheMatchesCoords(cached, coords.lat, coords.lon) &&
      Date.now() - cached.savedAt < CACHE_TTL_MS
    ) {
      setState({ status: "ok", summary: cached.summary });
      return;
    }

    const [currentResult, forecastResult, geoResult, uvAqi] = await Promise.all([
      fetchCurrentWeatherRich(coords),
      fetchForecast(coords),
      reverseGeocodeCoordinates(coords.lat, coords.lon),
      fetchUvAndAirQuality(coords.lat, coords.lon),
    ]);

    if (currentResult.status !== "ok") {
      setState((prev) =>
        prev.status === "ok" ? prev : { status: "error", reason: currentResult.reason },
      );
      return;
    }

    const hourly = forecastResult.status === "ok" ? forecastResult.hourly : [];
    const daily = forecastResult.status === "ok" ? forecastResult.daily : [];
    const current: CurrentWeather = {
      ...currentResult.current,
      rainChance:
        hourly[0]?.rainChance ?? daily[0]?.rainChance ?? currentResult.current.rainChance,
      uvIndex: uvAqi.uvIndex ?? currentResult.current.uvIndex,
      uvLabel:
        uvAqi.uvIndex != null
          ? uvLabelFromIndex(uvAqi.uvIndex)
          : currentResult.current.uvLabel,
    };

    const location = pickLocationLabel(geoResult, currentResult.cityName, coords);
    const summary = buildWeatherSummary(current, hourly, location);
    setState({ status: "ok", summary });
    writeCache(summary, coords.lat, coords.lon);
  }, [profile, user]);

  useEffect(() => {
    if (authLoading) return;
    if (user && profileLoading) return;
    void refresh();
  }, [
    authLoading,
    user,
    profileLoading,
    profile?.weather_lat,
    profile?.weather_lon,
    profile?.weather_city,
    refresh,
  ]);

  return { state, refresh };
}

function pickLocationLabel(
  geoResult: Awaited<ReturnType<typeof reverseGeocodeCoordinates>>,
  fallbackCity: string | undefined,
  coords: WeatherCoords,
): string {
  if (geoResult.status === "ok" && geoResult.locations.length > 0) {
    return geoResult.locations[0]!.city;
  }
  return fallbackCity ?? coords.city ?? "Current location";
}
