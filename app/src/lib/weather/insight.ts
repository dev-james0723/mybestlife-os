/**
 * Deterministic, rule-based weather insight generator. No LLM call —
 * the Weather page should render usable insights even with the API key
 * missing.
 *
 * Phase-E can swap this for a Gemini call if/when the spec asks for AI
 * prose; the shape of the return value is stable so callers don't break.
 */

import type {
  CurrentWeather,
  HourlyForecastEntry,
  WeatherImpactItem,
  WeatherImpactTag,
  WeatherInsight,
} from "./types";

export function generateWeatherInsight(input: {
  current: CurrentWeather;
  hourly: HourlyForecastEntry[];
}): WeatherInsight {
  const { current, hourly } = input;
  const tags = buildTags(current);
  const reminders = buildReminders(current, hourly);
  const impact = buildImpact(current);
  const brief = buildBrief(current, hourly);

  return { brief, tags, reminders, impact };
}

function buildTags(current: CurrentWeather): WeatherImpactTag[] {
  const out: WeatherImpactTag[] = [];
  if (current.conditionCode === "heavy-rain" || current.conditionCode === "thunderstorm") {
    out.push("heavy-rain", "high-impact-commute");
  }
  if (current.humidity >= 80) out.push("high-humidity");
  if ((current.visibility ?? 10) < 5) out.push("low-visibility");
  if (current.windSpeed >= 35) out.push("strong-wind");
  if (current.uvIndex != null && current.uvIndex >= 8) out.push("high-uv");
  if (current.temperature <= 5) out.push("cold-snap");
  if (current.temperature >= 33) out.push("heat-wave");
  return out;
}

function buildReminders(
  current: CurrentWeather,
  hourly: HourlyForecastEntry[],
): WeatherInsight["reminders"] {
  const out: WeatherInsight["reminders"] = [];
  const rainSoon = hourly
    .slice(0, 6)
    .some((h) => h.rainChance >= 60 || h.conditionCode === "heavy-rain");
  if (
    current.conditionCode === "rain" ||
    current.conditionCode === "heavy-rain" ||
    current.conditionCode === "thunderstorm" ||
    rainSoon
  ) {
    out.push({
      iconKey: "umbrella",
      message: "Umbrella essential — rain in the next few hours",
    });
    out.push({
      iconKey: "departure",
      message: "Leave early — traffic may be slower in wet conditions",
    });
  }
  const eveningLow = Math.min(
    ...hourly.slice(0, 12).map((h) => h.temperature),
    current.low,
  );
  if (eveningLow <= 18) {
    out.push({
      iconKey: "apparel",
      message: `Light jacket — temperatures drop to ${eveningLow}°C later`,
    });
  }
  if (current.uvIndex != null && current.uvIndex >= 7) {
    out.push({
      iconKey: "sun",
      message: "Apply sunscreen — UV index is high",
    });
  }
  if (current.windSpeed >= 35) {
    out.push({
      iconKey: "wind",
      message: "Strong winds — secure loose items outdoors",
    });
  }
  if (current.temperature >= 30 && current.humidity >= 70) {
    out.push({
      iconKey: "hydration",
      message: "Hot + humid — hydrate frequently",
    });
  }
  return out.slice(0, 4);
}

function buildImpact(current: CurrentWeather): WeatherImpactItem[] {
  const items: WeatherImpactItem[] = [];

  if (
    current.conditionCode === "rain" ||
    current.conditionCode === "heavy-rain" ||
    current.conditionCode === "thunderstorm"
  ) {
    items.push({
      category: "commute",
      headline: "Wet roads",
      detail: "Leave earlier than usual. Expect slower traffic on major routes.",
    });
    items.push({
      category: "exercise",
      headline: "Indoor preferred",
      detail: "Outdoor exercise not recommended while rain persists.",
    });
    items.push({
      category: "clothing",
      headline: "Waterproof layer",
      detail: "Light breathable clothes with an outer waterproof shell.",
    });
  } else if (current.conditionCode === "snow" || current.conditionCode === "sleet") {
    items.push({
      category: "commute",
      headline: "Slippery surfaces",
      detail: "Allow extra travel time. Watch for icy patches at intersections.",
    });
    items.push({
      category: "clothing",
      headline: "Bundle up",
      detail: "Insulated jacket, gloves, and waterproof boots.",
    });
  } else if (
    current.conditionCode === "clear-day" &&
    current.uvIndex != null &&
    current.uvIndex >= 7
  ) {
    items.push({
      category: "outdoor",
      headline: "High UV",
      detail: "Limit direct sun exposure 11:00–15:00. Sunscreen recommended.",
    });
    items.push({
      category: "exercise",
      headline: "Outdoor friendly",
      detail: "Great window for outdoor activity in the early morning or evening.",
    });
  } else if (current.windSpeed >= 35) {
    items.push({
      category: "commute",
      headline: "Strong winds",
      detail: "Avoid exposed routes if cycling or motorcycling.",
    });
  } else {
    items.push({
      category: "outdoor",
      headline: "Pleasant conditions",
      detail: "Comfortable for most outdoor activities.",
    });
  }

  if (current.humidity >= 80) {
    items.push({
      category: "health",
      headline: "Humid air",
      detail: "Stay hydrated. Asthma and allergies may flare up.",
    });
  }

  return items.slice(0, 4);
}

function buildBrief(
  current: CurrentWeather,
  hourly: HourlyForecastEntry[],
): string {
  const rainHours = hourly
    .slice(0, 8)
    .filter((h) => h.rainChance >= 50 || h.conditionCode.includes("rain"));
  if (rainHours.length >= 2) {
    const lastRain = rainHours[rainHours.length - 1]!;
    return `${current.condition} expected to persist for the next ${rainHours.length * 3} hours. Visibility may be reduced. Recommend delaying outdoor activities until conditions clear around ${lastRain.hourLabel}.`;
  }
  if (current.conditionCode === "clear-day" && current.uvIndex != null && current.uvIndex >= 7) {
    return `Clear and sunny with UV index ${current.uvIndex}. Apply sunscreen if heading out for extended periods.`;
  }
  if (current.windSpeed >= 35) {
    return `Strong winds at ${current.windSpeed} km/h. Outdoor plans may need adjustment.`;
  }
  if (current.temperature >= 33) {
    return `Hot day ahead at ${current.temperature}°C. Stay hydrated and seek shade midday.`;
  }
  if (current.temperature <= 5) {
    return `Cold ${current.condition.toLowerCase()} at ${current.temperature}°C. Layer up before heading out.`;
  }
  return `${current.condition} with comfortable conditions. No major weather impact expected today.`;
}
