import type { AppLocale } from "@/lib/i18n/app-locale";

/** Human-readable language label for Gemini system prompts. */
export function localeToGeminiLanguage(locale: AppLocale): string {
  const map: Record<AppLocale, string> = {
    en: "English",
    "zh-TW": "Traditional Chinese (Hong Kong)",
    "zh-CN": "Simplified Chinese",
    ja: "Japanese",
    ko: "Korean",
    fr: "French",
    it: "Italian",
    es: "Spanish",
    vi: "Vietnamese",
  };
  return map[locale] ?? "English";
}
