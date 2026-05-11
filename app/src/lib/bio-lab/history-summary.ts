/**
 * Pure helpers that turn raw Supabase rows from the four Bio Lab tables
 * into a single, UI-ready summary.
 *
 * Why this lives in `lib/bio-lab/` (not under hooks):
 *   - Pure, testable, no React.
 *   - Reused by both the inline "Recent activity" strip and the full
 *     history sheet — having one source of truth prevents the two
 *     surfaces from drifting (e.g. one counting sessions and the other
 *     counting items inside sessions).
 *
 * Time semantics:
 *   - All "day" buckets use the visitor's local timezone via
 *     `Intl.DateTimeFormat`, not UTC. Two sessions both made on the same
 *     local day count as one streak day even if they straddle UTC midnight.
 *   - "Recent" defaults to the last 7 calendar days (today + 6 prior).
 */

import type {
  BioLabFocusSprintRow,
  BioLabMindSweepRow,
  BioLabStateScanRow,
  BioLabSystemResetRow,
} from "@/lib/repositories/bio-lab";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";

// ============================================================
// Public types
// ============================================================

export type RecentWindowDays = 7 | 14 | 30;

/** A single row in the unified timeline, normalised across the four tools. */
export type BioLabTimelineEntry =
  | {
      kind: "state-scan";
      id: string;
      createdAt: string;
      aiAssisted: boolean;
      row: BioLabStateScanRow;
    }
  | {
      kind: "mind-sweep";
      id: string;
      createdAt: string;
      aiAssisted: boolean;
      row: BioLabMindSweepRow;
    }
  | {
      kind: "focus-sprint";
      id: string;
      createdAt: string;
      aiAssisted: boolean;
      row: BioLabFocusSprintRow;
    }
  | {
      kind: "system-reset";
      id: string;
      createdAt: string;
      aiAssisted: boolean;
      row: BioLabSystemResetRow;
    };

export type BioLabHistorySummaryInput = {
  stateScans: BioLabStateScanRow[];
  mindSweeps: BioLabMindSweepRow[];
  focusSprints: BioLabFocusSprintRow[];
  systemResets: BioLabSystemResetRow[];
  /** Window for `recentByTool` counts and the timeline slice. Default: 7. */
  windowDays?: RecentWindowDays;
  /** Optional anchor "now" — accepts ISO string or Date. Tests pass this. */
  now?: Date | string;
};

export type BioLabHistorySummary = {
  /** Total sessions across all four tools in the window. */
  windowTotal: number;
  /** Per-tool session counts in the window. */
  recentByTool: Record<BioLabToolId, number>;
  /** Per-tool ISO timestamp of most recent session, or `null`. */
  lastUsedByTool: Record<BioLabToolId, string | null>;
  /**
   * Consecutive *local* days, counting backwards from today, with at least
   * one session of any tool. Capped at 30. Today still counts toward the
   * streak even if no session exists today (we anchor on "today or earlier").
   *
   * Concretely:
   *   - If user did a session today → streak = 1+ continuing back
   *   - If user did a session yesterday but not today → streak = 1+ counting from yesterday
   *   - If no session in the window at all → streak = 0
   */
  streakDays: number;
  /** Did the user complete at least one session today (local)? */
  didSomethingToday: boolean;
  /** Has any session ever happened? Used for empty-state messaging. */
  hasAnyHistory: boolean;
  /** Did the AI assist any session in the window? */
  anyAiAssistedRecently: boolean;
  /** Unified timeline of the most recent N entries, newest first. */
  unifiedTimeline: BioLabTimelineEntry[];
};

// ============================================================
// Constants
// ============================================================

const STREAK_CAP_DAYS = 30;
const TIMELINE_MAX_ENTRIES = 30;

// ============================================================
// Public API
// ============================================================

export function summariseBioLabHistory(
  input: BioLabHistorySummaryInput,
): BioLabHistorySummary {
  const windowDays = input.windowDays ?? 7;
  const now = toDate(input.now);

  const all: BioLabTimelineEntry[] = [
    ...input.stateScans.map(toStateScanEntry),
    ...input.mindSweeps.map(toMindSweepEntry),
    ...input.focusSprints.map(toFocusSprintEntry),
    ...input.systemResets.map(toSystemResetEntry),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const windowStartMs = startOfDayLocal(addDays(now, -(windowDays - 1))).getTime();

  const recentByTool: Record<BioLabToolId, number> = {
    "state-scan": 0,
    "mind-sweep": 0,
    "focus-sprint": 0,
    "system-reset": 0,
  };
  const lastUsedByTool: Record<BioLabToolId, string | null> = {
    "state-scan": null,
    "mind-sweep": null,
    "focus-sprint": null,
    "system-reset": null,
  };
  let anyAiAssistedRecently = false;

  for (const entry of all) {
    // last-used: keep newest seen (entries are already sorted desc)
    if (lastUsedByTool[entry.kind] === null) {
      lastUsedByTool[entry.kind] = entry.createdAt;
    }
    const entryMs = new Date(entry.createdAt).getTime();
    if (entryMs >= windowStartMs) {
      recentByTool[entry.kind] += 1;
      if (entry.aiAssisted) anyAiAssistedRecently = true;
    }
  }

  const windowTotal =
    recentByTool["state-scan"] +
    recentByTool["mind-sweep"] +
    recentByTool["focus-sprint"] +
    recentByTool["system-reset"];

  const distinctLocalDays = collectDistinctLocalDays(all);
  const todayKey = localDayKey(now);
  const didSomethingToday = distinctLocalDays.has(todayKey);
  const streakDays = computeStreak(distinctLocalDays, now);

  return {
    windowTotal,
    recentByTool,
    lastUsedByTool,
    streakDays,
    didSomethingToday,
    hasAnyHistory: all.length > 0,
    anyAiAssistedRecently,
    unifiedTimeline: all.slice(0, TIMELINE_MAX_ENTRIES),
  };
}

// ============================================================
// Per-tool row → timeline entry adapters
// ============================================================

function toStateScanEntry(row: BioLabStateScanRow): BioLabTimelineEntry {
  return {
    kind: "state-scan",
    id: row.id,
    createdAt: row.created_at,
    aiAssisted: row.ai_assisted,
    row,
  };
}

function toMindSweepEntry(row: BioLabMindSweepRow): BioLabTimelineEntry {
  return {
    kind: "mind-sweep",
    id: row.id,
    createdAt: row.created_at,
    aiAssisted: row.ai_assisted,
    row,
  };
}

function toFocusSprintEntry(row: BioLabFocusSprintRow): BioLabTimelineEntry {
  return {
    kind: "focus-sprint",
    id: row.id,
    createdAt: row.created_at,
    aiAssisted: row.ai_assisted,
    row,
  };
}

function toSystemResetEntry(row: BioLabSystemResetRow): BioLabTimelineEntry {
  return {
    kind: "system-reset",
    id: row.id,
    createdAt: row.created_at,
    aiAssisted: row.ai_assisted,
    row,
  };
}

// ============================================================
// Date helpers (timezone-aware on the local viewer's clock)
// ============================================================

/**
 * Stable, sortable "YYYY-MM-DD" key in the *local* timezone.
 *
 * We avoid `toISOString()` because that returns UTC; a user in UTC-08 doing
 * a session at 11pm local on Friday would otherwise be bucketed into
 * Saturday for streak purposes.
 */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDayLocal(d: Date): Date {
  const out = new Date(d.getTime());
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

function toDate(input: Date | string | undefined): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string") return new Date(input);
  return new Date();
}

function collectDistinctLocalDays(
  entries: BioLabTimelineEntry[],
): Set<string> {
  const out = new Set<string>();
  for (const e of entries) {
    out.add(localDayKey(new Date(e.createdAt)));
  }
  return out;
}

/**
 * Streak rule:
 *   - If the user did something today: count today, then walk back day-by-day
 *     while each previous day also has a session. Stop on first gap.
 *   - If today is empty but yesterday has a session: anchor on yesterday and
 *     count back from there. (This avoids "streak resets at midnight" feeling.)
 *   - If neither today nor yesterday have a session: streak = 0.
 *   - Capped at {@link STREAK_CAP_DAYS} so very long histories don't surprise
 *     us with huge numbers we never tested.
 */
function computeStreak(distinctDays: Set<string>, now: Date): number {
  const today = startOfDayLocal(now);
  const todayKey = localDayKey(today);
  const yesterdayKey = localDayKey(addDays(today, -1));

  let cursor: Date;
  if (distinctDays.has(todayKey)) {
    cursor = today;
  } else if (distinctDays.has(yesterdayKey)) {
    cursor = addDays(today, -1);
  } else {
    return 0;
  }

  let count = 0;
  while (count < STREAK_CAP_DAYS && distinctDays.has(localDayKey(cursor))) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

// ============================================================
// Per-tool 7-day sparkline data
// ============================================================

const SPARKLINE_DAYS = 7;

export type SparklineCell = {
  /** Local-day key, oldest first within the array. Stable for `key` props. */
  dayKey: string;
  /** Sessions that day for the source tool. Always ≥ 0. */
  count: number;
  /** True iff `dayKey` is today (local). Used for accent in the UI. */
  isToday: boolean;
};

/**
 * Build a 7-cell sparkline from any of the four row arrays.
 *
 * Cells are returned **oldest → newest** so the consumer can render them
 * left-to-right without reversing. Local-day bucketing matches streak
 * semantics (see {@link summariseBioLabHistory}).
 *
 * Pure and shape-stable: always returns exactly {@link SPARKLINE_DAYS}
 * entries — even when there is zero history — so the UI can render an
 * empty 7-day grid as the steady-state baseline.
 */
export function buildToolSparkline(
  rows: ReadonlyArray<{ created_at: string }>,
  now: Date | string = new Date(),
): SparklineCell[] {
  const today = startOfDayLocal(toDate(now));

  const counts = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.created_at);
    if (Number.isNaN(d.getTime())) continue;
    const key = localDayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells: SparklineCell[] = [];
  for (let offset = SPARKLINE_DAYS - 1; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset);
    const key = localDayKey(day);
    cells.push({
      dayKey: key,
      count: counts.get(key) ?? 0,
      isToday: offset === 0,
    });
  }
  return cells;
}

// ============================================================
// Last-used formatter (used by tool-card badges)
// ============================================================

export type LastUsedBadgeStrings = {
  today: string;
  yesterday: string;
  daysAgo: (days: number) => string;
  longAgo: string;
};

/**
 * Turn a "last used" ISO timestamp into a short, human-readable label like
 * "Today" / "Yesterday" / "3d ago" / "30d+". Returns `null` when the input
 * is `null` so the card can hide its badge entirely.
 *
 * Day boundaries are local-time (matches streak semantics).
 */
export function formatLastUsedLabel(
  lastUsedIso: string | null,
  strings: LastUsedBadgeStrings,
  now: Date | string = new Date(),
): string | null {
  if (lastUsedIso === null) return null;
  const lastUsed = new Date(lastUsedIso);
  if (Number.isNaN(lastUsed.getTime())) return null;

  const today = startOfDayLocal(toDate(now));
  const lastUsedDay = startOfDayLocal(lastUsed);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((today.getTime() - lastUsedDay.getTime()) / msPerDay);

  if (diffDays <= 0) return strings.today;
  if (diffDays === 1) return strings.yesterday;
  if (diffDays >= STREAK_CAP_DAYS) return strings.longAgo;
  return strings.daysAgo(diffDays);
}

// ============================================================
// Re-exports
// ============================================================

export { TIMELINE_MAX_ENTRIES, STREAK_CAP_DAYS };
