import { describe, expect, it } from "vitest";

import type { Task } from "@/types/database";
import {
  EMPTY_TASK_FILTER,
  NO_PROJECT_FILTER,
  countActiveFilters,
  filterTasks,
  matchesLinked,
  matchesProject,
  matchesSearch,
  matchesTags,
  type TaskFilterState,
} from "./task-filters";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    user_id: "u1",
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
    created_at: "2026-05-13",
    updated_at: "2026-05-13",
    project: null,
    ...overrides,
  };
}

describe("matchesSearch", () => {
  it("searches title, description, project name and tags", () => {
    const t = makeTask({
      title: "Outreach",
      description: "email sponsors",
      project: { id: "p1", name: "D Festival" },
      tags: ["urgent-ish"],
    });
    expect(matchesSearch(t, "outreach")).toBe(true);
    expect(matchesSearch(t, "sponsors")).toBe(true);
    expect(matchesSearch(t, "festival")).toBe(true);
    expect(matchesSearch(t, "urgent-ish")).toBe(true);
    expect(matchesSearch(t, "nope")).toBe(false);
    expect(matchesSearch(t, "")).toBe(true);
  });
});

describe("matchesProject", () => {
  it("handles all / specific / none", () => {
    const withProject = makeTask({ project_id: "p1" });
    const without = makeTask({ project_id: null });
    expect(matchesProject(withProject, "all")).toBe(true);
    expect(matchesProject(withProject, "p1")).toBe(true);
    expect(matchesProject(withProject, "p2")).toBe(false);
    expect(matchesProject(without, NO_PROJECT_FILTER)).toBe(true);
    expect(matchesProject(withProject, NO_PROJECT_FILTER)).toBe(false);
  });
});

describe("matchesTags", () => {
  it("OR-matches any selected tag (case-insensitive)", () => {
    const t = makeTask({ tags: ["Music", "Practice"] });
    expect(matchesTags(t, [])).toBe(true);
    expect(matchesTags(t, ["music"])).toBe(true);
    expect(matchesTags(t, ["admin", "practice"])).toBe(true);
    expect(matchesTags(t, ["admin"])).toBe(false);
  });
});

describe("matchesLinked", () => {
  it("resolves project + AI flags from the task", () => {
    const ai = makeTask({ source: "ai:tasks", project_id: "p1" });
    expect(matchesLinked(ai, ["has-project"])).toBe(true);
    expect(matchesLinked(ai, ["ai-generated"])).toBe(true);
    expect(matchesLinked(ai, ["no-project"])).toBe(false);
  });

  it("resolves cross-module flags from context", () => {
    const t = makeTask({ id: "t9" });
    const ctx = { getLinkFlags: (id: string) => (id === "t9" ? { goal: true } : undefined) };
    expect(matchesLinked(t, ["linked-goal"], ctx)).toBe(true);
    expect(matchesLinked(t, ["linked-habit"], ctx)).toBe(false);
  });
});

describe("filterTasks", () => {
  const tasks = [
    makeTask({ id: "a", status: "todo", priority: "urgent", project_id: "p1" }),
    makeTask({ id: "b", status: "done", priority: "low", project_id: null }),
    makeTask({ id: "c", status: "in-progress", priority: "urgent", project_id: "p1" }),
  ];

  it("combines status + priority + project filters", () => {
    const state: TaskFilterState = {
      ...EMPTY_TASK_FILTER,
      priority: "urgent",
      project: "p1",
    };
    const result = filterTasks(tasks, state).map((t) => t.id);
    expect(result).toEqual(["a", "c"]);
  });

  it("passes everything with the empty filter", () => {
    expect(filterTasks(tasks, EMPTY_TASK_FILTER)).toHaveLength(3);
  });
});

describe("countActiveFilters", () => {
  it("counts narrowing dimensions", () => {
    expect(countActiveFilters(EMPTY_TASK_FILTER)).toBe(0);
    expect(
      countActiveFilters({
        ...EMPTY_TASK_FILTER,
        status: "todo",
        tags: ["x", "y"],
        linked: ["ai-generated"],
      }),
    ).toBe(4);
  });
});
