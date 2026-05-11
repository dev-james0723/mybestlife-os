"use client";

import { motion, useReducedMotion } from "framer-motion";
import { History, Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { typography } from "@/lib/constants/design-tokens";
import { cn } from "@/lib/utils";
import { getBioLabToolDefinition } from "@/lib/bio-lab/tools-metadata";
import { getBioLabVisualTokens } from "@/lib/bio-lab/visual-tokens";
import type { BioLabTimelineEntry } from "@/lib/bio-lab/history-summary";
import type { BioLabHistoryCopy } from "@/lib/i18n/bio-lab-history-ui";
import type { UiTheme } from "@/types/database";

/**
 * Unified timeline of recent Bio Lab sessions across all four tools.
 *
 * Why this is a single chronological list (rather than four per-tool tabs):
 *   - "Did I do anything yesterday?" should be answerable in one glance.
 *   - Most users do <30 sessions/week — tabbing would feel heavy.
 *   - The kind-specific summary line gives just enough detail to recall the
 *     session without reopening it. Tapping does NOT navigate (yet) — the
 *     panels themselves are stateless, so re-opening a past session would
 *     mislead. We treat this as a read-only ledger.
 */
export type BioLabHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: BioLabTimelineEntry[];
  copy: BioLabHistoryCopy;
  /** Used by the per-row icon chip to pick a theme-tinted accent. */
  uiTheme: UiTheme;
  /** "Now" override for tests/snapshots. */
  now?: Date;
};

export function BioLabHistorySheet({
  open,
  onOpenChange,
  entries,
  copy,
  uiTheme,
  now,
}: BioLabHistorySheetProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const sheetCopy = copy.sheet;
  const nowDate = now ?? new Date();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom-card"
        className="gap-0 p-0 sm:max-w-lg"
        showCloseButton
      >
        <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
          <SheetTitle className="flex items-center gap-2">
            <History className="size-4 stroke-[1.6] text-muted-foreground" aria-hidden />
            <span>{sheetCopy.title}</span>
          </SheetTitle>
          <SheetDescription>{sheetCopy.subtitle}</SheetDescription>
        </SheetHeader>

        <div className="max-h-[min(78dvh,36rem)] overflow-y-auto overscroll-contain px-4 py-3">
          {entries.length === 0 ? (
            <EmptyState title={sheetCopy.emptyTitle} body={sheetCopy.emptyBody} />
          ) : (
            <ol className="space-y-2">
              {entries.map((entry, idx) => (
                <motion.li
                  key={entry.id}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, y: 4 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: reduceMotion ? 0 : Math.min(idx * 0.015, 0.18),
                    ease: "easeOut",
                  }}
                >
                  <TimelineRow
                    entry={entry}
                    copy={copy}
                    uiTheme={uiTheme}
                    now={nowDate}
                  />
                </motion.li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Internal: empty state
// ============================================================

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span
        className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border/60"
        aria-hidden
      >
        <History className="size-5 stroke-[1.6]" />
      </span>
      <p className={cn(typography.body, "font-medium text-foreground")}>{title}</p>
      <p
        className={cn(
          typography.caption,
          "max-w-xs text-balance text-muted-foreground",
        )}
      >
        {body}
      </p>
    </div>
  );
}

// ============================================================
// Internal: timeline row
// ============================================================

function TimelineRow({
  entry,
  copy,
  uiTheme,
  now,
}: {
  entry: BioLabTimelineEntry;
  copy: BioLabHistoryCopy;
  uiTheme: UiTheme;
  now: Date;
}) {
  const def = getBioLabToolDefinition(entry.kind);
  const tokens = getBioLabVisualTokens(entry.kind, uiTheme);
  const Icon = def?.icon;
  const sheetCopy = copy.sheet;

  const label = sheetCopy.toolEntryLabel[entry.kind];
  const summaryText = formatEntrySummary(entry, copy);
  const relative = formatRelativeTimestamp(entry.createdAt, copy, now);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/60 bg-card/85 px-3 py-2.5",
        "transition-colors hover:bg-card",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tokens.iconChip,
        )}
        aria-hidden
      >
        {Icon ? (
          <Icon className={cn("size-4 stroke-[1.7]", tokens.iconForeground)} />
        ) : null}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <p className="shrink-0 text-[0.6875rem] tabular-nums text-muted-foreground">
            {relative}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {summaryText}
        </p>
        {entry.aiAssisted ? (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[0.625rem] font-medium leading-none text-violet-700 ring-1 ring-violet-500/20 dark:text-violet-300 dark:ring-violet-300/20">
            <Sparkles className="size-2.5" aria-hidden />
            <span>{sheetCopy.aiTag}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ============================================================
// Internal: per-kind summary formatter
// ============================================================

function formatEntrySummary(
  entry: BioLabTimelineEntry,
  copy: BioLabHistoryCopy,
): string {
  const s = copy.sheet.summary;
  switch (entry.kind) {
    case "state-scan": {
      const r = entry.row;
      return s.stateScan(r.mood, r.energy, r.focus, r.stress);
    }
    case "mind-sweep": {
      // Defensive: items column is jsonb but we expect an array
      const count = Array.isArray(entry.row.items) ? entry.row.items.length : 0;
      return s.mindSweep(count);
    }
    case "focus-sprint": {
      const r = entry.row;
      const minutes = Math.max(1, Math.round(r.work_seconds / 60));
      return s.focusSprint(r.intention ?? "", minutes);
    }
    case "system-reset": {
      const r = entry.row;
      const steps = Array.isArray(r.steps) ? r.steps.length : 0;
      return s.systemReset(steps);
    }
  }
}

// ============================================================
// Internal: relative timestamp ("Just now" / "5m ago" / "2h ago" / date)
// ============================================================

function formatRelativeTimestamp(
  iso: string,
  copy: BioLabHistoryCopy,
  now: Date,
): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) {
    return copy.sheet.olderDateFallback(iso);
  }
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return copy.sheet.justNow;
  if (diffMin < 60) return copy.sheet.minutesAgo(diffMin);
  const diffH = Math.round(diffMs / 3_600_000);
  if (diffH < 24) return copy.sheet.hoursAgo(diffH);
  return copy.sheet.olderDateFallback(iso);
}
