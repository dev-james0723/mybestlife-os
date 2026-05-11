import type { UserProfile } from "@/types/database";
import { resolveLocation, type WeatherCoords } from "@/lib/weather/openweather";

export function coordsFromProfile(profile: UserProfile | null | undefined): WeatherCoords | null {
  if (!profile) return null;
  const lat = profile.weather_lat;
  const lon = profile.weather_lon;
  if (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon)
  ) {
    return {
      lat,
      lon,
      city: profile.weather_city?.trim() ? profile.weather_city.trim() : undefined,
    };
  }
  return null;
}

/**
 * Logged-in users with a pinned point use it; otherwise same as guests (IP / pre-granted geo).
 */
export async function resolveCoordsForWeather(
  profile: UserProfile | null | undefined,
  isAuthenticated: boolean
): Promise<WeatherCoords | null> {
  if (isAuthenticated) {
    const pinned = coordsFromProfile(profile);
    if (pinned) return pinned;
  }
  return resolveLocation();
}
