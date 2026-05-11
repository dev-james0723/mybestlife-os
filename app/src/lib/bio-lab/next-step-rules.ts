/**
 * Pure rule engine for "what should the user do next?" recommendations.
 *
 * Inputs: a {@link ToolCompletionData} (the tag identifies which tool just
 * finished), plus optional cross-tool context the caller has at hand.
 * Output: one {@link NextStepSuggestion} — never null. If no specific
 * follow-up applies, returns the `session-rest` fallback so the
 * `ToolCompletionCard` can still surface a graceful "you're done for now"
 * state.
 *
 * Design notes:
 *   - Pure function; no React, no Supabase, no i18n. Display copy lives in
 *     `lib/i18n/bio-lab-completion-ui.ts → nextStepIntents`.
 *   - Phase 1: covers the rule combinations called out in the spec
 *     (≥4 documented). Phase 3 adds the "all worries → reset" / sprint rating
 *     branches and the cross-session "Start My Session" sequencer.
 *   - Counts and thresholds are hoisted to named constants at the top so
 *     they're easy to tune without grepping the body.
 */

import type {
  ToolCompletionData,
  NextStepSuggestion,
  NextStepSignal,
  StateScanResult,
  MindSweepResult,
  FocusSprintResult,
  MindSweepItem,
} from "@/lib/bio-lab/completion-types";

// ============================================================
// Tunable thresholds
// ============================================================

const STRESS_HIGH = 4;
const ENERGY_LOW = 2;
const FOCUS_READY = 4;
const SPRINT_STRONG = 4;
const SPRINT_WEAK = 2;
const MIN_TASKS_FOR_SPRINT = 1;

// ============================================================
// Optional cross-tool context
// ============================================================

/**
 * Cross-tool hints the caller may pass in. All optional — the rule engine
 * gracefully degrades when no context is available.
 */
export type NextStepContext = {
  /** Most recent State Scan in the current session, if any. */
  recentStateScan?: StateScanResult | null;
  /** Most recent Mind Sweep result in the current session, if any. */
  recentMindSweep?: MindSweepResult | null;
};

// ============================================================
// Public entry point
// ============================================================

export function suggestNextStep(
  completion: ToolCompletionData,
  context: NextStepContext = {},
): NextStepSuggestion {
  switch (completion.tool) {
    case "state-scan":
      return suggestAfterStateScan(completion.data, context);
    case "mind-sweep":
      return suggestAfterMindSweep(completion.data);
    case "focus-sprint":
      return suggestAfterFocusSprint(completion.data);
    case "system-reset":
      return suggestAfterSystemReset();
    default:
      return fallback();
  }
}

// ============================================================
// Per-tool branches
// ============================================================

function suggestAfterStateScan(
  r: StateScanResult,
  ctx: NextStepContext,
): NextStepSuggestion {
  const signal: NextStepSignal = {
    stress: r.stress,
    energy: r.energy,
    focus: r.focus,
    mood: r.mood,
  };

  if (r.stress >= STRESS_HIGH) {
    return { nextTool: "system-reset", intentKey: "stress-high-reset", signal };
  }
  if (r.energy <= ENERGY_LOW) {
    return { nextTool: "system-reset", intentKey: "energy-low-reset", signal };
  }

  // Focused and there's something concrete to work on → sprint.
  const taskCount = countKind(ctx.recentMindSweep?.items, "task");
  if (r.focus >= FOCUS_READY && taskCount >= MIN_TASKS_FOR_SPRINT) {
    return {
      nextTool: "focus-sprint",
      intentKey: "focus-ready-sprint",
      signal: { ...signal, taskCount },
    };
  }

  return { nextTool: "mind-sweep", intentKey: "neutral-mindSweep", signal };
}

function suggestAfterMindSweep(r: MindSweepResult): NextStepSuggestion {
  const taskCount = countKind(r.items, "task");
  const worryCount = countKind(r.items, "worry");
  const ideaCount = countKind(r.items, "idea");
  const reminderCount = countKind(r.items, "reminder");
  const signal: NextStepSignal = {
    taskCount,
    worryCount,
    ideaCount,
    reminderCount,
  };

  // All items are worries → grounding before action.
  if (r.items.length > 0 && worryCount === r.items.length) {
    return { nextTool: "system-reset", intentKey: "all-worries-reset", signal };
  }

  if (taskCount >= MIN_TASKS_FOR_SPRINT) {
    return { nextTool: "focus-sprint", intentKey: "tasks-ready-sprint", signal };
  }

  return { nextTool: "state-scan", intentKey: "captured-stateScan", signal };
}

function suggestAfterFocusSprint(r: FocusSprintResult): NextStepSuggestion {
  const rating = r.focusRating;
  const signal: NextStepSignal = { focusRating: rating ?? undefined };

  if (rating !== null && rating >= SPRINT_STRONG) {
    return {
      nextTool: "focus-sprint",
      intentKey: "sprint-strong-again",
      signal,
    };
  }

  if (rating !== null && rating <= SPRINT_WEAK) {
    // Weak rating — recommend a System Reset; a follow-up State Scan helps
    // the user notice what shifted afterward.
    return { nextTool: "system-reset", intentKey: "sprint-weak-reset", signal };
  }

  // No rating or middle of the range → recheck state before next move.
  return {
    nextTool: "state-scan",
    intentKey: "sprint-default-stateScan",
    signal,
  };
}

function suggestAfterSystemReset(): NextStepSuggestion {
  // After a reset, always a State Scan to verify what shifted.
  return {
    nextTool: "state-scan",
    intentKey: "reset-recheck-state",
    signal: {},
  };
}

// ============================================================
// Helpers
// ============================================================

function countKind(
  items: readonly MindSweepItem[] | undefined,
  kind: MindSweepItem["kind"],
): number {
  if (!items) return 0;
  return items.reduce((acc, item) => (item.kind === kind ? acc + 1 : acc), 0);
}

function fallback(): NextStepSuggestion {
  return { nextTool: null, intentKey: "session-rest", signal: {} };
}
