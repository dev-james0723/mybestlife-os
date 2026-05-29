"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { settingsRepository } from "@/lib/repositories/settings";
import {
  fetchCurrentWeather,
  type WeatherResult,
} from "@/lib/weather/openweather";
import { resolveCoordsForWeather } from "@/lib/weather/resolve-weather-coords";

const WEATHER_CACHE_STORAGE_KEY = "mylifeos.weather.snapshot.v3";
/** Keep cached weather for 30 min before refetching. */
const CACHE_TTL_MS = 30 * 60 * 1000;

type CachedResult = {
  result: WeatherResult;
  savedAt: number;
  lat: number;
  lon: number;
};

function readCache(): CachedResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResult;
    if (
      !parsed ||
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

function writeCache(result: WeatherResult, lat: number, lon: number) {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedResult = { result, savedAt: Date.now(), lat, lon };
    window.localStorage.setItem(WEATHER_CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / privacy errors */
  }
}

function cacheMatchesCoords(c: CachedResult | null, lat: number, lon: number): boolean {
  if (!c) return false;
  return Math.abs(c.lat - lat) < 0.04 && Math.abs(c.lon - lon) < 0.04;
}

export type UseWeatherReturn = {
  /** Undefined while we don't yet know anything. */
  result: WeatherResult | undefined;
  loading: boolean;
  refresh: () => void;
};

/**
 * Weather for the top bar. Logged-in users with `profiles.weather_lat/lon` use
 * that pin; otherwise IP / pre-granted geolocation (see `openweather.ts`).
 */
export function useWeather(): UseWeatherReturn {
  const [result, setResult] = useState<WeatherResult | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const { user, isLoading: authLoading } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: settingsRepository.getProfile,
    enabled: !!user,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const coords = await resolveCoordsForWeather(profile ?? null, !!user);
      if (!coords) {
        const next: WeatherResult = {
          status: "error",
          reason: "no_location",
        };
        setResult((prev) => (prev?.status === "ok" ? prev : next));
        return;
      }

      const cached = readCache();
      if (cached && cacheMatchesCoords(cached, coords.lat, coords.lon)) {
        setResult(cached.result);
        if (
          cached.result.status === "ok" &&
          Date.now() - cached.savedAt < CACHE_TTL_MS
        ) {
          return;
        }
      }

      const next = await fetchCurrentWeather(coords);
      if (next.status === "ok") {
        setResult(next);
        writeCache(next, coords.lat, coords.lon);
      } else {
        setResult((prev) => (prev?.status === "ok" ? prev : next));
        writeCache(next, coords.lat, coords.lon);
      }
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

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

  return { result, loading, refresh };
}
