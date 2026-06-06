import type { AppLocale } from "@/lib/i18n/app-locale";
import { stripLeadingLocaleFromPathname } from "@/lib/i18n/locale-path";
import { navigationCategories } from "@/lib/constants/navigation";
import { getThemedCategoryLabel, getThemedItemLabel } from "@/lib/theme-labels";
import type { UiTheme } from "@/types/database";

type NavigationRouteMatch = {
  categoryId: string;
  itemId: string;
  url: string;
};

function normalizeRoutePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const withoutTrailing = withSlash.replace(/\/+$/, "");
  return withoutTrailing || "/";
}

export function findNavigationItemForPathname(pathname: string): NavigationRouteMatch | null {
  const pathWithoutLocale = normalizeRoutePath(stripLeadingLocaleFromPathname(pathname));
  const matches: NavigationRouteMatch[] = [];

  for (const category of navigationCategories) {
    for (const item of category.items) {
      const itemUrl = normalizeRoutePath(item.url);
      if (itemUrl === pathWithoutLocale) {
        matches.push({
          categoryId: category.categoryId,
          itemId: item.itemId,
          url: itemUrl,
        });
      }
    }
  }

  matches.sort((a, b) => b.url.length - a.url.length);
  return matches[0] ?? null;
}

export function resolveThemedPageTitle({
  pathname,
  fallbackTitle,
  uiTheme,
  language,
}: {
  pathname: string;
  fallbackTitle: string;
  uiTheme: UiTheme;
  language: AppLocale;
}): string {
  const pathWithoutLocale = normalizeRoutePath(stripLeadingLocaleFromPathname(pathname));
  const segments = pathWithoutLocale.split("/").filter(Boolean);
  const pageId = segments[0] ?? "";
  if (!pageId) return fallbackTitle;

  if (pageId === "relationship" && segments.length === 1) {
    return getThemedCategoryLabel("relationship", uiTheme, language);
  }

  const exactMatch = findNavigationItemForPathname(pathname);
  if (exactMatch) {
    const isCategoryHome =
      segments.length === 1 && exactMatch.categoryId === exactMatch.itemId;
    if (isCategoryHome) return fallbackTitle;

    const themedLabel = getThemedItemLabel(exactMatch.itemId, uiTheme, language);
    return themedLabel !== exactMatch.itemId ? themedLabel : fallbackTitle;
  }

  if (segments.length > 1) return fallbackTitle;

  const themedLabel = getThemedItemLabel(pageId, uiTheme, language);
  return themedLabel !== pageId ? themedLabel : fallbackTitle;
}
