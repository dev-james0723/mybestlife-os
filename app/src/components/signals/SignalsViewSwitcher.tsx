"use client";

import { LayoutGrid, Newspaper, Rows3, Table2, GalleryHorizontal } from "lucide-react";

import { OSSegmentedControl } from "@/components/ui/os-primitives";
import type { SignalsViewMode } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

const VIEW_ORDER: SignalsViewMode[] = ["editorial", "grid", "table", "compact", "gallery"];

const VIEW_ICON: Record<SignalsViewMode, typeof Newspaper> = {
  editorial: Newspaper,
  grid: LayoutGrid,
  table: Table2,
  compact: Rows3,
  gallery: GalleryHorizontal,
};

/** Segmented control for the page view mode (persisted in prefs). */
export function SignalsViewSwitcher({
  value,
  onChange,
  copy,
  className,
}: {
  value: SignalsViewMode;
  onChange: (mode: SignalsViewMode) => void;
  copy: SignalsUiCopy;
  className?: string;
}) {
  const items = VIEW_ORDER.map((mode) => ({
    id: mode,
    label: copy.views.modes[mode],
    icon: VIEW_ICON[mode],
    ariaLabel: copy.views.modes[mode],
  }));

  return (
    <OSSegmentedControl
      items={items}
      value={value}
      onValueChange={onChange}
      ariaLabel={copy.views.label}
      labelMode="desktop"
      layoutId="signals-view-switcher-active"
      className={className}
    />
  );
}
