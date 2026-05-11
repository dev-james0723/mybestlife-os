import type { AppLocale } from "@/lib/i18n/app-locale";

/** BCP 47 tag for `Intl.NumberFormat` from app locale. */
export function appLocaleToIntlNumberLocale(locale: AppLocale): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "zh-TW":
      return "zh-TW";
    case "zh-CN":
      return "zh-CN";
    case "ja":
      return "ja-JP";
    case "ko":
      return "ko-KR";
    case "fr":
      return "fr-FR";
    case "it":
      return "it-IT";
    case "es":
      return "es-ES";
    case "vi":
      return "vi-VN";
    default:
      return "en-US";
  }
}
