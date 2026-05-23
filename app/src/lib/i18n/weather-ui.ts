import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";

/**
 * Weather page UI copy. English is the canonical source; Phase E will
 * complete the 9-locale overrides. Until then non-English locales fall
 * back via `createLocaleCopyMap`.
 */
export type WeatherUiCopy = {
  pageTitle: string;
  pageSubtitle: string;

  // Status / errors
  loadingTitle: string;
  errorTitle: string;
  retry: string;
  locationPermissionPrompt: string;
  useMyLocation: string;
  unavailable: string;

  // Hero
  feelsLike: (temp: number) => string;
  highLow: (high: number, low: number) => string;
  updatedJustNow: string;
  updatedAt: (label: string) => string;
  precisionGps: string;
  precisionDistrict: string;
  precisionNearestStation: string;
  precisionCity: string;
  precisionManual: string;
  precisionFallback: string;
  aiBriefTitle: string;

  // Location search
  searchPlaceholder: string;
  searchEmpty: string;
  searchError: string;
  recentLocations: string;
  clearSelectedLocation: string;

  // Metric labels
  metricUvIndex: string;
  metricHumidity: string;
  metricWind: string;
  metricRainChance: string;
  metricVisibility: string;
  metricPressure: string;
  metricDewPoint: string;
  metricAirQuality: string;
  uvLow: string;
  uvModerate: string;
  uvHigh: string;
  uvVeryHigh: string;
  uvExtreme: string;

  // Radar
  radarTitle: string;
  radarSatellite: string;
  radarStreet: string;
  radarComingSoon: string;

  // Insights / impact
  atmosphericInsightsTitle: string;
  precipitationIntensityTitle: string;
  smartRemindersTitle: string;
  aiImpactTitle: string;
  impactCommute: string;
  impactExercise: string;
  impactClothing: string;
  impactOutdoor: string;
  impactTravel: string;
  impactHealth: string;

  // Charts
  temperatureTrendTitle: string;
  precipitationTrendTitle: string;
  next24h: string;

  // Forecast tabs
  forecastToday: string;
  forecast7Days: string;
  forecast10Days: string;
  forecast15Days: string;
  forecastNow: string;
  confidenceHigh: string;
  confidenceMedium: string;
  confidenceLow: string;
  extendedOutlookNotice: string;

  // Footer / credit
  photoCredit: (name: string) => string;
};

const en: WeatherUiCopy = {
  pageTitle: "Weather",
  pageSubtitle: "Cinematic forecast and conditions",

  loadingTitle: "Loading weather…",
  errorTitle: "Weather unavailable",
  retry: "Retry",
  locationPermissionPrompt: "Allow location access for accurate weather",
  useMyLocation: "Use my location",
  unavailable: "—",

  feelsLike: (t) => `Feels like ${t}°`,
  highLow: (h, l) => `H: ${h}° L: ${l}°`,
  updatedJustNow: "Updated just now",
  updatedAt: (label) => `Updated ${label}`,
  precisionGps: "Using GPS location",
  precisionDistrict: "District-level forecast",
  precisionNearestStation: "Nearest forecast point",
  precisionCity: "City-level forecast",
  precisionManual: "Using selected location",
  precisionFallback: "Approximate location",
  aiBriefTitle: "AI Executive Brief",

  searchPlaceholder: "Search city or district…",
  searchEmpty: "No matches",
  searchError: "Search failed — try again",
  recentLocations: "Recent",
  clearSelectedLocation: "Clear selection",

  metricUvIndex: "UV Index",
  metricHumidity: "Humidity",
  metricWind: "Wind",
  metricRainChance: "Rain chance",
  metricVisibility: "Visibility",
  metricPressure: "Pressure",
  metricDewPoint: "Dew point",
  metricAirQuality: "Air quality",
  uvLow: "Low",
  uvModerate: "Moderate",
  uvHigh: "High",
  uvVeryHigh: "Very High",
  uvExtreme: "Extreme",

  radarTitle: "Live Radar",
  radarSatellite: "Satellite",
  radarStreet: "Street View",
  radarComingSoon: "Radar imagery coming soon — provider integration pending.",

  atmosphericInsightsTitle: "Atmospheric Insights",
  precipitationIntensityTitle: "Precipitation Intensity",
  smartRemindersTitle: "Smart Reminders",
  aiImpactTitle: "AI Weather Impact",
  impactCommute: "Commute",
  impactExercise: "Exercise",
  impactClothing: "Clothing",
  impactOutdoor: "Outdoor",
  impactTravel: "Travel",
  impactHealth: "Health",

  temperatureTrendTitle: "Temperature Trend",
  precipitationTrendTitle: "Precipitation Trend",
  next24h: "Next 24h",

  forecastToday: "Today",
  forecast7Days: "7 Days",
  forecast10Days: "10 Days",
  forecast15Days: "15 Days",
  forecastNow: "Now",
  confidenceHigh: "High confidence",
  confidenceMedium: "Medium confidence",
  confidenceLow: "Extended outlook",
  extendedOutlookNotice:
    "Days 6+ are an extended outlook based on the 5-day forecast trend and should not be treated as a hard forecast.",

  photoCredit: (name) => `Photo · ${name}`,
};

const localizedCopy = createLocaleCopyMap<WeatherUiCopy>(en, {});

export function getWeatherUiCopy(locale: AppLocale): WeatherUiCopy {
  return localizedCopy[locale] ?? localizedCopy[DEFAULT_LOCALE];
}

// Quiet unused-types warning during phase A; helper-types kept for future
// use in component prop overrides.
export type WeatherUiOverride = DeepPartial<WeatherUiCopy>;
