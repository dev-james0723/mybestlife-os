import type { GeocodeResult } from "./openweather-forecast";
import type { WeatherCoords } from "./openweather";
import type { WeatherLocation } from "./types";

const GENERIC_LOCATION_LABELS = new Set(["current location"]);

function actualPlaceName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || GENERIC_LOCATION_LABELS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * Resolve coordinates to a real human-readable place name. Generic UI
 * placeholders are deliberately rejected so they can never become the
 * weather-card heading.
 */
export function resolveActualWeatherLocation({
  geocodeResult,
  coords,
  providerCity,
  providerCountry,
}: {
  geocodeResult: GeocodeResult;
  coords: WeatherCoords;
  providerCity?: string;
  providerCountry?: string;
}): WeatherLocation | null {
  if (geocodeResult.status === "ok") {
    const best = geocodeResult.locations.find(
      (location) =>
        actualPlaceName(location.displayLabel) ??
        actualPlaceName(location.city) ??
        actualPlaceName(location.name),
    );

    if (best) {
      const city =
        actualPlaceName(best.city) ?? actualPlaceName(best.name) ?? "";
      const displayLabel =
        actualPlaceName(best.displayLabel) ??
        actualPlaceName(best.name) ??
        actualPlaceName(best.city);

      if (city && displayLabel) {
        return {
          ...best,
          name: actualPlaceName(best.name) ?? city,
          city,
          displayLabel,
          precision: "gps",
        };
      }
    }
  }

  const city = actualPlaceName(providerCity) ?? actualPlaceName(coords.city);
  if (!city) return null;

  const country = actualPlaceName(providerCountry) ?? "";
  return {
    name: city,
    city,
    country,
    countryCode: country || undefined,
    latitude: coords.lat,
    longitude: coords.lon,
    precision: "gps",
    displayLabel: country ? `${city}, ${country}` : city,
  };
}
