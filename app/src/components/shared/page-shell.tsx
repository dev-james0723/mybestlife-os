"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { OSPageHeader } from "@/components/ui/os-primitives";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getThemedCategoryLabel, getThemedItemLabel } from "@/lib/theme-labels";
import { stripLeadingLocaleFromPathname } from "@/lib/i18n/locale-path";

interface PageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Rendered above the title row (e.g. centered profile photo). */
  preHeader?: ReactNode;
  children: ReactNode;
}

function useThemedTitle(fallbackTitle: string): string {
  const pathname = usePathname();
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);

  const pathWithoutLocale = stripLeadingLocaleFromPathname(pathname);
  const pageId = pathWithoutLocale.split("/").filter(Boolean)[0] ?? "";
  if (!pageId) return fallbackTitle;

  // `/relationship` is a hub: the H1 should match the nav category ("People"),
  // not the first child item ("Relationships" / themed equivalents).
  if (pageId === "relationship") {
    return getThemedCategoryLabel("relationship", uiTheme, language);
  }

  const themedLabel = getThemedItemLabel(pageId, uiTheme, language);
  return themedLabel !== pageId ? themedLabel : fallbackTitle;
}

export function PageShell({ title, description, actions, preHeader, children }: PageShellProps) {
  const displayTitle = useThemedTitle(title);

  return (
    <div className="space-y-8 sm:space-y-10">
      {preHeader}
      <OSPageHeader title={displayTitle} description={description} actions={actions} />
      {children}
    </div>
  );
}
