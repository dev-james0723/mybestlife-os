/**
 * Discriminated union types for what each Bio Lab tool produces when a user
 * finishes a session. Used by:
 *   - `useNextStepSuggestion` to decide what to recommend next.
 *   - `ToolCompletionCard` to render the post-completion summary.
 *   - The Supabase repository to know which table to write to.
 *
 * Narrow on `tool` — never read `data` without switching on the tag.
 */

import type { BioLabToolId } from "@/lib/bio-lab/tool-types";
import type { MindSweepKind, FocusOutcome } from "@/lib/bio-lab/flow-types";

/** Tool ids re-exported under a friendlier alias for spec parity. */
export type ToolType = BioLabToolId;

// ============================================================
// Per-tool result shapes
// ============================================================

/**
 * State Scan completion. `inferredFromText` is true when the AI inference
 * route populated the sliders from a natural-language prompt and the user
 * accepted (or only lightly adjusted) the result.
 */
export type StateScanResult = {
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  note: string;
  /** True when AI inference contributed to the slider positions. */
  inferredFromText: boolean;
};

export type MindSweepItem = {
  text: string;
  kind: MindSweepKind;
  /** When AI suggested the label, what its confidence was (null = manual). */
  aiLabelConfidence: "high" | "low" | null;
};

/**
 * Mind Sweep completion. Items reflect the final, possibly-edited labels.
 * `triageInsight` is the optional one-line note generated from a 3+ item batch.
 */
export type MindSweepResult = {
  items: MindSweepItem[];
  triageInsight: string | null;
};

export type FocusSprintResult = {
  intention: string;
  workSeconds: number;
  breakSeconds: number;
  outcome: FocusOutcome;
  /** Self-reported focus rating 1–5 from the post-sprint micro-reflection. */
  focusRating: number | null;
  reflectionNote: string;
  /** True when AI recommended the intention/duration the user accepted. */
  aiRecommended: boolean;
};

export type SystemResetStepCompletion = {
  /** Step id within the sequence — stable across static and AI variants. */
  id: string;
  durationSeconds: number;
  skipped: boolean;
};

export type SystemResetResult = {
  steps: SystemResetStepCompletion[];
  /** True when the AI generated a personalized 5-step sequence. */
  aiAdaptive: boolean;
};

// ============================================================
// Discriminated union over all four tools
// ============================================================

export type ToolCompletionData =
  | { tool: "state-scan"; data: StateScanResult }
  | { tool: "mind-sweep"; data: MindSweepResult }
  | { tool: "focus-sprint"; data: FocusSprintResult }
  | { tool: "system-reset"; data: SystemResetResult };

/**
 * Narrow helper — useful when callers receive `ToolCompletionData` of unknown tag.
 */
export function isToolCompletion<T extends ToolType>(
  data: ToolCompletionData,
  tool: T,
): data is Extract<ToolCompletionData, { tool: T }> {
  return data.tool === tool;
}

// ============================================================
// Next-step suggestion
// ============================================================

/**
 * One contextual recommendation surfaced after a tool completes. The rule
 * engine emits a structured object; the i18n layer renders the actual copy.
 *
 * `intentKey` is the i18n lookup key into `bio-lab-completion-ui.ts` →
 * `nextStepIntents`; the rule engine never composes display strings itself.
 */
export type NextStepSuggestion = {
  /** The tool we recommend the user open next. `null` means "no follow-up". */
  nextTool: ToolType | null;
  /** Stable key into the i18n `nextStepIntents` map. */
  intentKey: NextStepIntentKey;
  /** A short signal payload the i18n layer can interpolate (numbers only). */
  signal: NextStepSignal;
};

/**
 * Stable rule-output keys. Each key maps 1:1 to copy in
 * `bio-lab-completion-ui.ts → nextStepIntents`. Keep in sync with the rule
 * engine in `next-step-rules.ts`.
 */
export type NextStepIntentKey =
  // From State Scan
  | "stress-high-reset"
  | "energy-low-reset"
  | "focus-ready-sprint"
  | "neutral-mindSweep"
  // From Mind Sweep
  | "tasks-ready-sprint"
  | "all-worries-reset"
  | "captured-stateScan"
  // From Focus Sprint
  | "sprint-strong-again"
  | "sprint-weak-reset"
  | "sprint-weak-stateScan"
  | "sprint-default-stateScan"
  // From System Reset
  | "reset-recheck-state"
  // Generic fallback
  | "session-rest";

/**
 * Numeric/boolean payload the rule engine includes alongside an `intentKey`
 * so the i18n layer can interpolate (e.g. "3 tasks captured · start a sprint?").
 * Always plain primitives — never user free text — to keep i18n callable
 * shapes simple.
 */
export type NextStepSignal = {
  taskCount?: number;
  worryCount?: number;
  ideaCount?: number;
  reminderCount?: number;
  stress?: number;
  energy?: number;
  focus?: number;
  mood?: number;
  focusRating?: number;
};
