"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface WeatherMetricCardProps {
  icon: LucideIcon;
  label: string;
  /** Primary value displayed as the headline number. */
  value: string;
  /** Optional short qualifier ("High", "NE", etc.). */
  trailing?: string;
  /** When true, the value renders in the accent lime. */
  accent?: boolean;
  /** Short ARIA-friendly description for screen readers. */
  ariaDescription?: string;
}

/**
 * Small Liquid Glass metric tile used in the bento grid. Layout mirrors
 * the Stitch prototype: icon + label header, value + qualifier footer.
 */
export function WeatherMetricCard({
  icon: Icon,
  label,
  value,
  trailing,
  accent,
  ariaDescription,
}: WeatherMetricCardProps) {
  return (
    <div
      className="weather-glass-card flex flex-col gap-3 p-4"
      role="group"
      aria-label={ariaDescription ?? `${label} ${value}${trailing ? ` ${trailing}` : ""}`}
    >
      <header className="flex items-center gap-2 text-xs text-[var(--weather-text-secondary)]">
        <Icon className="size-4 opacity-80" aria-hidden />
        <span>{label}</span>
      </header>
      <p
        className={cn(
          "text-2xl font-semibold tabular-nums",
          accent ? "text-[var(--weather-accent-lime)]" : "text-[var(--weather-text-primary)]",
        )}
      >
        {value}
        {trailing ? (
          <span className="ml-1.5 text-xs font-medium text-[var(--weather-text-secondary)]">
            {trailing}
          </span>
        ) : null}
      </p>
    </div>
  );
}
