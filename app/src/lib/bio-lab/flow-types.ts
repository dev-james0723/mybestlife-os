export type MindSweepKind = "task" | "worry" | "idea" | "reminder";

export const MIND_SWEEP_KINDS: readonly MindSweepKind[] = [
  "task",
  "worry",
  "idea",
  "reminder",
] as const;

export function parseMindSweepKind(value: string): MindSweepKind | null {
  return (MIND_SWEEP_KINDS as readonly string[]).includes(value)
    ? (value as MindSweepKind)
    : null;
}

export type MindSweepEntry = {
  id: string;
  text: string;
  kind: MindSweepKind;
  createdAt: string;
};

export type StateScanEntry = {
  id: string;
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  note: string;
  createdAt: string;
};

export type FocusOutcome = "completed" | "partial" | "blocked";

export type FocusPresetId = "p25" | "p50" | "p90" | "custom";

export type FocusPreset = {
  id: FocusPresetId;
  workMinutes: number;
  breakMinutes: number;
};

export const FOCUS_PRESETS: readonly FocusPreset[] = [
  { id: "p25", workMinutes: 25, breakMinutes: 5 },
  { id: "p50", workMinutes: 50, breakMinutes: 10 },
  { id: "p90", workMinutes: 90, breakMinutes: 15 },
] as const;

export type SystemResetStepId =
  | "breathe"
  | "hydrate"
  | "clear-space"
  | "next-step"
  | "restart";

export type SystemResetStepDef = {
  id: SystemResetStepId;
};

export const SYSTEM_RESET_STEPS: readonly SystemResetStepDef[] = [
  { id: "breathe" },
  { id: "hydrate" },
  { id: "clear-space" },
  { id: "next-step" },
  { id: "restart" },
] as const;

export function newMindSweepId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newStateScanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ss-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const MAX_MIND_SWEEP_ENTRIES = 120;
export const MAX_STATE_SCAN_HISTORY = 40;
