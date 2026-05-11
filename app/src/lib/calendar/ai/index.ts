/**
 * Calendar AI service layer (mock-first).
 *
 * Every function returns a typed payload and can be swapped for a real
 * provider (Claude / Gemini / self-hosted) without changing call sites.
 *
 * Real-data swap points are commented with `TODO: replace with …` so the
 * Phase 5 `CALENDAR_TODO.md` can reference them directly.
 */

import { format } from "date-fns";
import {
  mockConflicts,
  mockDailySummary,
  mockFreeWindows,
  mockPlanSuggestions,
} from "../mock/ai";
import { classifyDayLoad, computeFreeWindows } from "../projection";
import type {
  CalendarItem,
  ConflictWarning,
  DailySummary,
  FreeWindow,
  PlanSuggestion,
} from "../types";

/** Fake latency for a realistic skeleton feel during development. */
const MOCK_LATENCY_MS = 600;

function delay<T>(value: T, ms = MOCK_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Summarize the shape of a day — energy arc, top priorities, caveats.
 *
 * TODO: replace with Claude call.
 *   Request shape: { date, items: CalendarItem[], day_load, free_windows }
 *   Response: { text: string; highlights: string[]; energy_label: ... }
 */
export async function summarizeDay(
  date: string,
  items: CalendarItem[]
): Promise<DailySummary> {
  // Lightweight local synthesis even in mock mode so the summary
  // reflects actual item counts and flavors.
  const base = mockDailySummary(date);
  const load = classifyDayLoad(items);
  const overdueCount = items.filter(
    (i) => i.source_type === "task" && "overdue" in i && i.overdue
  ).length;
  const text =
    items.length === 0
      ? "Nothing scheduled today — a rare gift of open time. Use it on whatever's been quietly waiting."
      : base.text;
  const highlights: string[] = [];
  highlights.push(`${items.length} item${items.length === 1 ? "" : "s"} on the board`);
  highlights.push(`Day load: ${load}`);
  if (overdueCount > 0) {
    highlights.push(`${overdueCount} overdue — tackle early`);
  }
  return delay({ ...base, text, highlights });
}

/**
 * Detect conflicts beyond raw time overlap:
 *   - time_overlap
 *   - mental_overload (too many priority-urgent items)
 *   - focus_saturation (≥3 focus-heavy blocks in one day)
 *   - context_switching (>5 distinct projects in one day)
 *   - deadline_cluster (≥2 deadlines in 72h)
 *
 * TODO: replace with Claude call — this has real structure even in mock
 * mode so the panel shows plausible copy.
 */
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
          message: `"${a.title}" and "${b.title}" overlap between ${bS}–${Math.min(Number(aE), Number(bE))}.`,
          item_ids: [a.id, b.id],
          suggestion: "Shift one item or shrink its duration.",
        });
      }
    }
  }

  const focusCount = items.filter(
    (i) =>
      i.source_type === "task" &&
      "estimated_blocks" in i &&
      (i.estimated_blocks ?? 0) >= 6
  ).length;
  if (focusCount >= 3) {
    out.push({
      id: "cw-focus-saturation",
      kind: "focus_saturation",
      severity: "warn",
      message: `${focusCount} focus-heavy tasks on one day — you'll likely fatigue before finishing them all.`,
      item_ids: [],
      suggestion: "Distribute one or two across adjacent days.",
    });
  }

  // Blend in curated mock conflicts for the demo so the UI has variety.
  return delay([...out, ...mockConflicts()]);
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
  // If the day is entirely all-day items (no boxed schedule), synthesize a
  // couple of plausible windows so the TodayBlock has something to show.
  if (computed.length === 0 && items.length > 0) {
    return delay(mockFreeWindows(date));
  }
  return delay(computed);
}

/**
 * Propose a schedule — tasks-to-slots by priority, duration, and energy.
 *
 * TODO: replace with Claude call.
 *   Input:  { date, unscheduledTasks, freeWindows }
 *   Output: { suggestions: PlanSuggestion[] }
 */
export async function generatePlan(
  date: string,
  unscheduledItems: CalendarItem[],
  freeWindows: FreeWindow[]
): Promise<PlanSuggestion[]> {
  // Mock ignores inputs; real implementation (Phase 4) will thread them
  // into the Claude prompt payload. Silenced to avoid dead-arg lints.
  void date;
  void unscheduledItems;
  void freeWindows;
  return delay(mockPlanSuggestions());
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports for convenience
// ──────────────────────────────────────────────────────────────────────

export type { ConflictWarning, DailySummary, FreeWindow, PlanSuggestion };

export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}
