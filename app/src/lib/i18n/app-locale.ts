export const APP_LOCALES = [
  "en",
  "zh-TW",
  "zh-CN",
  "ja",
  "ko",
  "fr",
  "it",
  "es",
  "vi",
] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export function isAppLocale(value: string): value is AppLocale {
  return (APP_LOCALES as readonly string[]).includes(value);
}

export function parseAppLocale(value: unknown): AppLocale {
  if (typeof value === "string") {
    const v = value.trim();
    if (v.toLowerCase() === "zh-hk") return "zh-TW";
    if (isAppLocale(v)) return v;
  }
  return DEFAULT_LOCALE;
}

/** Labels shown in the settings language dropdown (native names). */
export const LOCALE_SELECT_LABELS: Record<AppLocale, string> = {
  en: "English",
  "zh-TW": "繁體中文（香港）",
  "zh-CN": "简体中文",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  vi: "Tiếng Việt",
};

/** Flag emoji for each locale (visual cue in settings). */
export const LOCALE_FLAG_EMOJI: Record<AppLocale, string> = {
  en: "🇺🇸",
  "zh-TW": "🇭🇰",
  "zh-CN": "🇨🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  fr: "🇫🇷",
  it: "🇮🇹",
  es: "🇪🇸",
  vi: "🇻🇳",
};
