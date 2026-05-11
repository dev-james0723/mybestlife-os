"use client";

import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatIconTone = "default" | "dashboard";

interface StatCardProps {
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

export function StatCard({
  title,
  value,
  icon: Icon,
  iconTone = "default",
  description,
  trend,
  onClick,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-all shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]",
        onClick && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
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
                ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
