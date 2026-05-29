"use client";

import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ANALYTICS_RANGE_OPTIONS } from "@/lib/analytics/date-range";
import type { AnalyticsRangeKey } from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

type TimeLensControlProps = {
  value: AnalyticsRangeKey;
  onChange: (value: AnalyticsRangeKey) => void;
  compact?: boolean;
};

export function TimeLensControl({ value, onChange, compact }: TimeLensControlProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/20 bg-background/35 p-1 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-background/20">
      {ANALYTICS_RANGE_OPTIONS.map((option) => {
        const active = option.key === value;
        return (
          <Button
            key={option.key}
            type="button"
            size={compact ? "xs" : "sm"}
            variant={active ? "default" : "ghost"}
            disabled={option.disabled}
            onClick={() => onChange(option.key)}
            className={cn(
              "min-w-9 gap-1 rounded-lg px-2 text-xs",
              active && "shadow-sm",
              option.disabled && "opacity-45",
            )}
            title={option.disabled ? option.disabledReason : option.behavior}
          >
            {option.disabled ? <Lock className="size-3" /> : null}
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
