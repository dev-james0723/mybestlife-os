/**
 * Deterministic, rule-based weather suggestion for the dashboard widget.
 *
 * No LLM call — the widget must produce a useful, private-assistant-toned
 * line even when offline. The suggestion blends weather risk with the
 * day's load (Recovery → slower pace) and whether the calendar has outdoor
 * commitments today.
 *
 * Only `en` and `zh-TW` are authored; every other locale falls back to
 * English (matching the project's `createLocaleCopyMap` fallback rule).
 */

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { DayLoad } from "@/lib/calendar/types";
import type { WeatherSummary } from "./widget-summary";

type Phrase = { en: string; zhTW: string };

export type WeatherSuggestionInput = {
  summary: WeatherSummary;
  load: DayLoad;
  hasOutdoorEvents: boolean;
  locale: AppLocale;
};

export function buildWeatherSuggestion(input: WeatherSuggestionInput): string {
  const phrase = pickPhrase(input);
  return input.locale === "zh-TW" ? phrase.zhTW : phrase.en;
}

function pickPhrase({
  summary,
  load,
  hasOutdoorEvents,
}: Omit<WeatherSuggestionInput, "locale">): Phrase {
  const recovery = load === "Recovery";
  const rainLikely = summary.rainChance >= 60 || summary.conditionCode.includes("rain");
  const stormy = summary.conditionCode === "thunderstorm";
  const hotHumid = summary.temperature >= 30 && summary.humidity >= 70;
  const highUv = summary.uvIndex >= 7;
  const windy = summary.windSpeed >= 35;

  // 1. Stormy — highest priority, clearest caution.
  if (stormy) {
    if (hasOutdoorEvents) {
      return {
        en: "Thunderstorms around — bring an umbrella and pad extra time for any outdoor plans today.",
        zhTW: "有雷暴，記得帶傘，今日外出行程預多啲時間會穩陣啲。",
      };
    }
    return {
      en: "Thunderstorms expected. Keep plans indoors where you can and stay flexible.",
      zhTW: "預料有雷暴，行程盡量安排室內，留少少彈性。",
    };
  }

  // 2. Rain likely.
  if (rainLikely) {
    if (hasOutdoorEvents) {
      return {
        en: "Good chance of rain later — bring an umbrella; it may slow your commute or outdoor timing.",
        zhTW: "稍後有機會落雨，記得帶傘，可能會影響通勤或外出時間。",
      };
    }
    if (recovery) {
      return {
        en: "Rain likely later. An easy umbrella day — keep things slow and lean on indoor plans.",
        zhTW: "稍後有機會落雨。今日適合放慢腳步，帶把傘，安排室內活動就好。",
      };
    }
    return {
      en: "Humid with a good chance of rain later. Bring an umbrella and keep plans flexible.",
      zhTW: "今日偏濕熱，稍後有機會落雨。外出前帶傘，行程留少少彈性。",
    };
  }

  // 3. Hot + humid.
  if (hotHumid) {
    if (recovery) {
      return {
        en: "Hot and humid — a good day to keep the pace low. Hydrate and avoid intense outdoor stretches.",
        zhTW: "又熱又濕，今日啱晒放慢節奏。記得補水，避免長時間在戶外。",
      };
    }
    return {
      en: "Hot and humid today. Hydrate often and skip intense outdoor activity in the afternoon.",
      zhTW: "今日又熱又濕，記得勤補水，下午避免劇烈戶外活動。",
    };
  }

  // 4. High UV.
  if (highUv) {
    return {
      en: "Strong sun today — sunscreen if you're out, and avoid long midday exposure.",
      zhTW: "今日陽光猛烈，外出記得搽防曬，正午避免長時間曝曬。",
    };
  }

  // 5. Windy.
  if (windy) {
    return {
      en: "Breezy out there — take it easy on exposed routes if you're heading out.",
      zhTW: "今日風勢頗大，外出行開揚路段時小心啲。",
    };
  }

  // 6. Mild / no notable risk.
  if (recovery) {
    return {
      en: "Calm, comfortable weather — a gentle window for a short walk or an easy reset.",
      zhTW: "天氣平和舒適，正好出去散個步、輕鬆充下電。",
    };
  }
  if (hasOutdoorEvents) {
    return {
      en: "Pleasant conditions all round — good timing for your outdoor plans today.",
      zhTW: "天氣相當不錯，今日外出行程時機剛好。",
    };
  }
  return {
    en: "Mild and clear — a nice window to get outside or use the open time well.",
    zhTW: "天氣溫和清爽，啱晒出去抖抖氣或好好善用今日空檔。",
  };
}
