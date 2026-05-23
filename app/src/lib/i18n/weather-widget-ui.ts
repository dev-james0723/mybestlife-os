import { DEFAULT_LOCALE, type AppLocale } from "./app-locale";
import { createLocaleCopyMap, type DeepPartial } from "./copy-helpers";
import type { WeatherAlertKey } from "@/lib/weather/widget-summary";

/**
 * Dashboard "Today" weather widget copy. English is canonical; zh-TW is
 * authored, the rest fall back to English via `createLocaleCopyMap`.
 *
 * The live weather suggestion line is generated separately
 * (`buildWeatherSuggestion`) since it depends on conditions + day load.
 */
export type WeatherWidgetCopy = {
  /** Accessible label for the whole tappable card. */
  ariaOpen: string;
  viewDetails: string;
  feelsLike: (temp: number) => string;
  rainLabel: string;
  amountLabel: string;
  nextLabel: string;
  none: string;
  unavailableTitle: string;
  unavailableHint: string;
  retry: string;
  openWeatherPage: string;
  alertTitles: Record<WeatherAlertKey, string>;
};

const en: WeatherWidgetCopy = {
  ariaOpen: "Open full weather",
  viewDetails: "View details",
  feelsLike: (t) => `Feels like ${t}°`,
  rainLabel: "Rain",
  amountLabel: "Amount",
  nextLabel: "Next",
  none: "—",
  unavailableTitle: "Weather unavailable",
  unavailableHint: "Tap to retry or open the Weather page",
  retry: "Retry",
  openWeatherPage: "Open Weather page",
  alertTitles: {
    thunderstorm: "Thunderstorm",
    heavyRain: "Heavy rain",
    wind: "Strong winds",
    heat: "Extreme heat",
  },
};

const zhTW: DeepPartial<WeatherWidgetCopy> = {
  ariaOpen: "打開完整天氣",
  viewDetails: "查看詳情",
  feelsLike: (t) => `體感 ${t}°`,
  rainLabel: "降雨",
  amountLabel: "雨量",
  nextLabel: "下次",
  none: "—",
  unavailableTitle: "天氣資料無法載入",
  unavailableHint: "輕觸重試，或打開天氣頁面",
  retry: "重試",
  openWeatherPage: "打開天氣頁面",
  alertTitles: {
    thunderstorm: "雷暴",
    heavyRain: "大雨",
    wind: "強風",
    heat: "酷熱",
  },
};

const localized = createLocaleCopyMap<WeatherWidgetCopy>(en, {
  "zh-TW": zhTW,
});

export function getWeatherWidgetCopy(locale: AppLocale): WeatherWidgetCopy {
  return localized[locale] ?? localized[DEFAULT_LOCALE];
}
