/**
 * Signals — local location resolution.
 *
 * Reuses the Weather location stack verbatim (§15): silent GPS (only if already
 * granted) → IP fallback (ip-api.com, keyless) → reverse-geocode to a real
 * place name. Never *requires* GPS; `requestDeviceGeolocation` is the explicit
 * opt-in for the onboarding/settings "use my location" button.
 *
 * HONESTY: granularity is city/region, never district. The returned precision
 * is labeled truthfully and surfaced in the UI.
 */

import {
  requestDeviceGeolocation,
  resolveLocation,
  type WeatherCoords,
} from "@/lib/weather/openweather";
import {
  reverseGeocodeCoordinates,
  searchLocations,
} from "@/lib/weather/openweather-forecast";
import type { WeatherLocation } from "@/lib/weather/types";
import type { SignalsLocalLocation } from "./types";

export { requestDeviceGeolocation };

/** Convert a stored Signals location pref → a WeatherLocation for the UI/scoring. */
export function localLocationToWeatherLocation(
  loc: SignalsLocalLocation | undefined | null,
): WeatherLocation | null {
  if (!loc || (!loc.city && !loc.region)) return null;
  return {
    name: loc.city ?? loc.region ?? "",
    city: loc.city ?? loc.region ?? "",
    region: loc.region,
    country: loc.country ?? "",
    countryCode: loc.countryCode,
    latitude: loc.latitude ?? 0,
    longitude: loc.longitude ?? 0,
    precision: (loc.precision === "gps" ? "gps" : "city") as WeatherLocation["precision"],
    displayLabel: loc.region ? `${loc.city ?? loc.region}, ${loc.region}` : loc.city ?? "",
  };
}

/** Convert a WeatherLocation (from search/geocode) → the stored Signals shape. */
export function weatherLocationToLocalLocation(
  loc: WeatherLocation,
  precision: SignalsLocalLocation["precision"] = "manual",
): SignalsLocalLocation {
  return {
    city: loc.city,
    region: loc.region,
    country: loc.country,
    countryCode: loc.countryCode,
    latitude: loc.latitude,
    longitude: loc.longitude,
    precision,
  };
}

/**
 * Best-effort current location WITHOUT prompting (silent geo → IP → null).
 * Returns a city/region-precision WeatherLocation or null.
 */
export async function resolveSignalsLocation(): Promise<WeatherLocation | null> {
  const coords = await resolveLocation();
  if (!coords) return null;
  return coordsToLocation(coords);
}

/** Explicit, user-initiated GPS detection (prompts the browser). */
export async function detectSignalsLocation(): Promise<WeatherLocation | null> {
  const coords = await requestDeviceGeolocation();
  if (!coords) return null;
  return coordsToLocation(coords, "gps");
}

async function coordsToLocation(
  coords: WeatherCoords,
  precision: WeatherLocation["precision"] = "city",
): Promise<WeatherLocation | null> {
  const geo = await reverseGeocodeCoordinates(coords.lat, coords.lon);
  if (geo.status === "ok" && geo.locations.length > 0) {
    return { ...geo.locations[0], precision };
  }
  // Reverse geocode failed but we still have coords + maybe an IP-derived city.
  if (coords.city) {
    return {
      name: coords.city,
      city: coords.city,
      country: "",
      latitude: coords.lat,
      longitude: coords.lon,
      precision,
      displayLabel: coords.city,
    };
  }
  return null;
}

/** Manual city override search — reuses the Weather forward-geocoder. */
export async function searchSignalsCities(query: string): Promise<WeatherLocation[]> {
  const result = await searchLocations(query);
  return result.status === "ok" ? result.locations : [];
}
