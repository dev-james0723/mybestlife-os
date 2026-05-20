import { describe, expect, it } from "vitest";
import {
  mapDailyPlansToCalendarItems,
  mapFreePlanToCalendarItems,
  mapTimeBlockPlanToCalendarItems,
  resolveLinkedTaskMeta,
} from "@/lib/calendar/sources/daily-plans";
import type { DailyPlan, Task } from "@/types/database";

const basePlan = (overrides: Partial<DailyPlan> = {}): DailyPlan => ({
  id: "plan-1",
  user_id: "user-1",
  plan_date: "2026-05-20",
  start_time: "09:00",
  end_time: "22:00",
  tasks: [],
  free_tasks: [],
  mode: "time-block",
  schedule_image_url: null,
  template_id: null,
  created_at: "2026-05-20T00:00:00Z",
  updated_at: "2026-05-20T00:00:00Z",
  ...overrides,
});

const linkedTask: Task = {
  id: "task-abc",
  user_id: "user-1",
  project_id: "proj-1",
  title: "Linked task title",
  description: "Task notes",
  status: "todo",
  priority: "high",
  due_date: "2026-05-25",
  completed_at: null,
  estimated_blocks: 4,
  tags: ["work"],
  source: null,
  source_url: null,
  reminder_date: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
  project: { id: "proj-1", name: "My Project" },
};

describe("mapTimeBlockPlanToCalendarItems", () => {
  it("maps two sequential tasks from 09:00 with block_minutes", () => {
    const plan = basePlan({
      tasks: [
        { plannerTaskId: "pt-1", taskName: "Task A", blocks: 2, order: 0 },
        { plannerTaskId: "pt-2", taskName: "Task B", blocks: 3, order: 1 },
      ],
    });
    const items = mapTimeBlockPlanToCalendarItems({
      plan,
      taskRows: [],
      blockMinutes: 10,
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Task A",
      date: "2026-05-20",
      start_time: "09:00",
      end_time: "09:20",
      blocks: 2,
      duration_minutes: 20,
      source_type: "planner_time_block",
    });
    expect(items[1]).toMatchObject({
      title: "Task B",
      start_time: "09:20",
      end_time: "09:50",
      duration_minutes: 30,
    });
  });

  it("places cross-midnight tasks on the correct calendar day", () => {
    const plan = basePlan({
      plan_date: "2026-05-20",
      start_time: "23:00",
      tasks: [
        { plannerTaskId: "a", taskName: "Late A", blocks: 6, order: 0 },
        { plannerTaskId: "b", taskName: "Late B", blocks: 6, order: 1 },
      ],
    });
    const items = mapTimeBlockPlanToCalendarItems({
      plan,
      taskRows: [],
      blockMinutes: 10,
    });
    expect(items[0]).toMatchObject({
      date: "2026-05-20",
      start_time: "23:00",
      end_time: "00:00",
    });
    expect(items[1]).toMatchObject({
      date: "2026-05-21",
      start_time: "00:00",
      end_time: "01:00",
    });
  });

  it("falls back to Untitled and minimum 1 block", () => {
    const plan = basePlan({
      tasks: [{ blocks: 0, order: 0 }],
    });
    const items = mapTimeBlockPlanToCalendarItems({
      plan,
      taskRows: [],
      blockMinutes: 10,
    });
    expect(items[0].title).toBe("Untitled");
    expect(items[0].blocks).toBe(1);
  });
});

describe("mapFreePlanToCalendarItems", () => {
  it("maps untimed free plan tasks on plan_date", () => {
    const plan = basePlan({
      free_tasks: [
        { id: "f1", title: "Must item", priority: "must", order: 0 },
        { id: "f2", title: "Should item", priority: "should", order: 1 },
      ],
    });
    const items = mapFreePlanToCalendarItems({
      plan,
      taskRows: [],
      blockMinutes: 10,
    });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      date: "2026-05-20",
      start_time: null,
      end_time: null,
      source_type: "planner_free_task",
      free_priority: "must",
    });
    expect(items[1].free_priority).toBe("should");
  });

  it("maps done priority to done status", () => {
    const plan = basePlan({
      free_tasks: [{ id: "f1", title: "Finished", priority: "done", order: 0 }],
    });
    const items = mapFreePlanToCalendarItems({
      plan,
      taskRows: [],
      blockMinutes: 10,
    });
    expect(items[0].status).toBe("done");
  });
});

describe("resolveLinkedTaskMeta", () => {
  it("resolves project name, tags, and priority from linked task", () => {
    const meta = resolveLinkedTaskMeta("task-abc", [linkedTask]);
    expect(meta).toMatchObject({
      title: "Linked task title",
      project_name: "My Project",
      tags: ["work"],
      priority: "high",
      estimated_blocks: 4,
    });
  });

  it("uses linked metadata in free plan mapping", () => {
    const plan = basePlan({
      free_tasks: [
        {
          id: "f1",
          title: "",
          priority: "must",
          order: 0,
          taskId: "task-abc",
          estimatedMinutes: 25,
        },
      ],
    });
    const items = mapFreePlanToCalendarItems({
      plan,
      taskRows: [linkedTask],
      blockMinutes: 10,
    });
    expect(items[0]).toMatchObject({
      title: "Linked task title",
      project_name: "My Project",
      tags: ["work"],
      estimated_minutes: 25,
      subtitle: expect.stringContaining("My Project"),
    });
  });
});

describe("mapDailyPlansToCalendarItems", () => {
  it("produces no items for empty plans", () => {
    expect(
      mapDailyPlansToCalendarItems({
        dailyPlans: [basePlan()],
        taskRows: [],
        blockMinutes: 10,
      }),
    ).toEqual([]);
  });

  it("does not duplicate stable IDs", () => {
    const plan = basePlan({
      tasks: [{ plannerTaskId: "dup", taskName: "Once", blocks: 1, order: 0 }],
      free_tasks: [{ id: "free-1", title: "Free", priority: "could", order: 0 }],
    });
    const items = mapDailyPlansToCalendarItems({
      dailyPlans: [plan, plan],
      taskRows: [],
      blockMinutes: 10,
    });
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(2);
  });
});
