/**
 * Extensions to the existing `openweather.ts` adapter: hourly + daily
 * forecast and reverse / forward geocoding.
 *
 * Free tier endpoints used:
 *   - /data/2.5/forecast       — 5-day / 3-hour buckets (40 entries)
 *   - /geo/1.0/reverse         — lat/lon → city / district names
 *   - /geo/1.0/direct          — text query → matching locations
 *
 * Days 6-15 of the daily forecast are SYNTHETIC: produced by
 * `extrapolateDailyForecast` from the trailing 5-day signal and clearly
 * marked with confidence `medium` (days 6-10) / `low` (days 11-15) so the
 * UI honors the data-accuracy rule from the spec.
 */

import type {
  CurrentWeather,
  DailyForecastConfidence,
  DailyForecastEntry,
  HourlyForecastEntry,
  WeatherConditionCode,
  WeatherIntensity,
  WeatherLocation,
} from "./types";
import type { WeatherCoords } from "./openweather";

const OWM_CURRENT = "https://api.openweathermap.org/data/2.5/weather";
const OWM_FORECAST = "https://api.openweathermap.org/data/2.5/forecast";
const OWM_GEO_REVERSE = "https://api.openweathermap.org/geo/1.0/reverse";
const OWM_GEO_DIRECT = "https://api.openweathermap.org/geo/1.0/direct";

function getApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  return key && key.length > 0 ? key : null;
}

// ============================================================
// Condition mapping (OpenWeather → normalized code)
// ============================================================

/**
 * Convert OpenWeather's numeric weather id + icon suffix into our
 * normalized condition code. Reference: https://openweathermap.org/weather-conditions
 */
export function mapConditionCode(
  weatherId: number,
  icon: string,
): WeatherConditionCode {
  const isNight = icon.endsWith("n");
  if (weatherId >= 200 && weatherId < 300) return "thunderstorm";
  if (weatherId >= 300 && weatherId < 400) return "light-rain";
  if (weatherId >= 500 && weatherId < 600) {
    if (weatherId >= 502) return "heavy-rain";
    if (weatherId === 500) return "light-rain";
    return "rain";
  }
  if (weatherId >= 600 && weatherId < 700) {
    if (weatherId === 611 || weatherId === 612 || weatherId === 613) return "sleet";
    return "snow";
  }
  if (weatherId >= 700 && weatherId < 800) return "fog";
  if (weatherId === 800) return isNight ? "clear-night" : "clear-day";
  if (weatherId === 801 || weatherId === 802 || weatherId === 803)
    return isNight ? "partly-cloudy-night" : "partly-cloudy-day";
  // 804 = overcast — fully cloudy, no sun peeking through.
  if (weatherId === 804) return "cloudy";
  return "cloudy";
}

export function mapIntensity(
  conditionCode: WeatherConditionCode,
  rainMm3h?: number,
  windKmh?: number,
): WeatherIntensity {
  if (conditionCode === "heavy-rain") return "heavy";
  if (conditionCode === "thunderstorm") return "heavy";
  if (conditionCode === "rain") return rainMm3h && rainMm3h > 4 ? "moderate" : "light";
  if (conditionCode === "light-rain") return "light";
  if (conditionCode === "snow") return "moderate";
  if (windKmh && windKmh > 50) return "heavy";
  if (windKmh && windKmh > 30) return "moderate";
  return "light";
}

export function degreesToCardinal(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) / 45)) % 8]!;
}

export function uvLabelFromIndex(uv: number): CurrentWeather["uvLabel"] {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

// ============================================================
// Rich current weather — same endpoint as the topbar shape but extracts
// every field the page needs (humidity / wind / sunrise / etc.).
// ============================================================

type OwmCurrentResponse = {
  weather?: Array<{ id: number; main?: string; description?: string; icon: string }>;
  main?: {
    temp?: number;
    feels_like?: number;
    pressure?: number;
    humidity?: number;
    temp_min?: number;
    temp_max?: number;
  };
  wind?: { speed?: number; deg?: number; gust?: number };
  visibility?: number;
  clouds?: { all?: number };
  sys?: { country?: string; sunrise?: number; sunset?: number };
  name?: string;
  dt?: number;
  timezone?: number;
};

export type RichCurrentResult =
  | { status: "ok"; current: CurrentWeather; cityName?: string; country?: string }
  | { status: "error"; reason: "no_key" | "network" | "api"; message?: string };

/**
 * Like the topbar's `fetchCurrentWeather` but returns every field needed
 * by the dedicated Weather page. We keep the original lightweight fetcher
 * for the topbar so its shape stays stable.
 */
export async function fetchCurrentWeatherRich(
  coords: WeatherCoords,
): Promise<RichCurrentResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { status: "error", reason: "no_key" };

  const url = new URL(OWM_CURRENT);
  url.searchParams.set("lat", String(coords.lat));
  url.searchParams.set("lon", String(coords.lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { status: "error", reason: "api", message: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as OwmCurrentResponse;
    const w = data.weather?.[0];
    if (!w) {
      return { status: "error", reason: "api", message: "no weather entry" };
    }
    const conditionCode = mapConditionCode(w.id, w.icon);
    const windSpeedKmh = data.wind?.speed != null ? Math.round(data.wind.speed * 3.6) : 0;
    const intensity = mapIntensity(conditionCode, undefined, windSpeedKmh);
    return {
      status: "ok",
      cityName: data.name,
      country: data.sys?.country,
      current: {
        temperature: Math.round(data.main?.temp ?? 0),
        feelsLike: Math.round(data.main?.feels_like ?? data.main?.temp ?? 0),
        condition: capitalize(w.description ?? w.main ?? ""),
        conditionCode,
        intensity,
        high: Math.round(data.main?.temp_max ?? data.main?.temp ?? 0),
        low: Math.round(data.main?.temp_min ?? data.main?.temp ?? 0),
        rainChance: 0, // OpenWeather current endpoint doesn't expose PoP; pulled from hourly later.
        humidity: data.main?.humidity ?? 0,
        windSpeed: windSpeedKmh,
        windDirection: data.wind?.deg != null ? degreesToCardinal(data.wind.deg) : undefined,
        windDegrees: data.wind?.deg,
        uvIndex: null, // Not in the free current endpoint; filled from Open-Meteo.
        uvLabel: "Low",
        sunrise: data.sys?.sunrise ? new Date(data.sys.sunrise * 1000).toISOString() : undefined,
        sunset: data.sys?.sunset ? new Date(data.sys.sunset * 1000).toISOString() : undefined,
        visibility:
          typeof data.visibility === "number" ? Math.round(data.visibility / 100) / 10 : undefined,
        pressure: data.main?.pressure,
        dewPoint: estimateDewPoint(data.main?.temp, data.main?.humidity),
        updatedAt: data.dt ? new Date(data.dt * 1000).toISOString() : new Date().toISOString(),
      },
    };
  } catch (err) {
    return {
      status: "error",
      reason: "network",
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

/** Magnus formula approximation; safe enough for a display value. */
function estimateDewPoint(tempC?: number, rh?: number): number | undefined {
  if (tempC == null || rh == null || rh <= 0) return undefined;
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(rh / 100);
  return Math.round((b * gamma) / (a - gamma));
}

// ============================================================
// 5-day forecast (real data)
// ============================================================

type OwmForecastEntry = {
  dt: number;
  main: { temp: number; humidity?: number; pressure?: number; temp_min?: number; temp_max?: number };
  weather: Array<{ id: number; main?: string; description?: string; icon: string }>;
  wind?: { speed?: number; deg?: number };
  visibility?: number;
  pop?: number; // 0..1 precipitation probability
  rain?: { "3h"?: number };
  dt_txt?: string;
};

type OwmForecastResponse = {
  list: OwmForecastEntry[];
  city?: {
    name?: string;
    country?: string;
    timezone?: number;
    sunrise?: number;
    sunset?: number;
  };
};

export type ForecastResult =
  | {
      status: "ok";
      hourly: HourlyForecastEntry[];
      daily: DailyForecastEntry[];
    }
  | { status: "error"; reason: "no_key" | "network" | "api"; message?: string };

export async function fetchForecast(
  coords: WeatherCoords,
): Promise<ForecastResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { status: "error", reason: "no_key" };

  const url = new URL(OWM_FORECAST);
  url.searchParams.set("lat", String(coords.lat));
  url.searchParams.set("lon", String(coords.lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { status: "error", reason: "api", message: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as OwmForecastResponse;

    const hourly = data.list.slice(0, 24).map(toHourly);
    const real = aggregateDaily(data.list);
    const extended = extrapolateDailyForecast(real, 15 - real.length);
    return { status: "ok", hourly, daily: [...real, ...extended] };
  } catch (err) {
    return {
      status: "error",
      reason: "network",
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

function toHourly(e: OwmForecastEntry): HourlyForecastEntry {
  const w = e.weather[0]!;
  const code = mapConditionCode(w.id, w.icon);
  const date = new Date(e.dt * 1000);
  return {
    time: date.toISOString(),
    hourLabel: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }),
    temperature: Math.round(e.main.temp),
    conditionCode: code,
    condition: capitalize(w.description ?? w.main ?? ""),
    rainChance: Math.round((e.pop ?? 0) * 100),
    precipitationMm: e.rain?.["3h"],
  };
}

/**
 * Bucket the 3-hour entries by local date and reduce to a daily summary.
 * High/low taken from min/max temp across the bucket; condition picked
 * from the bucket's "worst" condition (priority: thunderstorm > heavy-rain
 * > rain > snow > fog > cloudy > partly-cloudy > clear).
 */
function aggregateDaily(list: OwmForecastEntry[]): DailyForecastEntry[] {
  const byDate = new Map<string, OwmForecastEntry[]>();
  for (const e of list) {
    const date = new Date(e.dt * 1000).toISOString().slice(0, 10);
    const arr = byDate.get(date) ?? [];
    arr.push(e);
    byDate.set(date, arr);
  }
  return Array.from(byDate.entries()).map(([date, entries]) => {
    let high = -Infinity;
    let low = Infinity;
    let maxPop = 0;
    let dominantConditionCode: WeatherConditionCode = "clear-day";
    let dominantConditionLabel = "Clear";
    for (const e of entries) {
      const temp = e.main.temp;
      if (temp > high) high = temp;
      if (temp < low) low = temp;
      if (e.pop && e.pop > maxPop) maxPop = e.pop;
      const w = e.weather[0]!;
      const code = mapConditionCode(w.id, w.icon);
      if (conditionPriority(code) > conditionPriority(dominantConditionCode)) {
        dominantConditionCode = code;
        dominantConditionLabel = capitalize(w.description ?? w.main ?? "");
      }
    }
    const weekday = new Date(`${date}T12:00:00`).toLocaleDateString([], {
      weekday: "short",
    });
    return {
      date,
      dayLabel: weekday,
      conditionCode: dominantConditionCode,
      condition: dominantConditionLabel,
      high: Math.round(high),
      low: Math.round(low),
      rainChance: Math.round(maxPop * 100),
      confidence: "high" as DailyForecastConfidence,
    };
  });
}

function conditionPriority(code: WeatherConditionCode): number {
  const order: WeatherConditionCode[] = [
    "clear-day",
    "clear-night",
    "partly-cloudy-day",
    "partly-cloudy-night",
    "cloudy",
    "fog",
    "wind",
    "snow",
    "sleet",
    "light-rain",
    "rain",
    "heavy-rain",
    "thunderstorm",
  ];
  return order.indexOf(code);
}

// ============================================================
// Extended outlook (days 6-15)
// ============================================================

/**
 * Days 6-15 are NOT real OpenWeather data. We project from the tail of
 * the real 5-day window with a small temperature drift + decayed rain
 * probability so the chart doesn't lie about being a hard forecast.
 *
 * Confidence labels:
 *   days 6-10 → medium
 *   days 11-15 → low
 *
 * The UI surfaces this through `confidence` so cards can render an
 * "Extended outlook" badge / lower opacity / etc.
 */
export function extrapolateDailyForecast(
  real: DailyForecastEntry[],
  extraDays: number,
): DailyForecastEntry[] {
  if (extraDays <= 0 || real.length === 0) return [];

  // Trend signals from the last 3 real days (or as many as we have).
  const tail = real.slice(-Math.min(3, real.length));
  const avgHigh = avg(tail.map((d) => d.high));
  const avgLow = avg(tail.map((d) => d.low));
  const avgRain = avg(tail.map((d) => d.rainChance));
  const lastDate = real[real.length - 1]!.date;
  const lastCondition = real[real.length - 1]!;

  const out: DailyForecastEntry[] = [];
  for (let i = 1; i <= extraDays; i++) {
    const date = addDays(lastDate, i);
    // Small deterministic drift so consecutive days aren't identical, but
    // we never invent a wildly different forecast.
    const drift = Math.sin(i * 0.7) * 1.2;
    const rainDecay = Math.max(0, avgRain - i * 3); // probability decays as we project further
    const confidence: DailyForecastConfidence = i <= 5 ? "medium" : "low";
    out.push({
      date,
      dayLabel: new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "short" }),
      conditionCode: lastCondition.conditionCode,
      condition: lastCondition.condition,
      high: Math.round(avgHigh + drift),
      low: Math.round(avgLow + drift),
      rainChance: Math.round(rainDecay),
      confidence,
    });
  }
  return out;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============================================================
// Geocoding
// ============================================================

type OwmGeoEntry = {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
  local_names?: Record<string, string>;
};

export type GeocodeResult =
  | { status: "ok"; locations: WeatherLocation[] }
  | { status: "error"; reason: "no_key" | "network" | "api"; message?: string };

/**
 * Reverse geocode lat/lon → human-readable place name(s). Returns up to 5
 * candidates (a `WeatherLocation` each) so the UI can pick the most
 * specific one for `displayLabel`.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number,
): Promise<GeocodeResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { status: "error", reason: "no_key" };

  const url = new URL(OWM_GEO_REVERSE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("limit", "5");
  url.searchParams.set("appid", apiKey);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { status: "error", reason: "api", message: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as OwmGeoEntry[];
    return {
      status: "ok",
      locations: data.map((e) =>
        owmGeoToLocation(e, { latitude: lat, longitude: lon }, "gps"),
      ),
    };
  } catch (err) {
    return {
      status: "error",
      reason: "network",
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

/**
 * Text search → matching cities. Powers the manual location picker.
 */
export async function searchLocations(query: string): Promise<GeocodeResult> {
  const apiKey = getApiKey();
  if (!apiKey) return { status: "error", reason: "no_key" };
  const trimmed = query.trim();
  if (!trimmed) return { status: "ok", locations: [] };

  const url = new URL(OWM_GEO_DIRECT);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("limit", "5");
  url.searchParams.set("appid", apiKey);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { status: "error", reason: "api", message: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as OwmGeoEntry[];
    return {
      status: "ok",
      locations: data.map((e) =>
        owmGeoToLocation(e, { latitude: e.lat, longitude: e.lon }, "manual"),
      ),
    };
  } catch (err) {
    return {
      status: "error",
      reason: "network",
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

function owmGeoToLocation(
  e: OwmGeoEntry,
  coords: { latitude: number; longitude: number },
  precision: WeatherLocation["precision"],
): WeatherLocation {
  const name = e.name;
  const region = e.state;
  const country = e.country;
  const displayLabel = region ? `${name}, ${region}` : `${name}, ${country}`;
  return {
    name,
    city: name,
    region,
    country,
    countryCode: country,
    latitude: coords.latitude,
    longitude: coords.longitude,
    precision,
    displayLabel,
  };
}
