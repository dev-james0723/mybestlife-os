/**
 * Source mapper: Task rows → CalendarTask (shape consumed by projection).
 *
 * Phase 1 ships with a pure mapper. Phase 5 wires this into the
 * `useTasks()` query result so the calendar picks up live Supabase data.
 *
 * TODO: replace with real Supabase query — shape:
 *   SELECT id, title, due_date, status, priority, estimated_blocks,
 *          project_id, tags, projects(name)
 *   FROM tasks WHERE user_id = auth.uid()
 */

import type { CalendarTask } from "../types";
import type { Task } from "@/types/database";

export function mapTaskRowToCalendarTask(t: Task): CalendarTask {
  return {
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    status: t.status,
    priority: t.priority,
    estimated_blocks: t.estimated_blocks,
    project_id: t.project_id,
    project_name: t.project?.name ?? null,
    tags: t.tags ?? [],
  };
}

export function mapTaskRowsToCalendarTasks(rows: readonly Task[]): CalendarTask[] {
  return rows.map(mapTaskRowToCalendarTask);
}
