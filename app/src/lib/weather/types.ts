/**
 * Shared weather types — kept narrow and provider-agnostic so the OpenWeather
 * adapter can be swapped for another source without touching the UI.
 */

// ============================================================
// Location
// ============================================================

export type WeatherLocationPrecision =
  | "gps"
  | "district"
  | "nearest_station"
  | "city"
  | "manual"
  | "fallback";

export type WeatherLocation = {
  /** Best human display label (e.g. "Tin Shui Wai", "Hong Kong"). */
  name: string;
  /** Optional precise sub-area when known. */
  district?: string;
  /** Most-specific city / region (matches OpenWeather's `name`). */
  city: string;
  region?: string;
  country: string;
  /** ISO-3166-1 alpha-2 (e.g. "HK", "US"). */
  countryCode?: string;
  latitude: number;
  longitude: number;
  /** IANA timezone, when known. */
  timezone?: string;
  precision: WeatherLocationPrecision;
  /** Localized display label rendered next to the temperature. */
  displayLabel: string;
};

// ============================================================
// Conditions
// ============================================================

/**
 * Normalized condition codes mapped from OpenWeather's `weather.id` /
 * `weather.main`. Used by the scene mapper + icon picker so the UI doesn't
 * leak provider-specific strings.
 */
export type WeatherConditionCode =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy"
  | "fog"
  | "light-rain"
  | "rain"
  | "heavy-rain"
  | "thunderstorm"
  | "snow"
  | "sleet"
  | "wind"
  | "hot"
  | "cold";

export type WeatherIntensity = "light" | "moderate" | "heavy" | "extreme";
export type WeatherTimeOfDay = "dawn" | "morning" | "midday" | "afternoon" | "evening" | "night";

// ============================================================
// Current weather
// ============================================================

export type CurrentWeather = {
  temperature: number;
  feelsLike: number;
  /** Human-facing condition text, e.g. "Heavy Rain". */
  condition: string;
  conditionCode: WeatherConditionCode;
  intensity: WeatherIntensity;
  high: number;
  low: number;
  rainChance: number; // 0..100
  humidity: number; // 0..100
  windSpeed: number; // km/h
  windDirection?: string; // "N" / "NE" / "E" / etc.
  windDegrees?: number;
  uvIndex: number;
  uvLabel: "Low" | "Moderate" | "High" | "Very High" | "Extreme";
  sunrise?: string; // ISO
  sunset?: string; // ISO
  /** km. */
  visibility?: number;
  /** hPa. */
  pressure?: number;
  /** °C. */
  dewPoint?: number;
  airQualityIndex?: number;
  /** US-EPA AQI category, when air quality is available. */
  aqiCategory?:
    | "good"
    | "moderate"
    | "sensitive"
    | "unhealthy"
    | "very-unhealthy"
    | "hazardous";
  updatedAt: string; // ISO
};

// ============================================================
// Forecast
// ============================================================

export type HourlyForecastEntry = {
  time: string; // ISO
  hourLabel: string; // "14:00"
  temperature: number;
  conditionCode: WeatherConditionCode;
  condition: string;
  rainChance: number; // 0..100
  precipitationMm?: number;
};

export type DailyForecastConfidence = "high" | "medium" | "low";

export type DailyForecastEntry = {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon"
  conditionCode: WeatherConditionCode;
  condition: string;
  high: number;
  low: number;
  rainChance: number; // 0..100
  windSpeed?: number;
  windDirection?: string;
  /**
   * - high: real data (days 1-5 on the free OpenWeather forecast).
   * - medium: extrapolated from observed 5-day trend (days 6-10).
   * - low: long-range outlook (days 11-15) — UI should warn the user
   *   the further the day is, the less certain the projection.
   */
  confidence: DailyForecastConfidence;
};

// ============================================================
// Composed page state
// ============================================================

export type WeatherPageStatus = "idle" | "loading" | "error" | "ok";

export type WeatherPageData = {
  status: WeatherPageStatus;
  location: WeatherLocation | null;
  current: CurrentWeather | null;
  hourly: HourlyForecastEntry[];
  daily: DailyForecastEntry[];
  /** Source of the background image, populated when Unsplash succeeds. */
  backgroundImageUrl: string | null;
  backgroundCredit?: {
    /** Photographer name. */
    name: string;
    /** Photographer profile URL. */
    profileUrl: string;
    /** Direct Unsplash link to the photo, required for attribution. */
    photoUrl: string;
  };
  errorMessage?: string;
};

// ============================================================
// AI Insight
// ============================================================

export type WeatherImpactCategory =
  | "commute"
  | "exercise"
  | "clothing"
  | "outdoor"
  | "travel"
  | "health";

export type WeatherImpactTag =
  | "high-impact-commute"
  | "high-humidity"
  | "low-visibility"
  | "heavy-rain"
  | "strong-wind"
  | "high-uv"
  | "cold-snap"
  | "heat-wave";

export type WeatherImpactItem = {
  category: WeatherImpactCategory;
  /** Short headline (e.g. "Wet roads"). */
  headline: string;
  /** 1-2 sentence detail. */
  detail: string;
};

export type WeatherInsight = {
  /** 1-3 sentence executive brief. */
  brief: string;
  tags: WeatherImpactTag[];
  reminders: Array<{
    iconKey: "umbrella" | "departure" | "apparel" | "sun" | "wind" | "hydration";
    message: string;
  }>;
  impact: WeatherImpactItem[];
};
