import { describe, expect, it } from "vitest";
import { buildWeatherSummary } from "@/lib/weather/widget-summary";
import type { CurrentWeather, HourlyForecastEntry } from "@/lib/weather/types";

function current(overrides: Partial<CurrentWeather> = {}): CurrentWeather {
  return {
    temperature: 29,
    feelsLike: 32,
    condition: "Cloudy",
    conditionCode: "cloudy",
    intensity: "light",
    high: 31,
    low: 26,
    rainChance: 20,
    humidity: 75,
    windSpeed: 12,
    uvIndex: 4,
    uvLabel: "Moderate",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function hour(overrides: Partial<HourlyForecastEntry> = {}): HourlyForecastEntry {
  return {
    time: "2026-05-23T22:00:00.000Z",
    hourLabel: "22:00",
    temperature: 28,
    conditionCode: "cloudy",
    condition: "Cloudy",
    rainChance: 10,
    ...overrides,
  };
}

describe("buildWeatherSummary", () => {
  it("maps the core fields and location", () => {
    const s = buildWeatherSummary(current(), [], "Tsuen Wan");
    expect(s.location).toBe("Tsuen Wan");
    expect(s.temperature).toBe(29);
    expect(s.feelsLike).toBe(32);
    expect(s.condition).toBe("Cloudy");
  });

  it("finds the next rain window (>= 50% PoP)", () => {
    const hourly = [
      hour({ time: "2026-05-23T19:00:00.000Z", rainChance: 20 }),
      hour({ time: "2026-05-23T22:00:00.000Z", rainChance: 68 }),
    ];
    const s = buildWeatherSummary(current(), hourly, "Tsuen Wan");
    expect(s.nextRainTime).toBe("2026-05-23T22:00:00.000Z");
  });

  it("treats measurable precipitation as a rain window even below 50% PoP", () => {
    const hourly = [hour({ rainChance: 30, precipitationMm: 0.4 })];
    const s = buildWeatherSummary(current(), hourly, "Tsuen Wan");
    expect(s.nextRainTime).toBe(hourly[0]!.time);
  });

  it("reports the peak precipitation across the next three buckets, rounded to 0.1mm", () => {
    const hourly = [
      hour({ precipitationMm: 1.2 }),
      hour({ precipitationMm: 4.23 }),
      hour({ precipitationMm: 0.8 }),
      hour({ precipitationMm: 9 }), // outside the 3-bucket window
    ];
    const s = buildWeatherSummary(current(), hourly, "Tsuen Wan");
    expect(s.precipitationMm).toBe(4.2);
  });

  it("derives a severe alert for thunderstorms", () => {
    const s = buildWeatherSummary(current({ conditionCode: "thunderstorm" }), [], "X");
    expect(s.alert).toEqual({ level: "severe", titleKey: "thunderstorm" });
  });

  it("derives a moderate alert for heavy rain", () => {
    const s = buildWeatherSummary(current({ conditionCode: "heavy-rain" }), [], "X");
    expect(s.alert).toEqual({ level: "moderate", titleKey: "heavyRain" });
  });

  it("derives a heat alert at/above 35C", () => {
    const s = buildWeatherSummary(current({ temperature: 36, conditionCode: "clear-day" }), [], "X");
    expect(s.alert).toEqual({ level: "moderate", titleKey: "heat" });
  });

  it("leaves alert undefined for calm conditions", () => {
    const s = buildWeatherSummary(current(), [], "X");
    expect(s.alert).toBeUndefined();
  });
});
