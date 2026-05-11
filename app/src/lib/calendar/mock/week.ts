/**
 * Mock source data for a sample week centered on "today".
 *
 * Everything is anchored to `new Date()` at module import so the
 * Calendar always has a realistic "today" to render against during
 * development. Real Supabase sources swap in during Phase 5.
 */

import { addDays, format, subDays } from "date-fns";
import type {
  CalendarHabitOccurrence,
  CalendarMilestone,
  CalendarReminder,
  CalendarTask,
} from "../types";

function iso(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function isoAt(d: Date, hhmm: string): string {
  return `${iso(d)}T${hhmm}:00.000Z`;
}

function buildMockTasks(today: Date): CalendarTask[] {
  return [
    {
      id: "t-overdue-1",
      title: "Review quarterly OKRs",
      due_date: iso(subDays(today, 2)),
      status: "todo",
      priority: "high",
      estimated_blocks: 6,
      project_id: "p-company",
      project_name: "Company",
      tags: ["strategy"],
    },
    {
      id: "t-today-focus",
      title: "Deep work — design doc for onboarding",
      due_date: iso(today),
      status: "in-progress",
      priority: "urgent",
      estimated_blocks: 12,
      project_id: "p-growth",
      project_name: "Growth",
      tags: ["focus"],
    },
    {
      id: "t-today-small",
      title: "Send invoice to Acme",
      due_date: iso(today),
      status: "todo",
      priority: "medium",
      estimated_blocks: 1,
      project_id: null,
      project_name: null,
      tags: ["finance"],
    },
    {
      id: "t-today-reply",
      title: "Reply to Mark about roadmap",
      due_date: iso(today),
      status: "todo",
      priority: "low",
      estimated_blocks: 1,
      project_id: null,
      project_name: null,
      tags: [],
    },
    {
      id: "t-tomorrow-1",
      title: "Prep slides for team review",
      due_date: iso(addDays(today, 1)),
      status: "todo",
      priority: "high",
      estimated_blocks: 6,
      project_id: "p-growth",
      project_name: "Growth",
      tags: ["focus"],
    },
    {
      id: "t-d2-1",
      title: "1:1 with Dana",
      due_date: iso(addDays(today, 2)),
      status: "todo",
      priority: "medium",
      estimated_blocks: 3,
      project_id: null,
      project_name: null,
      tags: ["people"],
    },
    {
      id: "t-d3-1",
      title: "Pay rent",
      due_date: iso(addDays(today, 3)),
      status: "todo",
      priority: "urgent",
      estimated_blocks: 1,
      project_id: null,
      project_name: null,
      tags: ["finance"],
    },
    {
      id: "t-d4-1",
      title: "Run end-of-week retro",
      due_date: iso(addDays(today, 4)),
      status: "todo",
      priority: "medium",
      estimated_blocks: 3,
      project_id: null,
      project_name: null,
      tags: [],
    },
    {
      id: "t-d5-1",
      title: "Long-form essay draft",
      due_date: iso(addDays(today, 5)),
      status: "todo",
      priority: "high",
      estimated_blocks: 9,
      project_id: "p-writing",
      project_name: "Writing",
      tags: ["focus"],
    },
  ];
}

function buildMockHabits(today: Date): CalendarHabitOccurrence[] {
  const occurrences: CalendarHabitOccurrence[] = [];
  for (let i = -1; i <= 5; i++) {
    const d = iso(addDays(today, i));
    occurrences.push(
      {
        id: `h-morning-${d}`,
        habit_id: "h-morning-routine",
        date: d,
        name: "Morning routine",
        time_of_day: "morning",
        color: "#f59e0b",
        icon: null,
        completed: i < 0,
      },
      {
        id: `h-read-${d}`,
        habit_id: "h-read",
        date: d,
        name: "Read 20 pages",
        time_of_day: "evening",
        color: "#8b5cf6",
        icon: null,
        completed: i < 0,
      }
    );
    if (i % 2 === 0) {
      occurrences.push({
        id: `h-workout-${d}`,
        habit_id: "h-workout",
        date: d,
        name: "Workout",
        time_of_day: "afternoon",
        color: "#0ea5e9",
        icon: null,
        completed: i < 0,
      });
    }
  }
  return occurrences;
}

function buildMockMilestones(today: Date): CalendarMilestone[] {
  return [
    {
      id: "m-1",
      title: "Launch v2 beta",
      target_date: iso(addDays(today, 3)),
      category: "Product",
    },
    {
      id: "m-2",
      title: "Finish first marathon",
      target_date: iso(addDays(today, 6)),
      category: "Health",
    },
  ];
}

function buildMockReminders(today: Date): CalendarReminder[] {
  return [
    {
      id: "r-1",
      title: "Call dentist",
      remind_at: isoAt(today, "10:30"),
      source_task_id: null,
    },
    {
      id: "r-2",
      title: "Water the plants",
      remind_at: isoAt(addDays(today, 1), "08:00"),
      source_task_id: null,
    },
  ];
}

export function buildMockSources(today: Date = new Date()) {
  return {
    tasks: buildMockTasks(today),
    habitOccurrences: buildMockHabits(today),
    milestones: buildMockMilestones(today),
    reminders: buildMockReminders(today),
  };
}
