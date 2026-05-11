"use client";

import { useParams, usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
  type LocaleUrlSlug,
} from "@/lib/i18n/locale-slug";
import { stripLeadingLocaleFromPathname, withLocalePrefix } from "@/lib/i18n/locale-path";

export function useLocaleSlug(): LocaleUrlSlug {
  const params = useParams<{ locale: string }>();
  return normalizeLocaleSlug(String(params?.locale ?? "")) ?? DEFAULT_LOCALE_SLUG;
}

export function useLocalizedPath(pathWithoutLocale: string): string {
  const slug = useLocaleSlug();
  return withLocalePrefix(slug, pathWithoutLocale);
}

/** Pathname without the leading `/{locale}` segment (starts with `/`). */
export function usePathnameWithoutLocale(): string {
  const pathname = usePathname();
  return stripLeadingLocaleFromPathname(pathname);
}
