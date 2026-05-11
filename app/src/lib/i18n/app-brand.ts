import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE } from "./app-locale";

/** Localized product name shown in chrome (sidebar, top bar, settings, etc.). */
const APP_DISPLAY_NAME_BY_LOCALE: Record<AppLocale, string> = {
  en: "My Best Life OS",
  "zh-TW": "理想人生 OS",
  "zh-CN": "理想人生 OS",
  ja: "最高の毎日OS",
  ko: "최상의 하루 OS",
  fr: "OS Ma meilleure vie",
  it: "OS La mia vita migliore",
  es: "OS Mi mejor vida",
  vi: "OS Cuộc sống tốt nhất",
};

export function getAppDisplayName(locale: AppLocale): string {
  return APP_DISPLAY_NAME_BY_LOCALE[locale] ?? APP_DISPLAY_NAME_BY_LOCALE[DEFAULT_LOCALE];
}
