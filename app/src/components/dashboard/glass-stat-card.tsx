"use client";

import { type LucideIcon } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";

type StatIconTone = "default" | "dashboard";

interface GlassStatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  /** Dashboard reference uses blue circular icon wells. */
  iconTone?: StatIconTone;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
  className?: string;
}

/**
 * GlassStatCard — dashboard-only glassy twin of `shared/StatCard`.
 * Mirrors the same public API so a later drop-in is trivial, but
 * renders on a `<GlassPanel>` shell rather than `<Card>`. Does NOT
 * modify `shared/StatCard`; analytics and any other consumer of the
 * shared card continue to render the original solid surface.
 */
export function GlassStatCard({
  title,
  value,
  icon: Icon,
  iconTone = "default",
  description,
  trend,
  onClick,
  className,
}: GlassStatCardProps) {
  return (
    <GlassPanel
      interactive={onClick ? true : undefined}
      onClick={onClick}
      className={cn(
        "p-6",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}% from last week
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            iconTone === "dashboard"
              ? "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300"
              : "bg-primary/15 text-primary"
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </GlassPanel>
  );
}
