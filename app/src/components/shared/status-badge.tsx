"use client";

import { Badge } from "@/components/ui/badge";
import { statusColors, priorityColors } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";

type StatusBadgeVariant = "status" | "priority" | "custom";

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  value?: string | null;
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
  const safeValue = typeof value === "string" && value.trim() !== "" ? value : "unknown";
  let colorClass = "";

  if (variant === "status") {
    colorClass = statusColors[safeValue as keyof typeof statusColors] ?? "";
  } else if (variant === "priority") {
    colorClass = priorityColors[safeValue as keyof typeof priorityColors] ?? "";
  }

  const autoLabel =
    safeValue === "unknown"
      ? "Unknown"
      : safeValue.charAt(0).toUpperCase() + safeValue.slice(1).replace("-", " ");

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs font-medium border-0", colorClass, className)}
    >
      {label ?? autoLabel}
    </Badge>
  );
}
