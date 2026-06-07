import { describe, expect, it } from "vitest";

import type { DailyPlanTask, FocusPreference, Task } from "@/types/database";
import { buildPlanQualityReport } from "./plan-quality";
import { classifyTaskText } from "./task-classification";

const focusPreferences: FocusPreference = {
  id: "pref-1",
  user_id: "user-1",
  low_stimulation_mode_enabled: true,
  distraction_gate_enabled: true,
  urge_surfing_delay_seconds: 10,
  default_focus_minutes: 50,
  break_reminder_minutes: 50,
  high_stimulation_routes: ["/youtube-radar", "/ai-assistant"],
  ai_access_requires_intention: true,
  show_actual_timeline_overlay: true,
  created_at: "2026-06-07T00:00:00.000Z",
  updated_at: "2026-06-07T00:00:00.000Z",
};

function task(overrides: Partial<Task> = {}): Task {
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
    project: null,
    ...overrides,
  };
}

function planTask(
  plannerTaskId: string,
  taskName: string,
  blocks: number,
  order: number,
): DailyPlanTask {
  return { plannerTaskId, taskName, blocks, order };
}

describe("classifyTaskText", () => {
  it("detects high stimulation before broader task classes", () => {
    expect(classifyTaskText("Research YouTube shorts competitors")).toBe("high_stimulation");
  });

  it("recognizes recovery and deep work terms", () => {
    expect(classifyTaskText("Walk and reset")).toBe("recovery");
    expect(classifyTaskText("Code planner scoring engine")).toBe("deep_work");
  });
});

describe("buildPlanQualityReport", () => {
  it("flags overloaded plans with missing breaks and weak deep-work protection", () => {
    const report = buildPlanQualityReport({
      planDate: "2026-06-07",
      startTime: "09:00",
      endTime: "12:00",
      blockMinutes: 30,
      tasks: [
        planTask("a", "Email cleanup", 1, 0),
        planTask("b", "Admin invoices", 1, 1),
        planTask("c", "Reply to messages", 1, 2),
        planTask("d", "Schedule errands", 1, 3),
        planTask("e", "Organize files", 1, 4),
        planTask("f", "Browse YouTube research", 2, 5),
      ],
      freeTasks: [],
      mode: "time-block",
      linkedTasks: [],
      calendarEvents: [],
      focusPreferences,
    });

    expect(report.score).toBeLessThan(80);
    expect(report.issues.map((issue) => issue.type)).toContain("overload");
    expect(report.issues.map((issue) => issue.type)).toContain("missing_break");
    expect(report.issues.map((issue) => issue.type)).toContain("weak_deep_work_protection");
    expect(report.suggested_changes.some((change) => change.type === "add_break")).toBe(true);
  });

  it("handles cross-midnight plans without false overload", () => {
    const report = buildPlanQualityReport({
      planDate: "2026-06-07",
      startTime: "22:00",
      endTime: "01:00",
      blockMinutes: 30,
      tasks: [planTask("a", "Write launch notes", 2, 0), planTask("b", "Rest", 1, 1)],
      freeTasks: [],
      mode: "time-block",
      linkedTasks: [task({ id: "linked", title: "Write launch notes", category: "creative" })],
      calendarEvents: [],
      focusPreferences,
    });

    expect(report.issues.map((issue) => issue.type)).not.toContain("overload");
    expect(report.focus_target_minutes).toBe(60);
  });

  it("detects calendar conflicts for deep work", () => {
    const report = buildPlanQualityReport({
      planDate: "2026-06-07",
      startTime: "09:00",
      endTime: "12:00",
      blockMinutes: 30,
      tasks: [planTask("a", "Code feature", 4, 0), planTask("b", "Break", 1, 1)],
      freeTasks: [],
      mode: "time-block",
      linkedTasks: [],
      calendarEvents: [
        {
          id: "external-1",
          title: "Client meeting",
          date: "2026-06-07",
          start_time: "10:00",
          end_time: "10:30",
          color: null,
          subtitle: null,
          source_type: "external",
          source_id: "external-1",
          calendar_id: "primary",
          location: null,
        },
      ],
      focusPreferences,
    });

    expect(report.issues.map((issue) => issue.type)).toContain("calendar_conflict");
  });
});
