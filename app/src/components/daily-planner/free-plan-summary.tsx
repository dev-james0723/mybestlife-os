"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ListChecks, Sparkles } from "lucide-react";

import { GlassPanel } from "@/components/ui/glass-panel";
import { cn } from "@/lib/utils";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { FreePlanTask } from "@/types/database";

const SECTION_ORDER: ReadonlyArray<FreePlanTask["priority"]> = [
  "must",
  "should",
  "could",
  "done",
];

const SECTION_DOT: Record<FreePlanTask["priority"], string> = {
  must: "bg-rose-400/80",
  should: "bg-amber-300/85",
  could: "bg-sky-300/80",
  done: "bg-emerald-400/80",
};

function sectionLabel(copy: DailyPlannerUiCopy, p: FreePlanTask["priority"]): string {
  return p === "must"
    ? copy.freePriorityMust
    : p === "should"
      ? copy.freePriorityShould
      : p === "could"
        ? copy.freePriorityCould
        : copy.freePriorityDone;
}

export interface FreePlanSummaryProps {
  copy: DailyPlannerUiCopy;
  tasks: FreePlanTask[];
  windowLabel: string;
}

/**
 * Read-only checklist preview of the active Free Plan. Replaces the timeline-based
 * VisualScheduleGenerator while in Free Mode — no fake time slots, just a clean grouped list.
 */
export function FreePlanSummary({ copy, tasks, windowLabel }: FreePlanSummaryProps) {
  const prefersReduced = useReducedMotion();
  const grouped = SECTION_ORDER.map((p) => ({
    priority: p,
    label: sectionLabel(copy, p),
    items: tasks.filter((t) => t.priority === p).sort((a, b) => a.order - b.order),
  }));

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <GlassPanel className="relative overflow-hidden p-4 sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="space-y-4">
          <header className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 ring-1 ring-violet-500/20 dark:text-violet-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-foreground">
                {copy.freePlanSummaryTitle}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {copy.freePlanSummaryBlurb}
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90">
                <ListChecks className="h-3 w-3" />
                {windowLabel}
              </p>
            </div>
          </header>

          {tasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-6 text-center text-xs text-muted-foreground">
              {copy.noTasksYet}
            </div>
          ) : (
            <div className="space-y-3">
              {grouped.map((section) =>
                section.items.length === 0 ? null : (
                  <section key={section.priority} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          SECTION_DOT[section.priority],
                        )}
                        aria-hidden
                      />
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.label}
                      </p>
                      <span className="ml-auto text-[10px] tabular-nums text-muted-foreground/70">
                        {section.items.length}
                      </span>
                    </div>
                    <ul className="space-y-1 pl-3">
                      {section.items.map((t) => (
                        <li
                          key={t.id}
                          className={cn(
                            "flex items-start gap-2 text-[13px] leading-snug",
                            section.priority === "done"
                              ? "text-muted-foreground line-through"
                              : "text-foreground/95",
                          )}
                        >
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                          <span className="break-words">{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ),
              )}
            </div>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
