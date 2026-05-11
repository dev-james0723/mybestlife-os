import type { AppLocale } from "./app-locale";
import { DEFAULT_LOCALE, isAppLocale } from "./app-locale";

/**
 * URL segment for each app language (lowercase). Traditional Chinese uses `zh-hk`
 * as requested; it maps to the internal `zh-TW` locale bundle.
 */
export const LOCALE_URL_SLUGS = [
  "en",
  "vi",
  "es",
  "it",
  "fr",
  "ko",
  "ja",
  "zh-cn",
  "zh-hk",
] as const;

export type LocaleUrlSlug = (typeof LOCALE_URL_SLUGS)[number];

/** BCP 47-ish value for <html lang> */
export const LOCALE_HTML_LANG: Record<LocaleUrlSlug, string> = {
  en: "en",
  vi: "vi",
  es: "es",
  it: "it",
  fr: "fr",
  ko: "ko",
  ja: "ja",
  "zh-cn": "zh-CN",
  "zh-hk": "zh-HK",
};

export function isLocaleUrlSlug(value: string): value is LocaleUrlSlug {
  const s = value.toLowerCase();
  return (LOCALE_URL_SLUGS as readonly string[]).includes(s);
}

export function normalizeLocaleSlug(value: string): LocaleUrlSlug | null {
  const s = value.toLowerCase();
  return isLocaleUrlSlug(s) ? s : null;
}

export function appLocaleToUrlSlug(locale: AppLocale): LocaleUrlSlug {
  switch (locale) {
    case "zh-TW":
      return "zh-hk";
    case "zh-CN":
      return "zh-cn";
    case "en":
      return "en";
    case "vi":
      return "vi";
    case "es":
      return "es";
    case "it":
      return "it";
    case "fr":
      return "fr";
    case "ko":
      return "ko";
    case "ja":
      return "ja";
    default:
      return "en";
  }
}

export function urlSlugToAppLocale(slug: string): AppLocale {
  const s = slug.toLowerCase();
  if (s === "zh-hk") return "zh-TW";
  if (s === "zh-cn") return "zh-CN";
  if (isAppLocale(s)) return s;
  return DEFAULT_LOCALE;
}

/** Default first segment for redirects (English). */
export const DEFAULT_LOCALE_SLUG: LocaleUrlSlug = "en";

export function parseLocaleSlugParam(param: string | string[] | undefined): LocaleUrlSlug {
  const raw = Array.isArray(param) ? param[0] : param;
  return normalizeLocaleSlug(raw ?? "") ?? DEFAULT_LOCALE_SLUG;
}