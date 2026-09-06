"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { OSPageHeader } from "@/components/ui/os-primitives";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { resolveThemedPageTitle } from "@/lib/navigation/page-title";

interface PageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Rendered above the title row (e.g. centered profile photo). */
  preHeader?: ReactNode;
  /** Sub-tabs supply their own localized title instead of the route label. */
  useRouteTitle?: boolean;
  children: ReactNode;
}

function useThemedTitle(fallbackTitle: string): string {
  const pathname = usePathname();
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);

  return resolveThemedPageTitle({
    pathname,
    fallbackTitle,
    uiTheme,
    language,
  });
}

export function PageShell({ title, description, actions, preHeader, children, useRouteTitle = true }: PageShellProps) {
  const displayTitle = useThemedTitle(title);

  return (
    <div data-slot="page-shell" className="min-w-0 space-y-8 sm:space-y-10">
      {preHeader ? <div data-motion-reveal>{preHeader}</div> : null}
      <div data-motion-reveal>
        <OSPageHeader title={useRouteTitle ? displayTitle : title} description={description} actions={actions} />
      </div>
      <div data-motion-reveal data-slot="page-content" className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
