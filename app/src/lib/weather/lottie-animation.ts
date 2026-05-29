/**
 * Canonical weather -> Lottie animation mapping.
 *
 * Single source of truth shared by every animated weather surface (the
 * top-bar pill, the dashboard widget, and the weather page hero).
 *
 * Always resolve through `resolveWeatherAnimationKey` so the same OpenWeather
 * condition produces the same animation everywhere.
 *
 * Assets live in `public/weather/lottie/<key>.json` (Meteocons, MIT — see the
 * ATTRIBUTION.md next to them).
 */

import { mapConditionCode } from "@/lib/weather/openweather-forecast";
import type { WeatherConditionCode } from "@/lib/weather/types";

/** The finite set of animations we actually ship a `.json` file for. */
export type WeatherAnimationKey =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "sleet";

/** Public URL for a given animation key. */
export function getAnimationSrc(key: WeatherAnimationKey): string {
  return `/weather/lottie/${key}.json`;
}

/**
 * Preferred entry point — pick the first usable input and map through the
 * shared condition-code pipeline.
 */
export function resolveWeatherAnimationKey(input: {
  conditionCode?: WeatherConditionCode;
  weatherId?: number;
  icon?: string;
  /** Fallback when `weatherId` is unavailable (legacy cache). */
  main?: string;
}): WeatherAnimationKey {
  if (input.conditionCode != null) {
    return mapConditionCodeToAnimation(input.conditionCode);
  }
  if (input.weatherId != null && input.icon) {
    return mapConditionCodeToAnimation(
      mapConditionCode(input.weatherId, input.icon),
    );
  }
  if (input.main && input.icon) {
    return mapMainToAnimation(input.main, input.icon);
  }
  return "cloudy";
}

/**
 * Map an OpenWeather `main` group + `icon` code to an animation.
 *
 * Coarse fallback when only `main` + `icon` are available (no weather id).
 * Prefer `resolveWeatherAnimationKey` with `weatherId` when possible.
 */
export function mapMainToAnimation(main: string, icon: string): WeatherAnimationKey {
  const isNight = icon.endsWith("n");
  switch (main) {
    case "Clear":
      return isNight ? "clear-night" : "clear-day";
    case "Clouds":
      return isNight ? "partly-cloudy-night" : "partly-cloudy-day";
    case "Rain":
      return "rain";
    case "Drizzle":
      return "drizzle";
    case "Thunderstorm":
      return "thunderstorm";
    case "Snow":
      return "snow";
    case "Mist":
    case "Fog":
    case "Haze":
    case "Smoke":
    case "Dust":
    case "Sand":
    case "Ash":
      return "fog";
    default:
      return isNight ? "partly-cloudy-night" : "partly-cloudy-day";
  }
}

/**
 * Map a normalized `WeatherConditionCode` to an animation.
 *
 * Codes without a dedicated asset fall back to the nearest visual match:
 *   - `light-rain` -> `drizzle`
 *   - `wind` / `cold` -> `cloudy`   (consistent with the neutral default icon)
 *   - `hot` -> `clear-day`
 */
export function mapConditionCodeToAnimation(
  code: WeatherConditionCode,
): WeatherAnimationKey {
  switch (code) {
    case "clear-day":
      return "clear-day";
    case "clear-night":
      return "clear-night";
    case "partly-cloudy-day":
      return "partly-cloudy-day";
    case "partly-cloudy-night":
      return "partly-cloudy-night";
    case "cloudy":
      return "cloudy";
    case "fog":
      return "fog";
    case "light-rain":
      return "drizzle";
    case "rain":
      return "rain";
    case "heavy-rain":
      return "heavy-rain";
    case "thunderstorm":
      return "thunderstorm";
    case "snow":
      return "snow";
    case "sleet":
      return "sleet";
    case "hot":
      return "clear-day";
    case "wind":
    case "cold":
      return "cloudy";
    default:
      return "cloudy";
  }
}
