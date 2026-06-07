import { describe, expect, it } from "vitest";

import type { JapaneseStudySession, Task } from "@/types/database";
import { getAnalyticsDateRange } from "./date-range";
import { computeMomentumWave } from "./compute-life-pulse";

const NOW = new Date(2026, 5, 7, 12, 0, 0);

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? "task-1",
    user_id: "user-1",
    project_id: null,
    title: "Task",
    description: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    completed_at: null,
    estimated_blocks: null,
    tags: [],
    source: null,
    source_url: null,
    reminder_date: null,
    category: null,
    ai_generated: false,
    ai_metadata: null,
    sort_order: null,
    scheduled_date: null,
    calendar_event_id: null,
    calendar_provider: null,
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:00:00.000Z",
    ...overrides,
  };
}

function studySession(overrides: Partial<JapaneseStudySession>): JapaneseStudySession {
  return {
    id: overrides.id ?? "session-1",
    user_id: "user-1",
    session_date: "2026-06-01",
    duration_minutes: 30,
    study_type: "study",
    content: null,
    notes: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeMomentumWave", () => {
  it("aggregates medium ranges into weekly buckets", () => {
    const range = getAnalyticsDateRange(
      { source: "custom", startISO: "2026-01-01", endISO: "2026-06-07" },
      NOW,
    );
    const wave = computeMomentumWave({
      range,
      tasks: [
        task({ id: "a", status: "done", completed_at: "2026-01-03" }),
        task({ id: "b", status: "done", completed_at: "2026-06-01" }),
      ],
      studySessions: [studySession({ session_date: "2026-06-01", duration_minutes: 60 })],
      journalEntries: [],
      dailyPlans: [],
    });

    expect(wave.granularity).toBe("week");
    expect(wave.points.length).toBeLessThan(30);
    expect(wave.points.reduce((sum, point) => sum + point.completedTasks, 0)).toBe(2);
    expect(wave.points.reduce((sum, point) => sum + point.studyMinutes, 0)).toBe(60);
  });

  it("aggregates long ranges into monthly buckets", () => {
    const range = getAnalyticsDateRange(
      { source: "custom", startISO: "2024-01-01", endISO: "2026-06-07" },
      NOW,
    );
    const wave = computeMomentumWave({
      range,
      tasks: [
        task({ id: "a", status: "done", completed_at: "2024-02-10" }),
        task({ id: "b", status: "done", completed_at: "2026-05-20" }),
      ],
      studySessions: [],
      journalEntries: [],
      dailyPlans: [],
    });

    expect(wave.granularity).toBe("month");
    expect(wave.points.length).toBeLessThanOrEqual(30);
    expect(wave.points.reduce((sum, point) => sum + point.completedTasks, 0)).toBe(2);
  });
});
