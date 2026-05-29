"use client";

import { useMemo, useState } from "react";
import { HeartPulse } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import type {
  EmotionExecutionBucket,
  EmotionQuadrant,
} from "@/lib/analytics/types";
import { cn } from "@/lib/utils";

const QUADRANT_CLASS: Record<EmotionQuadrant, string> = {
  RED: "bg-rose-500",
  YELLOW: "bg-amber-400",
  BLUE: "bg-sky-500",
  GREEN: "bg-emerald-500",
};

function bucketColor(bucket: EmotionExecutionBucket): string {
  if (bucket.averageIntensity == null) return "bg-muted/35";
  const quadrantClass = bucket.dominantQuadrant
    ? QUADRANT_CLASS[bucket.dominantQuadrant]
    : "bg-primary";
  return quadrantClass;
}

export function EmotionExecutionHeatmap({
  buckets,
  interpretation,
  hasJournalData,
  hasExecutionData,
  granularity,
}: {
  buckets: EmotionExecutionBucket[];
  interpretation: string;
  hasJournalData: boolean;
  hasExecutionData: boolean;
  granularity: "day" | "week";
}) {
  const defaultBucket = useMemo(
    () =>
      [...buckets]
        .reverse()
        .find(
          (bucket) =>
            bucket.averageIntensity != null ||
            bucket.completedTasks > 0 ||
            bucket.plannedItems > 0,
        ) ?? buckets[buckets.length - 1],
    [buckets],
  );
  const [selectedKey, setSelectedKey] = useState(defaultBucket?.key ?? "");
  const selected = buckets.find((bucket) => bucket.key === selectedKey) ?? defaultBucket;

  return (
    <GlassPanel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="size-4 text-primary" />
            <h2 className="text-base font-semibold tracking-normal">
              Emotion × Execution Heatmap
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{interpretation}</p>
        </div>
      </div>

      {!hasJournalData ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
          Journal entries unlock this insight. Add date, quadrant, and intensity to compare emotional load against execution.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div
              className={cn(
                "grid gap-1.5",
                granularity === "day"
                  ? "grid-cols-7 sm:[grid-template-columns:repeat(10,minmax(0,1fr))] md:[grid-template-columns:repeat(14,minmax(0,1fr))]"
                  : "grid-cols-6 sm:[grid-template-columns:repeat(8,minmax(0,1fr))] md:[grid-template-columns:repeat(10,minmax(0,1fr))]",
              )}
            >
              {buckets.map((bucket) => {
                const intensity = bucket.averageIntensity ?? 0;
                const active = selected?.key === bucket.key;
                return (
                  <button
                    key={bucket.key}
                    type="button"
                    onClick={() => setSelectedKey(bucket.key)}
                    className={cn(
                      "relative aspect-square rounded-md border border-white/15 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring",
                      bucketColor(bucket),
                      active && "scale-110 ring-2 ring-primary/70",
                    )}
                    style={{
                      opacity:
                        bucket.averageIntensity == null
                          ? 0.28
                          : Math.max(0.35, Math.min(0.96, intensity / 10)),
                    }}
                    aria-label={`${bucket.label}: intensity ${bucket.averageIntensity ?? "none"}, ${bucket.completedTasks} completed`}
                    title={`${bucket.label}: ${bucket.averageIntensity ?? "no journal"} intensity, ${bucket.completedTasks} completed`}
                  >
                    {bucket.completedTasks > 0 ? (
                      <span className="absolute bottom-0.5 right-0.5 size-1.5 rounded-full bg-background shadow" />
                    ) : null}
                    {bucket.dailyPlanActive ? (
                      <span className="absolute left-0.5 top-0.5 size-1.5 rounded-full bg-foreground/70" />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Fill: emotional intensity</span>
              <span>Light dot: completed tasks</span>
              <span>Dark dot: daily plan activity</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/35 p-4">
            {selected ? (
              <>
                <p className="text-sm font-medium">
                  {selected.startISO === selected.endISO
                    ? selected.startISO
                    : `${selected.startISO} to ${selected.endISO}`}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/35 p-3">
                    <p className="text-xl font-semibold tabular-nums">
                      {selected.averageIntensity ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">intensity</p>
                  </div>
                  <div className="rounded-lg bg-muted/35 p-3">
                    <p className="text-xl font-semibold tabular-nums">
                      {selected.completedTasks}
                    </p>
                    <p className="text-xs text-muted-foreground">completed</p>
                  </div>
                  <div className="rounded-lg bg-muted/35 p-3">
                    <p className="text-xl font-semibold tabular-nums">
                      {selected.plannedItems}
                    </p>
                    <p className="text-xs text-muted-foreground">planned</p>
                  </div>
                  <div className="rounded-lg bg-muted/35 p-3">
                    <p className="text-xl font-semibold">
                      {selected.dominantQuadrant ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">quadrant</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-5 text-muted-foreground">
                  {selected.averageIntensity == null
                    ? "No journal signal for this bucket."
                    : selected.completedTasks > 0
                      ? "Emotion and execution both appeared here. Inspect the work type before calling it clean momentum."
                      : "Emotion appeared without visible task completion. That may be processing, recovery, or avoidance."}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No bucket selected.</p>
            )}
          </div>
        </div>
      )}

      {hasJournalData && !hasExecutionData ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Add completed tasks or daily plans to compare emotion against execution.
        </p>
      ) : null}
    </GlassPanel>
  );
}
