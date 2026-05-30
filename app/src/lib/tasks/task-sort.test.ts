import { describe, expect, it } from "vitest";

import type { Task } from "@/types/database";
import { sortTasks } from "./task-sort";

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
    created_at: "2026-05-13T00:00:00.000Z",
    updated_at: "2026-05-13T00:00:00.000Z",
    project: null,
    ...overrides,
  };
}

describe("sortTasks", () => {
  it("created_at defaults to newest first", () => {
    const tasks = [
      makeTask({ id: "old", created_at: "2026-05-10T00:00:00.000Z" }),
      makeTask({ id: "new", created_at: "2026-05-12T00:00:00.000Z" }),
      makeTask({ id: "mid", created_at: "2026-05-11T00:00:00.000Z" }),
    ];
    expect(sortTasks(tasks, "created_at").map((t) => t.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("due_date ascending with nulls last", () => {
    const tasks = [
      makeTask({ id: "none", due_date: null }),
      makeTask({ id: "late", due_date: "2026-06-01" }),
      makeTask({ id: "soon", due_date: "2026-05-15" }),
    ];
    expect(sortTasks(tasks, "due_date").map((t) => t.id)).toEqual([
      "soon",
      "late",
      "none",
    ]);
  });

  it("priority urgent-first", () => {
    const tasks = [
      makeTask({ id: "low", priority: "low" }),
      makeTask({ id: "urgent", priority: "urgent" }),
      makeTask({ id: "medium", priority: "medium" }),
    ];
    expect(sortTasks(tasks, "priority").map((t) => t.id)).toEqual([
      "urgent",
      "medium",
      "low",
    ]);
  });

  it("title respects an explicit direction override", () => {
    const tasks = [
      makeTask({ id: "b", title: "Bravo" }),
      makeTask({ id: "a", title: "Alpha" }),
    ];
    expect(sortTasks(tasks, "title", "asc").map((t) => t.id)).toEqual(["a", "b"]);
    expect(sortTasks(tasks, "title", "desc").map((t) => t.id)).toEqual(["b", "a"]);
  });
});
