"use client";

import { Button } from "@/components/ui/button";
import { Heart, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GratefulThingsUiCopy } from "@/lib/i18n/grateful-things-ui";

export type GratitudeViewMode = "list" | "grid" | "heart";

type Props = {
  value: GratitudeViewMode;
  onChange: (mode: GratitudeViewMode) => void;
  copy: Pick<
    GratefulThingsUiCopy,
    "viewList" | "viewGrid" | "viewHeart" | "viewListAria" | "viewGridAria" | "viewHeartAria"
  >;
  className?: string;
};

const MODES: {
  id: GratitudeViewMode;
  icon: typeof List;
  labelKey: "viewList" | "viewGrid" | "viewHeart";
  ariaKey: "viewListAria" | "viewGridAria" | "viewHeartAria";
}[] = [
  { id: "list", icon: List, labelKey: "viewList", ariaKey: "viewListAria" },
  { id: "grid", icon: LayoutGrid, labelKey: "viewGrid", ariaKey: "viewGridAria" },
  { id: "heart", icon: Heart, labelKey: "viewHeart", ariaKey: "viewHeartAria" },
];

export function GratitudeViewToggle({ value, onChange, copy, className }: Props) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5",
        className,
      )}
      role="group"
      aria-label="View mode"
    >
      {MODES.map(({ id, icon: Icon, labelKey, ariaKey }) => (
        <Button
          key={id}
          type="button"
          variant={value === id ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2.5 text-xs sm:px-3",
            value === id && "shadow-sm",
          )}
          onClick={() => onChange(id)}
          aria-label={copy[ariaKey]}
          aria-pressed={value === id}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{copy[labelKey]}</span>
        </Button>
      ))}
    </div>
  );
}
