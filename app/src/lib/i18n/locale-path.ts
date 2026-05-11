import type { AppLocale } from "./app-locale";
import {
  appLocaleToUrlSlug,
  DEFAULT_LOCALE_SLUG,
  normalizeLocaleSlug,
  type LocaleUrlSlug,
} from "./locale-slug";

/**
 * Strips the leading `/{slug}` from a pathname. Returns `/` for `/en` or `/en/`.
 */
export function stripLeadingLocaleFromPathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  const maybeSlug = normalizeLocaleSlug(parts[0] ?? "");
  if (!maybeSlug) return pathname.startsWith("/") ? pathname : `/${pathname}`;
  const rest = parts.slice(1).join("/");
  return rest ? `/${rest}` : "/";
}

export function getLocaleSlugFromPathname(pathname: string): LocaleUrlSlug | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  return normalizeLocaleSlug(parts[0] ?? "");
}

export function withLocalePrefix(slug: LocaleUrlSlug, pathWithoutLocale: string): string {
  const p = pathWithoutLocale.startsWith("/") ? pathWithoutLocale : `/${pathWithoutLocale}`;
  if (p === "/") return `/${slug}`;
  return `/${slug}${p}`;
}

export function withAppLocalePrefix(locale: AppLocale, pathWithoutLocale: string): string {
  return withLocalePrefix(appLocaleToUrlSlug(locale), pathWithoutLocale);
}

export function replacePathnameLocaleSlug(
  pathname: string,
  newSlug: LocaleUrlSlug,
): string {
  const rest = stripLeadingLocaleFromPathname(pathname);
  return withLocalePrefix(newSlug, rest === "/" ? "/" : rest);
}

export function defaultLocalizedPath(pathWithoutLocale: string): string {
  return withLocalePrefix(DEFAULT_LOCALE_SLUG, pathWithoutLocale);
}

/** If `pathname` already starts with a valid locale slug, return it; else prefix default English. */
export function ensureUrlPathHasLocale(pathname: string): string {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const first = p.split("/").filter(Boolean)[0];
  if (first && normalizeLocaleSlug(first)) return p;
  return defaultLocalizedPath(p);
}
