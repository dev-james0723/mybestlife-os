import { format } from "date-fns";
import { classifyDayLoad, computeFreeWindows } from "../projection";
import type {
  CalendarItem,
  ConflictWarning,
  DailySummary,
  FreeWindow,
  PlanSuggestion,
} from "../types";

/** Summarize recorded items locally; no external AI request. */
export async function summarizeDay(
  date: string,
  items: CalendarItem[]
): Promise<DailySummary> {
  items = items.filter((item) => item.date === date);
  const load = classifyDayLoad(items);
  const overdueCount = items.filter(
    (i) => i.source_type === "task" && "overdue" in i && i.overdue
  ).length;
  const text =
    items.length === 0
      ? "No items recorded for this date. Add one thing you would like to do."
      : `${items.length} recorded item${items.length === 1 ? "" : "s"} for this date. ${items.slice(0, 3).map((item) => item.title).join(" · ")}. This overview uses your saved calendar items.`;
  const highlights: string[] = [];
  highlights.push(`${items.length} item${items.length === 1 ? "" : "s"} on the board`);
  highlights.push(`Day load: ${load}`);
  if (overdueCount > 0) {
    highlights.push(`${overdueCount} overdue — tackle early`);
  }
  return { date, text, highlights, energy_label: load === "Focus-heavy" ? "High focus" : "Mixed" };
}

/** Report time overlaps and heavy task counts within each date. */
export async function detectConflicts(items: CalendarItem[]): Promise<ConflictWarning[]> {
  const out: ConflictWarning[] = [];
  const boxed = items.filter((i) => i.start_time && i.end_time);
  for (let i = 0; i < boxed.length; i++) {
    for (let j = i + 1; j < boxed.length; j++) {
      const a = boxed[i];
      const b = boxed[j];
      if (a.date !== b.date) continue;
      const [aS, aE] = [a.start_time!, a.end_time!];
      const [bS, bE] = [b.start_time!, b.end_time!];
      if (aS < bE && bS < aE) {
        out.push({
          id: `cw-overlap-${a.id}-${b.id}`,
          kind: "time_overlap",
          severity: "critical",
          message: `"${a.title}" and "${b.title}" overlap between ${aS > bS ? aS : bS}–${aE < bE ? aE : bE}.`,
          item_ids: [a.id, b.id],
          suggestion: "Shift one item or shrink its duration.",
        });
      }
    }
  }

  const focusItems = items.filter(
    (i) =>
      i.source_type === "task" &&
      "estimated_blocks" in i &&
      (i.estimated_blocks ?? 0) >= 6
  );
  for (const date of new Set(focusItems.map((item) => item.date))) {
  const dayFocus = focusItems.filter((item) => item.date === date);
  const focusCount = dayFocus.length;
  if (focusCount >= 3) {
    out.push({
      id: `cw-focus-saturation-${date}`,
      kind: "focus_saturation",
      severity: "warn",
      message: `${focusCount} large estimated tasks recorded for ${date}. Consider leaving room between them.`,
      item_ids: dayFocus.map((item) => item.id),
      suggestion: "Distribute one or two across adjacent days.",
    });
  }

  }
  return out;
}

/**
 * Detect free windows ≥30 min within the given working hours.
 *
 * Deterministic / pure — no external call needed. Kept in the AI layer
 * so consumers import it alongside the other intelligence functions.
 */
export async function findFreeWindows(
  date: string,
  items: CalendarItem[],
  workHours: { start: string; end: string } = { start: "09:00", end: "19:00" }
): Promise<FreeWindow[]> {
  const computed = computeFreeWindows(date, items, workHours.start, workHours.end);
  return computed;
}

/** Offer starting steps in recorded free windows, without applying them. */
export async function generatePlan(
  date: string,
  unscheduledItems: CalendarItem[],
  freeWindows: FreeWindow[]
): Promise<PlanSuggestion[]> {
  const windows = freeWindows.filter((window) => window.date === date).map((window) => ({ ...window }));
  const suggestions: PlanSuggestion[] = [];
  const seen = new Set<string>();
  const toMinutes = (time: string) => { const [h, m] = time.split(":").map(Number); return h * 60 + m; };
  const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  for (const item of unscheduledItems) {
    if (item.date !== date || item.source_type !== "task" || item.start_time || item.status === "done" || item.status === "cancelled" || seen.has(item.source_id)) continue;
    seen.add(item.source_id);
    // Without the user's block length we cannot turn estimated_blocks into minutes.
    // Offer an explicit 20-minute starting step, not a claimed completion estimate.
    const duration = 20;
    const window = windows.find((candidate) => toMinutes(candidate.end) - toMinutes(candidate.start) >= duration);
    if (!window) break;
    const end = toTime(toMinutes(window.start) + duration);
    suggestions.push({ id: `plan-${date}-${item.source_id}`, task_id: item.source_id, title: item.title,
      slot: { start: window.start, end }, rationale: "A 20-minute starting step in an unoccupied window of your recorded schedule. Review before applying.", energy: "shallow" });
    window.start = end;
  }
  return suggestions;
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports for convenience
// ──────────────────────────────────────────────────────────────────────

export type { ConflictWarning, DailySummary, FreeWindow, PlanSuggestion };

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}
