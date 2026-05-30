"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type {
  RoleModelDNADimension,
  RoleModelOverlap,
} from "@/types/role-model-intelligence";

const EASE = [0.16, 1, 0.3, 1] as const;

/** A score band so we never rely on color alone (a11y §20). */
function band(score: number): string {
  if (score >= 80) return "High";
  if (score >= 55) return "Notable";
  if (score >= 35) return "Moderate";
  return "Low";
}

function barColor(score: number): string {
  if (score >= 80) return "from-emerald-500 to-teal-400";
  if (score >= 55) return "from-sky-500 to-indigo-400";
  if (score >= 35) return "from-amber-500 to-yellow-400";
  return "from-rose-500 to-orange-400";
}

export function RoleModelDNA({
  dimensions,
  overlap,
}: {
  dimensions: RoleModelDNADimension[];
  overlap?: RoleModelOverlap | null;
}) {
  const reduce = useReducedMotion();
  if (!dimensions.length) return null;

  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {dimensions.map((d, i) => (
          <li key={d.key} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">{d.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {band(d.score)} · {Math.round(d.score)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full bg-gradient-to-r", barColor(d.score))}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${Math.max(2, Math.min(100, d.score))}%` }}
                transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : i * 0.05, ease: EASE }}
              />
            </div>
            {d.explanation ? (
              <p className="text-[11px] leading-snug text-muted-foreground">{d.explanation}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {overlap && (overlap.high.length || overlap.medium.length || overlap.caution.length) ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
          <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Overlap with you
          </h5>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <OverlapColumn label="High" tone="emerald" items={overlap.high} />
            <OverlapColumn label="Medium" tone="sky" items={overlap.medium} />
            <OverlapColumn label="Caution" tone="amber" items={overlap.caution} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OverlapColumn({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "emerald" | "sky" | "amber";
  items: string[];
}) {
  if (!items.length) return null;
  const toneClass = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    sky: "text-sky-600 dark:text-sky-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div>
      <p className={cn("mb-1 text-[11px] font-semibold uppercase", toneClass)}>{label}</p>
      <ul className="space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs leading-snug text-foreground/90">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
