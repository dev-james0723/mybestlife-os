"use client";

/**
 * Search pill — the left-most glass pill in the top bar.
 *
 * Visually a search input, but it never holds text itself — click or focus
 * opens the global command palette (which binds ⌘K at window level too).
 * This mirrors macOS Spotlight / Raycast: the visible pill is a trigger,
 * not an input.
 */

import { Search } from "lucide-react";
import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getCommonUiCopy } from "@/lib/i18n/common-ui";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { cn } from "@/lib/utils";

type SearchPillProps = {
  className?: string;
};

export function SearchPill({ className }: SearchPillProps) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getCommonUiCopy(language), [language]);
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);

  return (
    <button
      type="button"
      aria-label={ui.searchPlaceholder}
      data-open={open ? "true" : undefined}
      onClick={() => setOpen(true)}
      className={cn(
        "topbar-search-pill group min-w-[180px] max-w-[460px] flex-1 justify-start",
        "sm:min-w-[220px] md:w-[320px] lg:w-[380px] xl:w-[420px]",
        className
      )}
    >
      <Search className="h-4 w-4 shrink-0 opacity-70" />
      <span className="flex-1 truncate text-left text-sm opacity-70">
        {ui.searchPlaceholder}
      </span>
      <span className="topbar-kbd ml-2 hidden sm:inline-flex">⌘K</span>
    </button>
  );
}

/**
 * Compact mobile variant — icon-only circular glass trigger. Opens the
 * same global palette.
 */
export function SearchIconTrigger({ className }: SearchPillProps) {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getCommonUiCopy(language), [language]);
  const open = useCommandPaletteStore((s) => s.open);
  const setOpen = useCommandPaletteStore((s) => s.setOpen);
  return (
    <button
      type="button"
      aria-label={ui.searchPlaceholder}
      data-open={open ? "true" : undefined}
      onClick={() => setOpen(true)}
      className={cn(
        "topbar-clock-trigger topbar-mobile-icon-trigger flex-shrink-0",
        className
      )}
    >
      <Search className="h-4 w-4 opacity-85" />
    </button>
  );
}
