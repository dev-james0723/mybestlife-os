/**
 * Mock AI outputs. Shape matches the real contracts in `types.ts` so the
 * UI renders identically when real providers swap in (Phase 5+).
 */

import type {
  ConflictWarning,
  DailySummary,
  FreeWindow,
  PlanSuggestion,
} from "../types";

export function mockDailySummary(date: string): DailySummary {
  return {
    date,
    text: "Today leans toward deep focus — block the morning for the onboarding design doc, then keep the afternoon low-context for admin and follow-ups. Two overdue items from earlier in the week want 15 minutes each before they snowball.",
    highlights: [
      "1 deep-work session (3h) planned",
      "2 overdue items carried over",
      "No meetings scheduled — protect the block",
    ],
    energy_label: "High focus",
  };
}

export function mockConflicts(): ConflictWarning[] {
  return [
    {
      id: "cw-1",
      kind: "focus_saturation",
      severity: "warn",
      message:
        "Three focus-heavy tasks stacked back-to-back — you'll likely hit cognitive fatigue by mid-afternoon.",
      item_ids: ["task:t-today-focus", "task:t-tomorrow-1", "task:t-d5-1"],
      suggestion: "Move the essay draft to Friday morning instead of Thursday evening.",
    },
    {
      id: "cw-2",
      kind: "deadline_cluster",
      severity: "info",
      message:
        "Rent and beta launch both fall within 72 hours — consider paying rent today to clear mental bandwidth.",
      item_ids: ["task:t-d3-1", "milestone:m-1"],
      suggestion: null,
    },
  ];
}

export function mockFreeWindows(date: string): FreeWindow[] {
  return [
    {
      date,
      start: "14:00",
      end: "16:00",
      duration_minutes: 120,
      label: "2h free 2–4 PM",
    },
    {
      date,
      start: "16:30",
      end: "17:30",
      duration_minutes: 60,
      label: "1h free 4:30–5:30 PM",
    },
  ];
}

export function mockPlanSuggestions(): PlanSuggestion[] {
  return [
    {
      id: "ps-1",
      task_id: "t-today-focus",
      title: "Deep work — design doc for onboarding",
      slot: { start: "09:00", end: "11:30" },
      rationale: "Your most energetic window — protect for deep work.",
      energy: "deep",
    },
    {
      id: "ps-2",
      task_id: null,
      title: "Break — walk & coffee",
      slot: { start: "11:30", end: "12:00" },
      rationale: "Context reset before admin block.",
      energy: "recovery",
    },
    {
      id: "ps-3",
      task_id: "t-today-small",
      title: "Send invoice to Acme",
      slot: { start: "14:00", end: "14:20" },
      rationale: "Low-context task fits perfectly into the post-lunch dip.",
      energy: "shallow",
    },
    {
      id: "ps-4",
      task_id: "t-today-reply",
      title: "Reply to Mark about roadmap",
      slot: { start: "14:20", end: "14:40" },
      rationale: "Batch alongside the invoice to protect later focus.",
      energy: "shallow",
    },
    {
      id: "ps-5",
      task_id: "t-overdue-1",
      title: "Review quarterly OKRs (overdue)",
      slot: { start: "16:30", end: "17:30" },
      rationale: "An hour of structured review before end of day.",
      energy: "shallow",
    },
  ];
}
