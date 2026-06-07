"use client";

import Link from "next/link";
import { Fragment, useCallback, useMemo, type MouseEvent } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navigationCategories } from "@/lib/constants/navigation";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getThemedCategoryLabel, getThemedItemLabel } from "@/lib/theme-labels";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import { useFocusNavigation } from "@/components/daily-planner/focus/focus-reality-boundary";

function hrefWithSearch(
  localizedBase: string,
  searchParams: Record<string, string> | undefined,
): string {
  if (!searchParams) return localizedBase;
  const entries = Object.entries(searchParams);
  if (entries.length === 0) return localizedBase;
  const qs = new URLSearchParams(entries).toString();
  return `${localizedBase}?${qs}`;
}

export function AppMainNavMenu() {
  const localeSlug = useLocaleSlug();
  const language = useAppStore((s) => s.language);
  const { uiTheme } = useTheme();
  const focusNavigation = useFocusNavigation();
  const ui = useMemo(() => getCommonUiCopy(language), [language]);
  const handleNavClick = useCallback(
    (href: string, event: MouseEvent<HTMLElement>) => {
      focusNavigation?.handleLinkClick(href, event);
    },
    [focusNavigation],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="shrink-0 rounded-lg border-border/80"
            aria-label={ui.mainNavMenuAria}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="max-h-[min(70vh,28rem)] w-60 overflow-y-auto sm:w-64"
      >
        {navigationCategories.map((category, catIndex) => {
          const catLabel = getThemedCategoryLabel(category.categoryId, uiTheme, language);
          const isHybrid = Boolean(category.url && category.items.length > 0);
          const isLeaf = Boolean(category.url && category.items.length === 0);

          return (
            <Fragment key={category.categoryId}>
              {catIndex > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  {catLabel}
                </DropdownMenuLabel>

                {isLeaf && category.url ? (
                  <DropdownMenuItem
                    render={
                      <Link
                        href={withLocalePrefix(localeSlug, category.url!)}
                        prefetch={false}
                        onClick={(event) =>
                          handleNavClick(withLocalePrefix(localeSlug, category.url!), event)
                        }
                      />
                    }
                  >
                    <category.icon className="size-4 shrink-0 opacity-80" />
                    <span className="truncate">{catLabel}</span>
                  </DropdownMenuItem>
                ) : null}

                {isHybrid && category.url ? (
                  <>
                    <DropdownMenuItem
                      render={
                        <Link
                          href={withLocalePrefix(localeSlug, category.url!)}
                          prefetch={false}
                          onClick={(event) =>
                            handleNavClick(withLocalePrefix(localeSlug, category.url!), event)
                          }
                        />
                      }
                    >
                      <category.icon className="size-4 shrink-0 opacity-80" />
                      <span className="truncate">{catLabel}</span>
                    </DropdownMenuItem>
                    {category.items.map((item) => {
                      const base = withLocalePrefix(localeSlug, item.url);
                      const href = hrefWithSearch(base, item.searchParams);
                      return (
                        <DropdownMenuItem
                          key={item.itemId}
                          className="pl-6"
                          render={
                            <Link
                              href={href}
                              prefetch={false}
                              onClick={(event) => handleNavClick(href, event)}
                            />
                          }
                        >
                          <item.icon className="size-4 shrink-0 opacity-80" />
                          <span className="truncate">
                            {getThemedItemLabel(item.itemId, uiTheme, language)}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                ) : null}

                {!isLeaf && !isHybrid ? (
                  <>
                    {category.items.map((item) => {
                      const base = withLocalePrefix(localeSlug, item.url);
                      const href = hrefWithSearch(base, item.searchParams);
                      return (
                        <DropdownMenuItem
                          key={item.itemId}
                          render={
                            <Link
                              href={href}
                              prefetch={false}
                              onClick={(event) => handleNavClick(href, event)}
                            />
                          }
                        >
                          <item.icon className="size-4 shrink-0 opacity-80" />
                          <span className="truncate">
                            {getThemedItemLabel(item.itemId, uiTheme, language)}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                ) : null}
              </DropdownMenuGroup>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
