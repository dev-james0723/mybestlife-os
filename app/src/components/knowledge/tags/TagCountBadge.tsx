"use client";

import { cn } from "@/lib/utils";

interface TagCountBadgeProps {
  count: number;
  active?: boolean;
  className?: string;
}

/**
 * Subtle, minimum-noise count badge for the tag tree. Hidden when count is 0
 * to keep the sidebar visually calm. Active state uses accent foreground so
 * it reads as part of the row, not as a competing element.
 */
export function TagCountBadge({ count, active, className }: TagCountBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums",
        active
          ? "bg-foreground/10 text-foreground"
          : "bg-muted/60 text-muted-foreground group-hover/tag-row:bg-muted",
        className,
      )}
    >
      {count > 999 ? "999+" : count}
    </span>
  );
}
