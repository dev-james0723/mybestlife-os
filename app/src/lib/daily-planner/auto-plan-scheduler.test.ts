import { describe, expect, it } from "vitest";
import { buildAutoPlanSchedule } from "./auto-plan-scheduler";

describe("buildAutoPlanSchedule", () => {
  it("schedules candidates by priority then order on the planner block grid", () => {
    const result = buildAutoPlanSchedule({
      planningDate: "2026-09-03",
      startTime: "08:00",
      endTime: "12:00",
      blockMinutes: 30,
      bufferMinutes: 0,
      candidates: [
        {
          id: "could",
          title: "Read later",
          durationMinutes: 20,
          priority: "could",
          order: 0,
        },
        {
          id: "must-2",
          title: "Write proposal",
          durationMinutes: 40,
          priority: "must",
          order: 2,
        },
        {
          id: "must-1",
          title: "Plan launch",
          durationMinutes: 30,
          priority: "must",
          order: 1,
        },
      ],
      busyWindows: [],
    });

    expect(
      result.scheduledTasks.map(({ id, startTime, endTime }) => ({
        id,
        startTime,
        endTime,
      })),
    ).toEqual([
      { id: "must-1", startTime: "08:00", endTime: "08:30" },
      { id: "must-2", startTime: "08:30", endTime: "09:30" },
      { id: "could", startTime: "09:30", endTime: "10:00" },
    ]);
  });

  it("merges busy windows and fills the free gaps without overlap", () => {
    const result = buildAutoPlanSchedule({
      planningDate: "2026-09-03",
      startTime: "08:00",
      endTime: "12:00",
      blockMinutes: 30,
      bufferMinutes: 0,
      candidates: [
        {
          id: "first",
          title: "Morning focus",
          durationMinutes: 60,
          priority: "must",
          order: 0,
        },
        {
          id: "second",
          title: "Late focus",
          durationMinutes: 90,
          priority: "should",
          order: 0,
        },
      ],
      busyWindows: [
        { start: "2026-09-03T09:00", end: "2026-09-03T10:00" },
        { start: "2026-09-03T09:30", end: "2026-09-03T10:30" },
      ],
    });

    expect(
      result.scheduledTasks.map(({ id, startTime, endTime }) => ({
        id,
        startTime,
        endTime,
      })),
    ).toEqual([
      { id: "first", startTime: "08:00", endTime: "09:00" },
      { id: "second", startTime: "10:30", endTime: "12:00" },
    ]);
    expect(result.availableMinutes).toBe(150);
    expect(result.plannedMinutes).toBe(150);
    expect(result.remainingMinutes).toBe(0);
  });

  it("reserves the requested recovery buffer after every generated task", () => {
    const result = buildAutoPlanSchedule({
      planningDate: "2026-09-03",
      startTime: "08:00",
      endTime: "10:00",
      blockMinutes: 30,
      bufferMinutes: 15,
      candidates: [
        {
          id: "one",
          title: "One",
          durationMinutes: 30,
          priority: "must",
          order: 0,
        },
        {
          id: "two",
          title: "Two",
          durationMinutes: 30,
          priority: "must",
          order: 1,
        },
        {
          id: "three",
          title: "Three",
          durationMinutes: 30,
          priority: "must",
          order: 2,
        },
      ],
      busyWindows: [],
    });

    expect(
      result.scheduledTasks.map(({ id, startTime, endTime }) => ({
        id,
        startTime,
        endTime,
      })),
    ).toEqual([
      { id: "one", startTime: "08:00", endTime: "08:30" },
      { id: "two", startTime: "09:00", endTime: "09:30" },
    ]);
    expect(result.unscheduledTasks).toEqual([
      expect.objectContaining({
        id: "three",
        reason: "insufficient-contiguous-time",
      }),
    ]);
    expect(result.plannedMinutes).toBe(60);
    expect(result.reservedBufferMinutes).toBe(30);
    expect(result.remainingMinutes).toBe(30);
  });

  it("returns explicit day offsets for a planning window that crosses midnight", () => {
    const result = buildAutoPlanSchedule({
      planningDate: "2026-09-03",
      startTime: "22:00",
      endTime: "02:00",
      blockMinutes: 30,
      bufferMinutes: 0,
      candidates: [
        {
          id: "night-one",
          title: "Night one",
          durationMinutes: 60,
          priority: "must",
          order: 0,
        },
        {
          id: "night-two",
          title: "Night two",
          durationMinutes: 60,
          priority: "should",
          order: 0,
        },
      ],
      busyWindows: [
        { start: "2026-09-03T22:30", end: "2026-09-03T23:30" },
        { start: "2026-09-04T00:30", end: "2026-09-04T01:00" },
      ],
    });

    expect(
      result.scheduledTasks.map(
        ({ id, startTime, endTime, startDayOffset, endDayOffset }) => ({
          id,
          startTime,
          endTime,
          startDayOffset,
          endDayOffset,
        }),
      ),
    ).toEqual([
      {
        id: "night-one",
        startTime: "23:30",
        endTime: "00:30",
        startDayOffset: 0,
        endDayOffset: 1,
      },
      {
        id: "night-two",
        startTime: "01:00",
        endTime: "02:00",
        startDayOffset: 1,
        endDayOffset: 1,
      },
    ]);
    expect(result.availableMinutes).toBe(150);
    expect(result.remainingMinutes).toBe(30);
  });

  it("preserves locked tasks and does not schedule their matching candidates twice", () => {
    const result = buildAutoPlanSchedule({
      planningDate: "2026-09-03",
      startTime: "08:00",
      endTime: "12:00",
      blockMinutes: 30,
      bufferMinutes: 15,
      candidates: [
        {
          id: "locked",
          taskId: "task-locked",
          title: "Locked review",
          durationMinutes: 30,
          priority: "should",
          order: 0,
        },
        {
          id: "must",
          title: "Must do",
          durationMinutes: 60,
          priority: "must",
          order: 0,
        },
        {
          id: "could",
          title: "Could do",
          durationMinutes: 60,
          priority: "could",
          order: 0,
        },
      ],
      busyWindows: [],
      lockedTasks: [
        {
          id: "locked",
          taskId: "task-locked",
          title: "Locked review",
          start: "2026-09-03T09:30",
          end: "2026-09-03T10:00",
        },
      ],
    });

    expect(
      result.scheduledTasks.map(({ id, startTime, endTime, locked }) => ({
        id,
        startTime,
        endTime,
        locked,
      })),
    ).toEqual([
      {
        id: "must",
        startTime: "08:00",
        endTime: "09:00",
        locked: false,
      },
      {
        id: "locked",
        startTime: "09:30",
        endTime: "10:00",
        locked: true,
      },
      {
        id: "could",
        startTime: "10:30",
        endTime: "11:30",
        locked: false,
      },
    ]);
    expect(result.plannedMinutes).toBe(150);
    expect(result.reservedBufferMinutes).toBe(45);
    expect(result.remainingMinutes).toBe(45);
  });

  it("rejects overlapping locked tasks because both slots cannot be preserved", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: 0,
        candidates: [],
        busyWindows: [],
        lockedTasks: [
          {
            id: "locked-a",
            title: "Locked A",
            start: "2026-09-03T09:00",
            end: "2026-09-03T10:00",
          },
          {
            id: "locked-b",
            title: "Locked B",
            start: "2026-09-03T09:30",
            end: "2026-09-03T10:30",
          },
        ],
      }),
    ).toThrow("lockedTasks must not overlap");
  });

  it("rejects a busy window whose end is not after its start", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: 0,
        candidates: [],
        busyWindows: [
          { start: "2026-09-03T10:00", end: "2026-09-03T09:00" },
        ],
      }),
    ).toThrow("busyWindows[0].end must be after start");
  });

  it("rejects timezone-bearing instants instead of silently shifting planner wall time", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: 0,
        candidates: [],
        busyWindows: [
          { start: "2026-09-03T09:00Z", end: "2026-09-03T10:00Z" },
        ],
      }),
    ).toThrow("busyWindows[0].start must use YYYY-MM-DDTHH:mm");
  });

  it("rejects a non-positive planner block size", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 0,
        bufferMinutes: 0,
        candidates: [],
        busyWindows: [],
      }),
    ).toThrow("blockMinutes must be a positive integer");
  });

  it("rejects a negative recovery buffer", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: -1,
        candidates: [],
        busyWindows: [],
      }),
    ).toThrow("bufferMinutes must be a non-negative integer");
  });

  it("rejects a candidate without a positive whole-minute duration", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: 0,
        candidates: [
          {
            id: "bad-duration",
            title: "Bad duration",
            durationMinutes: -30,
            priority: "must",
            order: 0,
          },
        ],
        busyWindows: [],
      }),
    ).toThrow("candidates[0].durationMinutes must be a positive integer");
  });

  it("rejects a locked task outside the planning window", () => {
    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: 0,
        candidates: [],
        busyWindows: [],
        lockedTasks: [
          {
            id: "outside",
            title: "Outside",
            start: "2026-09-03T07:30",
            end: "2026-09-03T08:30",
          },
        ],
      }),
    ).toThrow("lockedTasks[0] must be inside the planning window");
  });

  it("rejects duplicate candidate ids so tie-breaking stays deterministic", () => {
    const duplicate = {
      id: "same",
      title: "Same",
      durationMinutes: 30,
      priority: "must" as const,
      order: 0,
    };

    expect(() =>
      buildAutoPlanSchedule({
        planningDate: "2026-09-03",
        startTime: "08:00",
        endTime: "12:00",
        blockMinutes: 30,
        bufferMinutes: 0,
        candidates: [duplicate, { ...duplicate, title: "Duplicate" }],
        busyWindows: [],
      }),
    ).toThrow("candidates must have unique ids");
  });
});
