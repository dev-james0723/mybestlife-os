/**
 * Open-Meteo adapter — free, key-less UV index + air quality.
 *
 * OpenWeather's free current-weather endpoint exposes neither UV nor AQI,
 * so we top up those two fields from Open-Meteo (https://open-meteo.com),
 * which is free for non-commercial use, needs no API key, and is
 * CORS-friendly.
 *
 *   - Forecast API     → current.uv_index
 *   - Air-Quality API  → current.us_aqi (US EPA 0-500 scale)
 *
 * In the browser we prefer the same-origin `/api/weather/supplements` proxy
 * (ad-blockers often block third-party weather APIs). Returns nulls on any
 * failure; callers keep the OpenWeather data and the UI shows "—" for
 * whatever is missing.
 */

const OM_FORECAST = "https://api.open-meteo.com/v1/forecast";
const OM_AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality";

export type AqiCategory =
  | "good"
  | "moderate"
  | "sensitive"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export type UvAirQuality = {
  /** Rounded current UV index, or null when unavailable. */
  uvIndex: number | null;
  /** US EPA AQI (0-500), or null when unavailable. */
  airQualityIndex: number | null;
  aqiCategory: AqiCategory | null;
};

type FetchUvAirQualityOptions = {
  useProxy?: boolean;
};

/** Client entry — same-origin proxy, then direct Open-Meteo fallback. */
export async function fetchUvAndAirQuality(
  lat: number,
  lon: number,
  options: FetchUvAirQualityOptions = {},
): Promise<UvAirQuality> {
  if (typeof window !== "undefined" && options.useProxy !== false) {
    const proxied = await fetchUvAndAirQualityViaApi(lat, lon);
    if (proxied.uvIndex != null || proxied.airQualityIndex != null) {
      return proxied;
    }
  }
  return fetchUvAndAirQualityUpstream(lat, lon);
}

/** Server / API route — calls Open-Meteo directly. */
export async function fetchUvAndAirQualityUpstream(
  lat: number,
  lon: number,
): Promise<UvAirQuality> {
  const [uvIndex, aqi] = await Promise.all([
    fetchUvUpstream(lat, lon),
    fetchAqiUpstream(lat, lon),
  ]);
  return {
    uvIndex,
    airQualityIndex: aqi,
    aqiCategory: aqi != null ? categorizeAqi(aqi) : null,
  };
}

async function fetchUvAndAirQualityViaApi(
  lat: number,
  lon: number,
): Promise<UvAirQuality> {
  try {
    const url = new URL("/api/weather/supplements", window.location.origin);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return { uvIndex: null, airQualityIndex: null, aqiCategory: null };
    }
    const data = (await res.json()) as UvAirQuality;
    return {
      uvIndex: parseUvIndex(data.uvIndex),
      airQualityIndex: parseAqi(data.airQualityIndex),
      aqiCategory: data.aqiCategory ?? null,
    };
  } catch {
    return { uvIndex: null, airQualityIndex: null, aqiCategory: null };
  }
}

async function fetchUvUpstream(lat: number, lon: number): Promise<number | null> {
  const url = new URL(OM_FORECAST);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "uv_index");
  url.searchParams.set("timezone", "auto");
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { uv_index?: unknown } };
    return parseUvIndex(data.current?.uv_index);
  } catch {
    return null;
  }
}

async function fetchAqiUpstream(lat: number, lon: number): Promise<number | null> {
  const url = new URL(OM_AIR_QUALITY);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "us_aqi");
  url.searchParams.set("timezone", "auto");
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { us_aqi?: unknown } };
    return parseAqi(data.current?.us_aqi);
  } catch {
    return null;
  }
}

/** UV is 0 at night — must not treat 0 as missing. */
export function parseUvIndex(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.max(0, n));
}

function parseAqi(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.max(0, n));
}

/** US EPA AQI breakpoints. */
export function categorizeAqi(aqi: number): AqiCategory {
  if (aqi <= 50) return "good";
  if (aqi <= 100) return "moderate";
  if (aqi <= 150) return "sensitive";
  if (aqi <= 200) return "unhealthy";
  if (aqi <= 300) return "very-unhealthy";
  return "hazardous";
}
