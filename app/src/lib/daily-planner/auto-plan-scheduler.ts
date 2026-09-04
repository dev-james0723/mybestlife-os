export type AutoPlanPriority = "must" | "should" | "could";

export type AutoPlanCandidateTask = {
  id: string;
  title: string;
  durationMinutes: number;
  priority: AutoPlanPriority;
  order: number;
  taskId?: string;
};

/** Local wall-clock ISO minutes in the planner timezone: `YYYY-MM-DDTHH:mm`. */
export type AutoPlanBusyWindow = {
  start: string;
  end: string;
};

/** An already placed task whose wall-clock slot must not move. */
export type AutoPlanLockedTask = {
  id: string;
  title: string;
  start: string;
  end: string;
  taskId?: string;
};

export type BuildAutoPlanScheduleInput = {
  planningDate: string;
  startTime: string;
  endTime: string;
  blockMinutes: number;
  bufferMinutes: number;
  candidates: AutoPlanCandidateTask[];
  busyWindows: AutoPlanBusyWindow[];
  lockedTasks?: AutoPlanLockedTask[];
};

export type AutoPlanScheduledTask = {
  id: string;
  title: string;
  taskId?: string;
  priority?: AutoPlanPriority;
  order?: number;
  requestedDurationMinutes?: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  startDayOffset: number;
  endDayOffset: number;
  locked: boolean;
};

export type AutoPlanUnscheduledReason = "insufficient-contiguous-time";

export type AutoPlanUnscheduledTask = AutoPlanCandidateTask & {
  reason: AutoPlanUnscheduledReason;
};

export type AutoPlanSchedule = {
  scheduledTasks: AutoPlanScheduledTask[];
  unscheduledTasks: AutoPlanUnscheduledTask[];
  availableMinutes: number;
  plannedMinutes: number;
  reservedBufferMinutes: number;
  remainingMinutes: number;
};

const PRIORITY_RANK: Record<AutoPlanPriority, number> = {
  must: 0,
  should: 1,
  could: 2,
};

function parseClock(value: string, label = "time"): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new RangeError(`${label} must use HH:mm`);
  return Number(match[1]) * 60 + Number(match[2]);
}

type MinuteInterval = {
  start: number;
  end: number;
};

function dateOrdinal(value: string, label = "date"): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`${label} must use YYYY-MM-DD`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new RangeError(`${label} must be a valid calendar date`);
  }
  return Math.floor(timestamp / 86_400_000);
}

function parseLocalDateTime(
  value: string,
  planningDate: string,
  label: string,
): number {
  const match = /^(\d{4}-\d{2}-\d{2})T([0-2]\d:[0-5]\d)$/.exec(value);
  if (!match || Number(match[2].slice(0, 2)) > 23) {
    throw new RangeError(`${label} must use YYYY-MM-DDTHH:mm`);
  }
  return (
    (dateOrdinal(match[1], label) - dateOrdinal(planningDate, "planningDate")) *
      1440 +
    parseClock(match[2], label)
  );
}

function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  const sorted = [...intervals].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  );
  const merged: MinuteInterval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

function clampIntervals(
  intervals: MinuteInterval[],
  rangeStart: number,
  rangeEnd: number,
): MinuteInterval[] {
  return intervals
    .map(({ start, end }) => ({
      start: Math.max(start, rangeStart),
      end: Math.min(end, rangeEnd),
    }))
    .filter(({ start, end }) => end > start);
}

function measureIntervals(intervals: MinuteInterval[]): number {
  return mergeIntervals(intervals).reduce(
    (total, interval) => total + interval.end - interval.start,
    0,
  );
}

function alignToBlockGrid(
  minute: number,
  planStart: number,
  blockMinutes: number,
): number {
  return (
    planStart + Math.ceil((minute - planStart) / blockMinutes) * blockMinutes
  );
}

function findEarliestStart(
  occupied: MinuteInterval[],
  durationMinutes: number,
  planStart: number,
  planEnd: number,
  blockMinutes: number,
): number | undefined {
  let cursor = planStart;
  for (const interval of occupied) {
    const candidateStart = alignToBlockGrid(cursor, planStart, blockMinutes);
    if (candidateStart + durationMinutes <= interval.start) return candidateStart;
    cursor = Math.max(cursor, interval.end);
  }
  const candidateStart = alignToBlockGrid(cursor, planStart, blockMinutes);
  return candidateStart + durationMinutes <= planEnd ? candidateStart : undefined;
}

function toWallClock(totalMinutes: number): {
  time: string;
  dayOffset: number;
} {
  const dayOffset = Math.floor(totalMinutes / 1440);
  const minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return {
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    dayOffset,
  };
}

function assertUniqueIds(
  items: Array<{ id: string }>,
  label: "candidates" | "lockedTasks",
): void {
  if (new Set(items.map(({ id }) => id)).size !== items.length) {
    throw new RangeError(`${label} must have unique ids`);
  }
}

export function buildAutoPlanSchedule(
  input: BuildAutoPlanScheduleInput,
): AutoPlanSchedule {
  if (!Number.isInteger(input.blockMinutes) || input.blockMinutes <= 0) {
    throw new RangeError("blockMinutes must be a positive integer");
  }
  if (!Number.isInteger(input.bufferMinutes) || input.bufferMinutes < 0) {
    throw new RangeError("bufferMinutes must be a non-negative integer");
  }
  input.candidates.forEach((candidate, index) => {
    if (
      !Number.isInteger(candidate.durationMinutes) ||
      candidate.durationMinutes <= 0
    ) {
      throw new RangeError(
        `candidates[${index}].durationMinutes must be a positive integer`,
      );
    }
  });
  assertUniqueIds(input.candidates, "candidates");
  assertUniqueIds(input.lockedTasks ?? [], "lockedTasks");
  dateOrdinal(input.planningDate, "planningDate");
  const startMinute = parseClock(input.startTime, "startTime");
  let endMinute = parseClock(input.endTime, "endTime");
  if (endMinute <= startMinute) endMinute += 1440;

  const ranked = [...input.candidates].sort(
    (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      a.order - b.order ||
      a.id.localeCompare(b.id),
  );
  const candidateById = new Map(
    input.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const parsedBusy = input.busyWindows.map(({ start, end }, index) => {
    const interval = {
      start: parseLocalDateTime(
        start,
        input.planningDate,
        `busyWindows[${index}].start`,
      ),
      end: parseLocalDateTime(
        end,
        input.planningDate,
        `busyWindows[${index}].end`,
      ),
    };
    if (interval.end <= interval.start) {
      throw new RangeError(`busyWindows[${index}].end must be after start`);
    }
    return interval;
  });
  const mergedBusy = mergeIntervals(
    clampIntervals(parsedBusy, startMinute, endMinute),
  );
  const locked = (input.lockedTasks ?? []).map((task, index) => {
    const interval = {
      start: parseLocalDateTime(
        task.start,
        input.planningDate,
        `lockedTasks[${index}].start`,
      ),
      end: parseLocalDateTime(
        task.end,
        input.planningDate,
        `lockedTasks[${index}].end`,
      ),
    };
    if (interval.end <= interval.start) {
      throw new RangeError(`lockedTasks[${index}].end must be after start`);
    }
    if (interval.start < startMinute || interval.end > endMinute) {
      throw new RangeError(
        `lockedTasks[${index}] must be inside the planning window`,
      );
    }
    return { task, interval };
  });
  const lockedByTime = [...locked].sort(
    (a, b) => a.interval.start - b.interval.start,
  );
  for (let index = 1; index < lockedByTime.length; index += 1) {
    if (
      lockedByTime[index].interval.start <
      lockedByTime[index - 1].interval.end
    ) {
      throw new RangeError("lockedTasks must not overlap");
    }
  }
  const taskIntervals: MinuteInterval[] = locked.map(({ interval }) => interval);
  const bufferIntervals: MinuteInterval[] = locked.map(({ interval }) => ({
    start: interval.end,
    end: Math.min(interval.end + input.bufferMinutes, endMinute),
  }));
  let occupied = mergeIntervals([
    ...mergedBusy,
    ...locked.map(({ interval }) => ({
      start: interval.start,
      end: Math.min(interval.end + input.bufferMinutes, endMinute),
    })),
  ]);
  const scheduledTasks: AutoPlanScheduledTask[] = locked.map(
    ({ task, interval }) => {
      const candidate = candidateById.get(task.id);
      const start = toWallClock(interval.start);
      const end = toWallClock(interval.end);
      return {
        id: task.id,
        title: task.title,
        taskId: task.taskId ?? candidate?.taskId,
        priority: candidate?.priority,
        order: candidate?.order,
        requestedDurationMinutes: candidate?.durationMinutes,
        durationMinutes: interval.end - interval.start,
        startTime: start.time,
        endTime: end.time,
        startDayOffset: start.dayOffset,
        endDayOffset: end.dayOffset,
        locked: true,
      };
    },
  );
  const unscheduledTasks: AutoPlanUnscheduledTask[] = [];
  const lockedIds = new Set(locked.map(({ task }) => task.id));
  for (const task of ranked.filter(({ id }) => !lockedIds.has(id))) {
    const durationMinutes =
      Math.ceil(task.durationMinutes / input.blockMinutes) * input.blockMinutes;
    const taskStart = findEarliestStart(
      occupied,
      durationMinutes + input.bufferMinutes,
      startMinute,
      endMinute,
      input.blockMinutes,
    );
    if (taskStart === undefined) {
      unscheduledTasks.push({
        ...task,
        reason: "insufficient-contiguous-time",
      });
      continue;
    }
    const taskEnd = taskStart + durationMinutes;
    const start = toWallClock(taskStart);
    const end = toWallClock(taskEnd);
    scheduledTasks.push({
      ...task,
      requestedDurationMinutes: task.durationMinutes,
      durationMinutes,
      startTime: start.time,
      endTime: end.time,
      startDayOffset: start.dayOffset,
      endDayOffset: end.dayOffset,
      locked: false,
    });
    taskIntervals.push({ start: taskStart, end: taskEnd });
    bufferIntervals.push({
      start: taskEnd,
      end: taskEnd + input.bufferMinutes,
    });
    occupied = mergeIntervals([
      ...occupied,
      { start: taskStart, end: taskEnd + input.bufferMinutes },
    ]);
  }
  scheduledTasks.sort(
    (a, b) =>
      a.startDayOffset * 1440 + parseClock(a.startTime) -
        (b.startDayOffset * 1440 + parseClock(b.startTime)) ||
      a.id.localeCompare(b.id),
  );
  const plannedMinutes = scheduledTasks.reduce(
    (total, task) => total + task.durationMinutes,
    0,
  );
  const busyMinutes = mergedBusy.reduce(
    (total, interval) => total + interval.end - interval.start,
    0,
  );
  const availableMinutes = endMinute - startMinute - busyMinutes;
  const occupiedWithoutBuffers = clampIntervals(
    [...mergedBusy, ...taskIntervals],
    startMinute,
    endMinute,
  );
  const fullyOccupied = clampIntervals(
    [...occupiedWithoutBuffers, ...bufferIntervals],
    startMinute,
    endMinute,
  );
  const reservedBufferMinutes =
    measureIntervals(fullyOccupied) - measureIntervals(occupiedWithoutBuffers);

  return {
    scheduledTasks,
    unscheduledTasks,
    availableMinutes,
    plannedMinutes,
    reservedBufferMinutes,
    remainingMinutes: endMinute - startMinute - measureIntervals(fullyOccupied),
  };
}
