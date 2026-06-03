/**
 * Thin wrapper around OpenWeatherMap current-weather API + best-effort
 * IP geolocation (ip-api.com, no key) used as fallback.
 *
 * Contract:
 *   - Always resolves successfully. Failures are surfaced via the return
 *     `status` field so UI can render a neutral badge instead of crashing.
 *   - No dependencies besides `fetch`. Safe to call from client only.
 *
 * NOTE: We intentionally do NOT expose forecast endpoints — the spec says
 * the weather badge is a display-only affordance.
 */

export type WeatherCoords = { lat: number; lon: number; city?: string };

export type WeatherSnapshot = {
  status: "ok";
  tempC: number;
  /** Human description, e.g. "Cloudy". */
  description: string;
  /** Canonical OpenWeather condition main, e.g. "Clouds". */
  main: string;
  /** OpenWeather numeric condition id (e.g. 803 = broken clouds). */
  weatherId: number;
  icon: string;
  city: string;
  fetchedAt: number;
};

export type WeatherError = {
  status: "error";
  reason: "no_key" | "no_location" | "network" | "api";
  message?: string;
};

export type WeatherResult = WeatherSnapshot | WeatherError;

const OWM_CURRENT = "https://api.openweathermap.org/data/2.5/weather";
const IP_GEO = "http://ip-api.com/json/?fields=status,message,city,lat,lon";

/**
 * Read the publishable OpenWeather key. Env is intentionally
 * `NEXT_PUBLIC_*` because we only call the public current-weather endpoint
 * from the client; no PII flows through and the key is rate-limited.
 */
function getApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
  return key && key.length > 0 ? key : null;
}

/**
 * Try `navigator.geolocation` only if the Permissions API reports
 * `granted`. We deliberately do NOT trigger the browser prompt — UX
 * requirement is to stay silent; fall through to IP-based lookup
 * instead.
 */
async function tryGeolocation(): Promise<WeatherCoords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  try {
    const perms = (navigator as Navigator & {
      permissions?: Permissions;
    }).permissions;
    if (!perms?.query) return null;
    const status = await perms.query({ name: "geolocation" as PermissionName });
    if (status.state !== "granted") return null;
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

async function tryIpLookup(): Promise<WeatherCoords | null> {
  if (typeof window !== "undefined" && window.location.protocol !== "http:") {
    return null;
  }
  try {
    const res = await fetch(IP_GEO, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      city?: string;
      lat?: number;
      lon?: number;
    };
    if (data.status !== "success" || data.lat == null || data.lon == null) {
      return null;
    }
    return { lat: data.lat, lon: data.lon, city: data.city };
  } catch {
    return null;
  }
}

/**
 * Resolve the user's approximate location without prompting permissions.
 * Priority: granted geolocation → IP lookup → null.
 */
export async function resolveLocation(): Promise<WeatherCoords | null> {
  const geo = await tryGeolocation();
  if (geo) return geo;
  return tryIpLookup();
}

/**
 * Triggers the browser location permission prompt (onboarding / settings).
 * Unlike `resolveLocation`, this does not silently skip when permission is not pre-granted.
 */
export function requestDeviceGeolocation(): Promise<WeatherCoords | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 0 }
    );
  });
}

export async function fetchCurrentWeather(
  coords: WeatherCoords
): Promise<WeatherResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      status: "error",
      reason: "no_key",
      message: "OpenWeather API key missing",
    };
  }
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
    const data = (await res.json()) as {
      weather?: Array<{ id?: number; main?: string; description?: string; icon?: string }>;
      main?: { temp?: number };
      name?: string;
    };
    const w = data.weather?.[0];
    return {
      status: "ok",
      tempC: Math.round(data.main?.temp ?? 0),
      description: capitalize(w?.description ?? w?.main ?? ""),
      main: w?.main ?? "Clear",
      weatherId: w?.id ?? 800,
      icon: w?.icon ?? "",
      city: coords.city ?? data.name ?? "",
      fetchedAt: Date.now(),
    };
  } catch (err) {
    return {
      status: "error",
      reason: "network",
      message: err instanceof Error ? err.message : undefined,
    };
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
