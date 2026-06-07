import { describe, expect, it } from "vitest";

import type { PlannerFocusSession, PlannerStimulationEvent } from "@/types/database";
import { computeStimulationLoadScore, isHighStimulationRoute } from "./stimulation-score";
import { buildDailyPlanReviewDraft, computeDailyFocusMetrics } from "./review-metrics";

function session(overrides: Partial<PlannerFocusSession>): PlannerFocusSession {
  return {
    id: overrides.id ?? "session-1",
    user_id: "user-1",
    daily_plan_id: null,
    planner_task_id: null,
    task_id: null,
    project_id: null,
    plan_date: "2026-06-07",
    task_title: "Build feature",
    session_type: "deep_work",
    status: "completed",
    planned_start_at: "2026-06-07T09:00:00.000Z",
    planned_end_at: "2026-06-07T10:00:00.000Z",
    actual_start_at: "2026-06-07T09:05:00.000Z",
    actual_end_at: "2026-06-07T09:55:00.000Z",
    win_condition: null,
    allowed_tools: [],
    blocked_routes: [],
    blocked_domains: [],
    interruption_count: 0,
    stimulation_leak_count: 0,
    energy_before: null,
    energy_after: null,
    focus_rating: 4,
    completion_state: "completed",
    completion_note: null,
    created_at: "2026-06-07T09:00:00.000Z",
    updated_at: "2026-06-07T10:00:00.000Z",
    ...overrides,
  };
}

function event(overrides: Partial<PlannerStimulationEvent>): PlannerStimulationEvent {
  return {
    id: overrides.id ?? "event-1",
    user_id: "user-1",
    focus_session_id: "session-1",
    plan_date: "2026-06-07",
    event_type: "route_gate",
    route: "/ai-assistant",
    domain: null,
    decision: "continued_intentionally",
    reason: null,
    delay_seconds: 10,
    created_at: "2026-06-07T09:30:00.000Z",
    ...overrides,
  };
}

describe("stimulation-score", () => {
  it("matches nested high-stimulation routes", () => {
    expect(isHighStimulationRoute("/ai-assistant/chat")).toBe(true);
    expect(isHighStimulationRoute("/en/vault/research")).toBe(true);
    expect(isHighStimulationRoute("/en/ideas")).toBe(true);
    expect(isHighStimulationRoute("/en/vault", ["/software-vault"])).toBe(true);
    expect(isHighStimulationRoute("/en/ideas", ["/idea-capture"])).toBe(true);
    expect(isHighStimulationRoute("/daily-planner")).toBe(false);
  });

  it("scores continued routes and rewards return-to-focus decisions", () => {
    const score = computeStimulationLoadScore([
      event({ id: "continued", decision: "continued_intentionally" }),
      event({ id: "returned", decision: "returned_to_focus" }),
      event({ id: "manual", event_type: "manual_interrupt", route: null, decision: null }),
    ]);

    expect(score.highStimulationRouteEvents).toBe(2);
    expect(score.score).toBe(31);
  });
});

describe("review-metrics", () => {
  it("computes planned-vs-actual review metrics", () => {
    const metrics = computeDailyFocusMetrics({
      plannedMinutes: 120,
      sessions: [
        session({ id: "deep", actual_end_at: "2026-06-07T10:05:00.000Z" }),
        session({
          id: "recovery",
          task_title: "Walk",
          session_type: "recovery",
          planned_start_at: "2026-06-07T10:10:00.000Z",
          planned_end_at: "2026-06-07T10:30:00.000Z",
          actual_start_at: "2026-06-07T10:10:00.000Z",
          actual_end_at: "2026-06-07T10:30:00.000Z",
          focus_rating: 3,
        }),
      ],
      stimulationEvents: [event({ decision: "returned_to_focus" })],
    });

    expect(metrics.actualFocusMinutes).toBe(60);
    expect(metrics.recoveryMinutes).toBe(20);
    expect(metrics.planAccuracyRatio).toBe(0.5);
    expect(metrics.bestFocusWindow?.label).toBe("Build feature");

    const review = buildDailyPlanReviewDraft(metrics);
    expect(review.focus_integrity_score).toBeGreaterThan(70);
    expect(review.tomorrow_suggestion).toBeTruthy();
  });
});
