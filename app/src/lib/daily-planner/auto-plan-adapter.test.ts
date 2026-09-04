import { describe, expect, it } from "vitest";

import {
  calendarBusyMinutesToSchedulerWindows,
  dailyPlanTasksToLockedTasks,
  materializeAutoPlanCandidatePool,
  reconstructAcceptedAutoPlanSchedule,
  selectAutoPlanCandidates,
  scheduledTasksToDailyPlanTasks,
} from "@/lib/daily-planner/auto-plan-adapter";
import type { AutoPlanSchedule } from "@/lib/daily-planner/auto-plan-scheduler";
import type { FreePlanTask, Task } from "@/types/database";

const linkedTask = (overrides: Partial<Task>): Task => ({
  id: "task-1",
  user_id: "user-1",
  project_id: null,
  title: "Linked task",
  description: null,
  status: "todo",
  priority: "high",
  due_date: null,
  completed_at: null,
  estimated_blocks: 4,
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
  created_at: "2026-09-03T00:00:00.000Z",
  updated_at: "2026-09-03T00:00:00.000Z",
  ...overrides,
});

describe("Auto Plan adapter", () => {
  it("prefers unfinished Free Plan candidates and fills duration from linked task metadata", () => {
    const freeTasks: FreePlanTask[] = [
      { id: "free-1", title: "Proposal", priority: "must", order: 1, taskId: "task-1" },
      { id: "done", title: "Finished", priority: "done", order: 0 },
    ];

    const selection = selectAutoPlanCandidates({
      freeTasks,
      timedTasks: [{ plannerTaskId: "timed", taskName: "Timed", blocks: 2, order: 0 }],
      linkedTasks: [linkedTask({})],
      blockMinutes: 15,
    });

    expect(selection.source).toBe("free");
    expect(selection.candidates).toEqual([
      {
        id: "free-1",
        title: "Proposal",
        durationMinutes: 60,
        priority: "must",
        order: 1,
        taskId: "task-1",
      },
    ]);
  });

  it("falls back to timed tasks and maps linked task priority", () => {
    const selection = selectAutoPlanCandidates({
      freeTasks: [],
      timedTasks: [
        { plannerTaskId: "timed", taskName: "Timed", taskId: "task-1", blocks: 2, order: 3 },
      ],
      linkedTasks: [linkedTask({ priority: "medium" })],
      blockMinutes: 20,
    });

    expect(selection.source).toBe("timed");
    expect(selection.candidates[0]).toMatchObject({
      id: "timed",
      durationMinutes: 40,
      priority: "should",
      order: 3,
    });
  });

  it("materializes timed candidates into Free Plan so overflow survives acceptance", () => {
    const existingDone: FreePlanTask = {
      id: "done",
      title: "Already finished",
      priority: "done",
      order: 0,
    };

    expect(
      materializeAutoPlanCandidatePool({
        source: "timed",
        existingFreeTasks: [existingDone],
        candidates: [
          {
            id: "must",
            title: "Ship proposal",
            durationMinutes: 60,
            priority: "must",
            order: 4,
            taskId: "task-1",
          },
          {
            id: "overflow",
            title: "Read research",
            durationMinutes: 30,
            priority: "could",
            order: 8,
          },
        ],
      }),
    ).toEqual([
      existingDone,
      {
        id: "must",
        title: "Ship proposal",
        priority: "must",
        order: 0,
        taskId: "task-1",
        estimatedMinutes: 60,
      },
      {
        id: "overflow",
        title: "Read research",
        priority: "could",
        order: 0,
        estimatedMinutes: 30,
      },
    ]);
  });

  it("converts cross-midnight busy minutes to scheduler-local date times", () => {
    expect(
      calendarBusyMinutesToSchedulerWindows("2026-09-03", [
        { startMin: 23 * 60, endMin: 25 * 60 + 15 },
      ]),
    ).toEqual([
      { start: "2026-09-03T23:00", end: "2026-09-04T01:15" },
    ]);
  });

  it("converts an accepted schedule into exact adaptive planner rows", () => {
    const schedule: AutoPlanSchedule = {
      scheduledTasks: [
        {
          id: "free-1",
          title: "Proposal",
          taskId: "task-1",
          priority: "must",
          order: 0,
          requestedDurationMinutes: 50,
          durationMinutes: 60,
          startTime: "09:30",
          endTime: "10:30",
          startDayOffset: 0,
          endDayOffset: 0,
          locked: true,
        },
      ],
      unscheduledTasks: [],
      availableMinutes: 240,
      plannedMinutes: 60,
      reservedBufferMinutes: 10,
      remainingMinutes: 170,
    };

    expect(scheduledTasksToDailyPlanTasks(schedule, "08:00", 30)).toEqual([
      {
        plannerTaskId: "free-1",
        scheduleSource: "adaptive",
        locked: true,
        taskName: "Proposal",
        taskId: "task-1",
        blocks: 2,
        order: 0,
        gapBlocks: 3,
        start_time: "09:30",
        end_time: "10:30",
      },
    ]);
  });

  it("reconstructs accepted tasks and preserves next-day locks", () => {
    const tasks = [
      {
        plannerTaskId: "late",
        scheduleSource: "adaptive" as const,
        locked: true,
        taskName: "Late focus",
        blocks: 2,
        order: 0,
        start_time: "01:00",
        end_time: "02:00",
      },
    ];

    expect(dailyPlanTasksToLockedTasks(tasks, "2026-09-03", "22:00", "02:00"))
      .toEqual([
        {
          id: "late",
          title: "Late focus",
          start: "2026-09-04T01:00",
          end: "2026-09-04T02:00",
        },
      ]);

    const schedule = reconstructAcceptedAutoPlanSchedule({
      tasks,
      candidates: [
        { id: "late", title: "Late focus", durationMinutes: 60, priority: "must", order: 0 },
        { id: "overflow", title: "Overflow", durationMinutes: 90, priority: "could", order: 1 },
      ],
      startTime: "22:00",
      endTime: "02:00",
      blockMinutes: 30,
    });
    expect(schedule.scheduledTasks[0]).toMatchObject({
      id: "late",
      startDayOffset: 1,
      endDayOffset: 1,
      priority: "must",
      locked: true,
    });
    expect(schedule.unscheduledTasks).toEqual([
      expect.objectContaining({
        id: "overflow",
        reason: "insufficient-contiguous-time",
      }),
    ]);
  });
});
