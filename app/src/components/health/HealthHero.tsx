"use client";

import { useMemo } from "react";
import { useAppStore } from "@/stores/app-store";
import { getHealthUiCopy } from "@/lib/i18n/health-ui";
import { HealthCard } from "./primitives/HealthCard";
import { computeReadiness, type ReadinessResult } from "@/lib/health/readinessScore";
import type { HealthDailyLog, HealthMetric } from "@/types/database";
import { cn } from "@/lib/utils";

interface Props {
  today: HealthDailyLog | null;
  baseline14d: {
    sleepDurationHours: number | null;
    hrv: number | null;
    rhr: number | null;
  };
  latestMetrics: Partial<Record<"sleep_duration" | "hrv" | "rhr" | "steps", HealthMetric | null>>;
  className?: string;
}

const BAND_COLORS: Record<NonNullable<ReadinessResult["band"]>, string> = {
  excellent: "text-green-500",
  good: "text-emerald-500",
  fair: "text-amber-500",
  low: "text-red-500",
};

/**
 * Top-of-page hero: readiness ring + narrative. The ring is pure SVG
 * (no external dep) to keep LCP cheap.
 */
export function HealthHero({ today, baseline14d, latestMetrics, className }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getHealthUiCopy(language), [language]);

  const readiness = useMemo(
    () =>
      computeReadiness(
        { today, baseline14d, latestMetrics },
        {
          sleep: copy.readiness.componentSleep,
          hrv: copy.readiness.componentHrv,
          rhr: copy.readiness.componentRhr,
          energy: copy.readiness.componentEnergy,
          stress: copy.readiness.componentStress,
          activity: copy.readiness.componentActivity,
        },
      ),
    [today, baseline14d, latestMetrics, copy],
  );

  const narrative = useMemo(() => {
    if (!readiness.score) return copy.empty.logFirstPrompt;
    const highlight = buildHighlight(readiness, copy);
    return copy.readiness.narrativeTemplate(readiness.score, highlight);
  }, [readiness, copy]);

  const bandLabel =
    readiness.band ? copy.readiness[readiness.band] : null;

  return (
    <HealthCard className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6", className)}>
      <ReadinessRing
        score={readiness.score}
        band={readiness.band}
        ariaLabel={copy.readiness.ringAriaLabel}
      />
      <div className="flex-1">
        {bandLabel && (
          <p className={cn("text-xs font-semibold uppercase tracking-wider", readiness.band && BAND_COLORS[readiness.band])}>
            {bandLabel}
          </p>
        )}
        <p className="mt-1 text-lg font-medium leading-snug">{narrative}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {readiness.components
            .filter((c) => c.score !== null)
            .map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2 py-0.5"
              >
                {c.label}
                <span className="font-semibold text-foreground">{Math.round(c.score ?? 0)}</span>
              </span>
            ))}
        </div>
      </div>
    </HealthCard>
  );
}

function ReadinessRing({
  score,
  band,
  ariaLabel,
}: {
  score: number | null;
  band: ReadinessResult["band"];
  ariaLabel: string;
}) {
  const size = 120;
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const pct = score ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const dash = circumference * pct;
  const remaining = circumference - dash;

  return (
    <div
      className="relative"
      role="img"
      aria-label={`${ariaLabel}: ${score ?? "—"}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="fill-none stroke-foreground/10"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={cn(
            "fill-none transition-all",
            band ? BAND_COLORS[band] : "text-muted-foreground",
          )}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${remaining}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">
          {score ?? "—"}
        </span>
      </div>
    </div>
  );
}

function buildHighlight(
  readiness: ReadinessResult,
  copy: ReturnType<typeof getHealthUiCopy>,
): string {
  if (!readiness.score) return "";
  if (readiness.score >= 85) return copy.readiness.narrativeGenericHigh;
  if (readiness.score >= 60) return copy.readiness.narrativeGenericMid;
  return copy.readiness.narrativeGenericLow;
}
