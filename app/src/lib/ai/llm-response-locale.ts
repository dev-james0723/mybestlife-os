import type { AppLocale } from "@/lib/i18n/app-locale";

/**
 * System-prompt fragment: every model-generated string must match the user's app language.
 * Must include every {@link AppLocale}; `satisfies` keeps this aligned when locales are added.
 */
export const LLM_RESPONSE_LANGUAGE_DIRECTIVES = {
  en: "Respond entirely in English. Every user-visible string in your JSON output (questions, options, any labels) must be written in natural English.",
  "zh-TW":
    "Respond entirely in Traditional Chinese as used in Taiwan (zh-TW). Every user-visible string in your JSON output must be in Traditional Chinese (Taiwan), not Simplified.",
  "zh-CN":
    "Respond entirely in Simplified Chinese (zh-CN, mainland China). Every user-visible string in your JSON output must be in Simplified Chinese.",
  ja: "Respond entirely in Japanese. Every user-visible string in your JSON output must be written in natural Japanese (日本語).",
  ko: "Respond entirely in Korean. Every user-visible string in your JSON output must be written in natural Korean (한국어).",
  fr: "Respond entirely in French. Every user-visible string in your JSON output must be written in natural French (français).",
  it: "Respond entirely in Italian. Every user-visible string in your JSON output must be written in natural Italian (italiano).",
  es: "Respond entirely in Spanish. Every user-visible string in your JSON output must be written in natural Spanish (español).",
  vi: "Respond entirely in Vietnamese. Every user-visible string in your JSON output must be written in natural Vietnamese (Tiếng Việt).",
} satisfies Record<AppLocale, string>;

export function getLlmResponseLanguageDirective(locale: AppLocale): string {
  return LLM_RESPONSE_LANGUAGE_DIRECTIVES[locale];
}

/**
 * For image models: user-facing typography invented by the model should match app language.
 * Task titles from the schedule list must be reproduced exactly (same spelling/script).
 */
export const LLM_IMAGE_TYPOGRAPHY_DIRECTIVES = {
  en: "Use English for any decorative text, headers, captions, or date wording you add to the artwork. Reproduce each task title exactly as provided in the schedule list.",
  "zh-TW":
    "Use Traditional Chinese (Taiwan) for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  "zh-CN":
    "Use Simplified Chinese for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  ja: "Use Japanese for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  ko: "Use Korean for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  fr: "Use French for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  it: "Use Italian for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  es: "Use Spanish for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
  vi: "Use Vietnamese for any decorative text, headers, captions, or date wording you add. Reproduce each task title exactly as provided in the schedule list.",
} satisfies Record<AppLocale, string>;

export function getLlmImageTypographyDirective(locale: AppLocale): string {
  return LLM_IMAGE_TYPOGRAPHY_DIRECTIVES[locale];
}
