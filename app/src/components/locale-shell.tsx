"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  DEFAULT_LOCALE_SLUG,
  LOCALE_HTML_LANG,
  normalizeLocaleSlug,
  urlSlugToAppLocale,
} from "@/lib/i18n/locale-slug";
import { useAppStore } from "@/stores/app-store";

/** Syncs Zustand language + `<html lang>` from the `[locale]` URL segment. */
export function LocaleShell() {
  const params = useParams<{ locale: string }>();
  const slug = normalizeLocaleSlug(String(params?.locale ?? "")) ?? DEFAULT_LOCALE_SLUG;
  const setLanguage = useAppStore((s) => s.setLanguage);

  useEffect(() => {
    setLanguage(urlSlugToAppLocale(slug));
  }, [setLanguage, slug]);

  useEffect(() => {
    document.documentElement.lang = LOCALE_HTML_LANG[slug] ?? "en";
  }, [slug]);

  return null;
}
