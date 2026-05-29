/**
 * Unified background-photo resolver for the Weather page.
 *
 * Strategy (real-time, royalty-free):
 *   1. Wikipedia / Wikimedia — best for real city skylines & landmarks
 *   2. Unsplash — cinematic fallback when a key is configured
 *   3. null → CSS-only animated scene
 *
 * We intentionally try Wikimedia first because Unsplash search queries
 * that include weather terms ("cloudy", "rainy") often return abstract art
 * instead of actual cityscapes.
 */

import { fetchUnsplashBackground } from "@/lib/weather/unsplash";
import { fetchWikimediaBackground } from "@/lib/weather/wikimedia";

export type WeatherBackgroundPhoto = {
  url: string;
  credit: {
    name: string;
    profileUrl: string;
    photoUrl: string;
  };
  /** Which provider supplied the image — used for attribution footer. */
  source: "wikimedia" | "unsplash";
};

export async function fetchWeatherBackground(params: {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  conditionCode: string;
  timeOfDay: string;
}): Promise<WeatherBackgroundPhoto | null> {
  const wiki = await fetchWikimediaBackground({
    city: params.city,
    region: params.region,
    country: params.country,
    latitude: params.latitude,
    longitude: params.longitude,
  });
  if (wiki) {
    return { ...wiki, source: "wikimedia" };
  }

  const unsplash = await fetchUnsplashBackground({
    city: params.city,
    country: params.country,
    conditionCode: params.conditionCode,
    timeOfDay: params.timeOfDay,
  });
  if (unsplash) {
    return { ...unsplash, source: "unsplash" };
  }

  return null;
}
