/**
 * Helpers for steering AI knowledge prompts to write output in the user's
 * preferred UI language instead of the source content's language.
 */

import type { AppLocale } from "@/lib/i18n/app-locale";

/** Display name we hand to the model — keeps the directive unambiguous. */
const LOCALE_PROMPT_NAMES: Record<AppLocale, string> = {
  en: "English",
  "zh-TW": "Traditional Chinese (zh-TW, used in Hong Kong / Taiwan)",
  "zh-CN": "Simplified Chinese (zh-CN, mainland China)",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  it: "Italian",
  es: "Spanish",
  vi: "Vietnamese",
};

export function localePromptName(locale: AppLocale | undefined): string | null {
  if (!locale) return null;
  return LOCALE_PROMPT_NAMES[locale] ?? null;
}

/**
 * A short prompt fragment instructing the model to translate / output in the
 * user's chosen language regardless of the source content's language.
 *
 * Returns an empty string when no target locale is provided so callers can
 * inline it without conditional logic.
 */
export function languageDirective(locale: AppLocale | undefined): string {
  const name = localePromptName(locale);
  if (!name) return "";
  return [
    `Always write the final output in ${name}, regardless of the source content's language.`,
    `If the source is in another language (e.g. Korean, Japanese, Chinese), translate and rephrase your answer into ${name}.`,
    `Preserve proper nouns, brand names, and technical terms in their original spelling when there is no widely-used translation.`,
  ].join(" ");
}
