"use client";

import { OSStatusRail } from "@/components/ui/os-primitives";
import { ANALYTICS_RANGE_OPTIONS } from "@/lib/analytics/date-range";
import type { AnalyticsRangeKey } from "@/lib/analytics/types";

type TimeLensControlProps = {
  value: AnalyticsRangeKey;
  onChange: (value: AnalyticsRangeKey) => void;
  compact?: boolean;
};

export function TimeLensControl({ value, onChange, compact }: TimeLensControlProps) {
  const items = ANALYTICS_RANGE_OPTIONS.map((option) => ({
    id: option.key,
    label: option.label,
    disabled: option.disabled,
    title: option.disabled ? option.disabledReason : option.behavior,
  }));

  return (
    <OSStatusRail<AnalyticsRangeKey>
      items={items}
      value={value}
      onValueChange={onChange}
      ariaLabel="Analytics range"
      className={compact ? "sm:w-fit" : "lg:w-fit"}
      layoutId="analytics-time-lens-active"
    />
  );
}
