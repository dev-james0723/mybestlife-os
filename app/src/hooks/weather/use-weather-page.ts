"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { settingsRepository } from "@/lib/repositories/settings";

import {
  type WeatherCoords,
} from "@/lib/weather/openweather";
import {
  fetchCurrentWeatherRich,
  fetchForecast,
  reverseGeocodeCoordinates,
  uvLabelFromIndex,
  type RichCurrentResult,
} from "@/lib/weather/openweather-forecast";
import { fetchUvAndAirQuality } from "@/lib/weather/open-meteo";
import { resolveCoordsForWeather } from "@/lib/weather/resolve-weather-coords";
import { fetchUnsplashBackground } from "@/lib/weather/unsplash";
import { fetchWikimediaBackground } from "@/lib/weather/wikimedia";
import {
  getWeatherScene,
  timeOfDayFromDate,
  type WeatherScene,
} from "@/lib/weather/scene-mapper";
import { generateWeatherInsight } from "@/lib/weather/insight";
import type {
  CurrentWeather,
  WeatherInsight,
  WeatherLocation,
  WeatherPageData,
} from "@/lib/weather/types";

/**
 * One-stop hook that fetches everything the Weather page needs:
 *  - resolved coordinates + reverse-geocoded location
 *  - current weather (rich, not just the topbar shape)
 *  - hourly + daily forecast (incl. extended outlook days 6-15)
 *  - Unsplash background photo (with attribution)
 *  - derived scene + AI-style insight
 *
 * The hook ALWAYS returns a `WeatherPageData` object — even on failure
 * it surfaces a useful status + errorMessage so the page can render an
 * error state instead of crashing.
 */
export function useWeatherPage() {
  const [data, setData] = useState<WeatherPageData>(initialData);
  const [scene, setScene] = useState<WeatherScene | null>(null);
  const [insight, setInsight] = useState<WeatherInsight | null>(null);
  const [overrideCoords, setOverrideCoords] = useState<WeatherCoords | null>(null);

  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: settingsRepository.getProfile,
    enabled: !!user,
  });

  const refresh = useCallback(async () => {
    setData((prev) => ({ ...prev, status: "loading" }));

    const coords =
      overrideCoords ??
      (await resolveCoordsForWeather(profile ?? null, !!user));
    if (!coords) {
      setData({
        ...initialData,
        status: "error",
        errorMessage: "Location unavailable",
      });
      return;
    }

    const [currentResult, forecastResult, geoResult, uvAqi] = await Promise.all([
      fetchCurrentWeatherRich(coords),
      fetchForecast(coords),
      reverseGeocodeCoordinates(coords.lat, coords.lon),
      fetchUvAndAirQuality(coords.lat, coords.lon),
    ]);

    if (currentResult.status !== "ok") {
      setData({
        ...initialData,
        status: "error",
        errorMessage: errorMessageFor(currentResult),
      });
      return;
    }

    const location =
      overrideCoords?.city
        ? syntheticLocation(overrideCoords, "manual")
        : pickBestLocation(
            geoResult,
            coords,
            currentResult.cityName ?? "Current location",
          );

    // Patch in the rain chance + high/low from the forecast if available
    // (the current endpoint alone doesn't expose probability of precipitation).
    const hourly = forecastResult.status === "ok" ? forecastResult.hourly : [];
    const daily = forecastResult.status === "ok" ? forecastResult.daily : [];
    const current: CurrentWeather = {
      ...currentResult.current,
      rainChance:
        hourly[0]?.rainChance ?? daily[0]?.rainChance ?? currentResult.current.rainChance,
      high: daily[0]?.high ?? currentResult.current.high,
      low: daily[0]?.low ?? currentResult.current.low,
      // UV + AQI come from Open-Meteo (OpenWeather's free tier omits both).
      uvIndex: uvAqi.uvIndex ?? currentResult.current.uvIndex,
      uvLabel:
        uvAqi.uvIndex != null
          ? uvLabelFromIndex(uvAqi.uvIndex)
          : currentResult.current.uvLabel,
      airQualityIndex: uvAqi.airQualityIndex ?? undefined,
      aqiCategory: uvAqi.aqiCategory ?? undefined,
    };

    const sceneNow = getWeatherScene({
      conditionCode: current.conditionCode,
      intensity: current.intensity,
      timeOfDay: timeOfDayFromDate(),
    });
    setScene(sceneNow);
    setInsight(generateWeatherInsight({ current, hourly }));

    // Render the page immediately with whatever we have; the cinematic
    // background photo loads asynchronously and patches in once ready.
    setData({
      status: "ok",
      location,
      current,
      hourly,
      daily,
      backgroundImageUrl: null,
    });

    // Background-photo chain: Unsplash (best, needs key) → Wikipedia
    // (zero-config, always works for named places) → CSS scene.
    const unsplash = await fetchUnsplashBackground({
      city: location?.city,
      country: location?.country,
      conditionCode: current.conditionCode,
      timeOfDay: sceneNow.timeOfDay,
    });
    if (unsplash) {
      setData((prev) => ({
        ...prev,
        backgroundImageUrl: unsplash.url,
        backgroundCredit: unsplash.credit,
      }));
      return;
    }

    const wiki = await fetchWikimediaBackground({
      city: location?.city,
      region: location?.region,
      country: location?.country,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    if (wiki) {
      setData((prev) => ({
        ...prev,
        backgroundImageUrl: wiki.url,
        backgroundCredit: wiki.credit,
      }));
    }
  }, [overrideCoords, profile, user]);

  // Initial load + re-runs when auth / profile coords / manual override change.
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
    overrideCoords?.lat,
    overrideCoords?.lon,
    refresh,
  ]);

  return {
    data,
    scene,
    insight,
    refresh,
    /** Override the resolved location (used by manual location search). */
    setSelectedLocation: (location: WeatherLocation | null) => {
      if (!location) {
        setOverrideCoords(null);
        return;
      }
      setOverrideCoords({
        lat: location.latitude,
        lon: location.longitude,
        city: location.displayLabel,
      });
    },
  };
}

const initialData: WeatherPageData = {
  status: "idle",
  location: null,
  current: null,
  hourly: [],
  daily: [],
  backgroundImageUrl: null,
};

function errorMessageFor(r: Exclude<RichCurrentResult, { status: "ok" }>): string {
  switch (r.reason) {
    case "no_key":
      return "OpenWeather API key missing";
    case "network":
      return "Network error";
    case "api":
      return r.message ?? "Weather service error";
  }
}

function pickBestLocation(
  geoResult: Awaited<ReturnType<typeof reverseGeocodeCoordinates>>,
  coords: WeatherCoords,
  fallbackCity: string,
): WeatherLocation {
  if (geoResult.status === "ok" && geoResult.locations.length > 0) {
    // OpenWeather may return both the precise neighbourhood and the city.
    // Prefer the most specific (lowest population implied → first in list).
    const best = geoResult.locations[0]!;
    return { ...best, precision: "gps" };
  }
  return {
    name: fallbackCity || "Current location",
    city: fallbackCity || "Current location",
    country: "",
    latitude: coords.lat,
    longitude: coords.lon,
    precision: "gps",
    displayLabel: fallbackCity || "Current location",
  };
}

function syntheticLocation(
  coords: WeatherCoords,
  precision: WeatherLocation["precision"],
): WeatherLocation {
  return {
    name: coords.city ?? "Selected location",
    city: coords.city ?? "Selected location",
    country: "",
    latitude: coords.lat,
    longitude: coords.lon,
    precision,
    displayLabel: coords.city ?? "Selected location",
  };
}
