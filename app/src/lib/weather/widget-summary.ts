/**
 * Compact weather summary for the dashboard "Today" widget.
 *
 * Reuses the same provider-agnostic shapes as the full Weather page
 * (`CurrentWeather` + `HourlyForecastEntry`) but reduces them to the few
 * fields a glanceable decision card needs. No background photos, no 15-day
 * outlook — just "how hot is it, will it rain, what should I watch for".
 */

import type {
  CurrentWeather,
  HourlyForecastEntry,
  WeatherConditionCode,
} from "./types";

export type WeatherAlertLevel = "minor" | "moderate" | "severe";

export type WeatherAlertKey = "thunderstorm" | "heavyRain" | "wind" | "heat";

export type WeatherAlert = {
  level: WeatherAlertLevel;
  /** Localized in the widget via the i18n copy map. */
  titleKey: WeatherAlertKey;
};

export type WeatherSummary = {
  location: string;
  temperature: number;
  feelsLike: number;
  /** Human-facing condition text (provider language, e.g. "Cloudy"). */
  condition: string;
  conditionCode: WeatherConditionCode;
  rainChance: number; // 0..100
  precipitationMm: number;
  /** ISO timestamp of the next hour rain is likely, when known. */
  nextRainTime?: string;
  humidity: number; // 0..100
  windSpeed: number; // km/h
  uvIndex: number;
  alert?: WeatherAlert;
};

/** The next forecast hour where rain is likely (>= 50% PoP or measurable mm). */
function findNextRain(hourly: HourlyForecastEntry[]): HourlyForecastEntry | undefined {
  return hourly.find(
    (h) => h.rainChance >= 50 || (h.precipitationMm ?? 0) >= 0.2,
  );
}

/** Heaviest precipitation expected across the next ~9h (three 3-hour buckets). */
function peakPrecipitation(hourly: HourlyForecastEntry[]): number {
  const window = hourly.slice(0, 3);
  const peak = window.reduce((max, h) => Math.max(max, h.precipitationMm ?? 0), 0);
  return Math.round(peak * 10) / 10;
}

/**
 * Derive a single "watch out" alert from the current conditions. The free
 * OpenWeather tier exposes no government alert feed, so this is a synthetic
 * severity cue — deliberately conservative so the card stays a status hint,
 * not a warning poster.
 */
function deriveAlert(current: CurrentWeather): WeatherAlert | undefined {
  if (current.conditionCode === "thunderstorm") {
    return { level: "severe", titleKey: "thunderstorm" };
  }
  if (current.conditionCode === "heavy-rain") {
    return { level: "moderate", titleKey: "heavyRain" };
  }
  if (current.windSpeed >= 50) {
    return { level: "moderate", titleKey: "wind" };
  }
  if (current.temperature >= 35) {
    return { level: "moderate", titleKey: "heat" };
  }
  return undefined;
}

export function buildWeatherSummary(
  current: CurrentWeather,
  hourly: HourlyForecastEntry[],
  location: string,
): WeatherSummary {
  const nextRain = findNextRain(hourly);
  return {
    location,
    temperature: current.temperature,
    feelsLike: current.feelsLike,
    condition: current.condition,
    conditionCode: current.conditionCode,
    rainChance: current.rainChance,
    precipitationMm: peakPrecipitation(hourly),
    nextRainTime: nextRain?.time,
    humidity: current.humidity,
    windSpeed: current.windSpeed,
    uvIndex: current.uvIndex,
    alert: deriveAlert(current),
  };
}
