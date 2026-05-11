"use client";

import { Badge } from "@/components/ui/badge";
import { statusColors, priorityColors } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "status" | "priority" | "custom";

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  value: string;
  /** When set, overrides the auto-formatted value label (e.g. localized status). */
  label?: string;
  className?: string;
}

export function StatusBadge({
  variant = "status",
  value,
  label,
  className,
}: StatusBadgeProps) {
  let colorClass = "";

  if (variant === "status") {
    colorClass = statusColors[value as keyof typeof statusColors] ?? "";
  } else if (variant === "priority") {
    colorClass = priorityColors[value as keyof typeof priorityColors] ?? "";
  }

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-medium border-0", colorClass, className)}
    >
      {label ??
        value.charAt(0).toUpperCase() + value.slice(1).replace("-", " ")}
    </Badge>
  );
}
