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
 * Returns nulls on any failure; callers keep the OpenWeather data and the
 * UI shows "—" for whatever is missing.
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

export async function fetchUvAndAirQuality(
  lat: number,
  lon: number,
): Promise<UvAirQuality> {
  const [uvIndex, aqi] = await Promise.all([
    fetchUv(lat, lon),
    fetchAqi(lat, lon),
  ]);
  return {
    uvIndex,
    airQualityIndex: aqi,
    aqiCategory: aqi != null ? categorizeAqi(aqi) : null,
  };
}

async function fetchUv(lat: number, lon: number): Promise<number | null> {
  const url = new URL(OM_FORECAST);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "uv_index");
  url.searchParams.set("timezone", "auto");
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { uv_index?: number } };
    const uv = data.current?.uv_index;
    return typeof uv === "number" ? Math.round(uv) : null;
  } catch {
    return null;
  }
}

async function fetchAqi(lat: number, lon: number): Promise<number | null> {
  const url = new URL(OM_AIR_QUALITY);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "us_aqi");
  url.searchParams.set("timezone", "auto");
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { us_aqi?: number } };
    const aqi = data.current?.us_aqi;
    return typeof aqi === "number" ? Math.round(aqi) : null;
  } catch {
    return null;
  }
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
