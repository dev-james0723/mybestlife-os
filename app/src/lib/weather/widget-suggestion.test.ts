import { describe, expect, it } from "vitest";
import { buildWeatherSuggestion } from "@/lib/weather/widget-suggestion";
import type { WeatherSummary } from "@/lib/weather/widget-summary";

function summary(overrides: Partial<WeatherSummary> = {}): WeatherSummary {
  return {
    location: "Tsuen Wan",
    temperature: 24,
    feelsLike: 24,
    condition: "Clear",
    conditionCode: "clear-day",
    rainChance: 10,
    precipitationMm: 0,
    humidity: 50,
    windSpeed: 8,
    uvIndex: 3,
    ...overrides,
  };
}

describe("buildWeatherSuggestion", () => {
  it("prioritizes thunderstorms over everything else", () => {
    const out = buildWeatherSuggestion({
      summary: summary({ conditionCode: "thunderstorm", rainChance: 90, temperature: 33, humidity: 80 }),
      load: "Balanced",
      hasOutdoorEvents: false,
      locale: "en",
    });
    expect(out.toLowerCase()).toContain("thunderstorm");
  });

  it("flags commute/outdoor timing when rain is likely and there are outdoor events", () => {
    const out = buildWeatherSuggestion({
      summary: summary({ rainChance: 68, conditionCode: "rain" }),
      load: "Balanced",
      hasOutdoorEvents: true,
      locale: "en",
    });
    expect(out.toLowerCase()).toMatch(/commute|outdoor/);
    expect(out.toLowerCase()).toContain("umbrella");
  });

  it("phrases rain advice around a slower pace on recovery days", () => {
    const out = buildWeatherSuggestion({
      summary: summary({ rainChance: 70, conditionCode: "rain" }),
      load: "Recovery",
      hasOutdoorEvents: false,
      locale: "en",
    });
    expect(out.toLowerCase()).toMatch(/slow|easy/);
  });

  it("suggests hydration when hot and humid (and no rain)", () => {
    const out = buildWeatherSuggestion({
      summary: summary({ temperature: 32, humidity: 78, conditionCode: "clear-day", rainChance: 5 }),
      load: "Balanced",
      hasOutdoorEvents: false,
      locale: "en",
    });
    expect(out.toLowerCase()).toMatch(/hydrate|humid/);
  });

  it("suggests sunscreen on high-UV days", () => {
    const out = buildWeatherSuggestion({
      summary: summary({ uvIndex: 9, conditionCode: "clear-day" }),
      load: "Balanced",
      hasOutdoorEvents: false,
      locale: "en",
    });
    expect(out.toLowerCase()).toMatch(/sun|sunscreen/);
  });

  it("returns a localized zh-TW string for the same input", () => {
    const input = {
      summary: summary({ rainChance: 68, conditionCode: "rain" as const }),
      load: "Balanced" as const,
      hasOutdoorEvents: false,
    };
    const en = buildWeatherSuggestion({ ...input, locale: "en" });
    const zh = buildWeatherSuggestion({ ...input, locale: "zh-TW" });
    expect(zh).not.toBe(en);
    expect(zh).toMatch(/[一-鿿]/); // contains CJK characters
  });

  it("falls back to English for unauthored locales", () => {
    const input = {
      summary: summary({ rainChance: 68, conditionCode: "rain" as const }),
      load: "Balanced" as const,
      hasOutdoorEvents: false,
    };
    const en = buildWeatherSuggestion({ ...input, locale: "en" });
    const fr = buildWeatherSuggestion({ ...input, locale: "fr" });
    expect(fr).toBe(en);
  });

  it("gives a gentle reset suggestion on calm recovery days", () => {
    const out = buildWeatherSuggestion({
      summary: summary(),
      load: "Recovery",
      hasOutdoorEvents: false,
      locale: "en",
    });
    expect(out.toLowerCase()).toMatch(/walk|reset|gentle/);
  });
});
