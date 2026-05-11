/**
 * Pure rule engine for the Garden hub's "what next?" chip.
 *
 * Distinct from {@link suggestNextStep} (the in-flow completion-card engine):
 *   - That engine sees rich, in-memory `ToolCompletionData` immediately after
 *     a tool finishes.
 *   - This engine sees only the persisted Supabase rows the user happens to
 *     have. It runs on hub mount / on every history refresh, not at the
 *     dramatic moment of completion.
 *
 * Goals:
 *   - Stay quiet by default. We only return a suggestion when the rule is
 *     strong AND the suggested next tool differs from the one just used.
 *   - Be deterministic. The chip sits next to copy the user reads
 *     immediately — predictability beats cleverness.
 *   - Never AI-call. Latency, cost, and the "different result every time"
 *     vibe are all wrong here.
 *
 * Usage:
 *   const suggestion = computeHubSuggestion({
 *     mostRecent: summary.unifiedTimeline[0] ?? null,
 *     now: new Date(),
 *   });
 *   if (suggestion) renderChip(suggestion);
 */

import type {
  BioLabFocusSprintRow,
  BioLabMindSweepRow,
  BioLabStateScanRow,
  BioLabSystemResetRow,
} from "@/lib/repositories/bio-lab";
import type { BioLabToolId } from "@/lib/bio-lab/tool-types";
import type { BioLabTimelineEntry } from "@/lib/bio-lab/history-summary";

// ============================================================
// Tunable thresholds
// ============================================================

/** State Scan stress at or above this → suggest a System Reset. */
const STRESS_HIGH = 4;
/** State Scan energy at or below this → suggest a System Reset. */
const ENERGY_LOW = 2;
/** State Scan focus at or above this → suggest a Focus Sprint. */
const FOCUS_READY = 4;
/** Focus Sprint rating at or below this → suggest a System Reset. */
const SPRINT_WEAK = 2;
/** Mind Sweep with this many items captured → suggest a Focus Sprint. */
const MIND_SWEEP_BUSY = 5;
/** Don't surface suggestions if the most recent session is older than this. */
const MAX_AGE_HOURS = 6;

// ============================================================
// Public types
// ============================================================

/**
 * Stable i18n key into `bio-lab-history-ui.ts → suggestion.reasons`.
 * Add a new key here AND its localised copy in lock-step.
 */
export type HubSuggestionReasonKey =
  | "stress-high-reset"
  | "energy-low-reset"
  | "focus-ready-sprint"
  | "sprint-weak-reset"
  | "sprint-strong-rescan"
  | "many-thoughts-sprint"
  | "reset-rescan";

export type HubSuggestion = {
  /** Tool to launch when the chip is tapped. */
  toolId: BioLabToolId;
  /** Stable key for localised reason copy. */
  reasonKey: HubSuggestionReasonKey;
  /**
   * Stable identity for de-duplication / per-session dismissal. Combines the
   * source row id with the reason key so dismissing a "stress-high" suggestion
   * doesn't also silence later, unrelated suggestions on the same row.
   */
  dismissKey: string;
};

export type HubSuggestionInput = {
  /** Most recent timeline entry; usually `summary.unifiedTimeline[0] ?? null`. */
  mostRecent: BioLabTimelineEntry | null;
  /** Override "now" for tests. */
  now?: Date;
};

// ============================================================
// Public entry point
// ============================================================

export function computeHubSuggestion(
  input: HubSuggestionInput,
): HubSuggestion | null {
  const { mostRecent } = input;
  if (mostRecent === null) return null;

  const now = input.now ?? new Date();
  if (!isFreshEnough(mostRecent.createdAt, now)) return null;

  switch (mostRecent.kind) {
    case "state-scan":
      return fromStateScan(mostRecent.row, mostRecent.id);
    case "mind-sweep":
      return fromMindSweep(mostRecent.row, mostRecent.id);
    case "focus-sprint":
      return fromFocusSprint(mostRecent.row, mostRecent.id);
    case "system-reset":
      return fromSystemReset(mostRecent.row, mostRecent.id);
  }
}

// ============================================================
// Per-source-tool rules
// ============================================================

function fromStateScan(
  row: BioLabStateScanRow,
  rowId: string,
): HubSuggestion | null {
  // Highest-priority signals first; first match wins.
  if (row.stress >= STRESS_HIGH) {
    return suggestion("system-reset", "stress-high-reset", rowId);
  }
  if (row.energy <= ENERGY_LOW) {
    return suggestion("system-reset", "energy-low-reset", rowId);
  }
  if (row.focus >= FOCUS_READY) {
    return suggestion("focus-sprint", "focus-ready-sprint", rowId);
  }
  // Neutral state scan → no nudge. The user already knows where they are.
  return null;
}

function fromMindSweep(
  row: BioLabMindSweepRow,
  rowId: string,
): HubSuggestion | null {
  const itemCount = Array.isArray(row.items) ? row.items.length : 0;
  if (itemCount >= MIND_SWEEP_BUSY) {
    return suggestion("focus-sprint", "many-thoughts-sprint", rowId);
  }
  // Light mind sweep — no strong follow-up signal at the hub level.
  return null;
}

function fromFocusSprint(
  row: BioLabFocusSprintRow,
  rowId: string,
): HubSuggestion | null {
  const rating = row.focus_rating;
  if (rating !== null && rating <= SPRINT_WEAK) {
    return suggestion("system-reset", "sprint-weak-reset", rowId);
  }
  if (rating !== null && rating >= 4) {
    // Strong sprint — invite a State Scan to notice what shifted, *not*
    // another sprint (which the completion card may already have suggested).
    return suggestion("state-scan", "sprint-strong-rescan", rowId);
  }
  // No rating, mid-rating, or blocked outcome → quiet.
  return null;
}

function fromSystemReset(
  _row: BioLabSystemResetRow,
  rowId: string,
): HubSuggestion | null {
  // After a reset, *always* suggest a State Scan to verify what shifted.
  // This is cheap, low-friction, and reinforces the reset → recheck loop.
  return suggestion("state-scan", "reset-rescan", rowId);
}

// ============================================================
// Helpers
// ============================================================

function suggestion(
  toolId: BioLabToolId,
  reasonKey: HubSuggestionReasonKey,
  rowId: string,
): HubSuggestion {
  return { toolId, reasonKey, dismissKey: `${rowId}:${reasonKey}` };
}

function isFreshEnough(iso: string, now: Date): boolean {
  const created = new Date(iso).getTime();
  if (Number.isNaN(created)) return false;
  const ageMs = now.getTime() - created;
  if (ageMs < 0) return true; // future-dated row (clock skew) — treat as fresh
  const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000;
  return ageMs <= maxAgeMs;
}

// ============================================================
// Re-exports (for tests / debugging)
// ============================================================

export { MAX_AGE_HOURS };
