import type { Locale } from "date-fns";
import {
  enUS,
  es,
  fr,
  it,
  ja,
  ko,
  vi,
  zhCN,
  zhTW,
} from "date-fns/locale";
import type { AppLocale } from "./app-locale";

const map: Record<AppLocale, Locale> = {
  en: enUS,
  "zh-TW": zhTW,
  "zh-CN": zhCN,
  ja,
  ko,
  fr,
  it,
  es,
  vi,
};

export function getDateFnsLocale(locale: AppLocale): Locale {
  return map[locale] ?? enUS;
}
