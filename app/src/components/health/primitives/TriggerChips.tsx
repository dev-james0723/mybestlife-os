"use client";

import { cn } from "@/lib/utils";
import type { HealthTriggerKey } from "@/types/database";

interface TriggerChipsProps {
  options: HealthTriggerKey[];
  values: string[];
  onChange: (next: string[]) => void;
  labelFor: (key: HealthTriggerKey) => string;
  className?: string;
}

export function TriggerChips({
  options,
  values,
  onChange,
  labelFor,
  className,
}: TriggerChipsProps) {
  function toggle(key: string) {
    if (values.includes(key)) onChange(values.filter((v) => v !== key));
    else onChange([...values, key]);
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)} role="group">
      {options.map((key) => {
        const active = values.includes(key);
        return (
          <button data-control-variant="outline" data-selected={active}
            key={key}
            type="button"
            onClick={() => toggle(key)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-foreground/5",
            )}
          >
            {labelFor(key)}
          </button>
        );
      })}
    </div>
  );
}
