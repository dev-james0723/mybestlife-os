/**
 * Source mapper: Goal rows → CalendarMilestone.
 *
 * Only goals with a target_date are projected onto the calendar; undated
 * goals remain invisible to the time axis by design.
 *
 * TODO: replace with real Supabase query — shape:
 *   SELECT id, name, target_date, category FROM goals
 *   WHERE user_id = auth.uid() AND target_date IS NOT NULL
 */

import type { Goal } from "@/types/database";
import type { CalendarMilestone } from "../types";

export function mapGoalRowToMilestone(g: Goal): CalendarMilestone | null {
  if (!g.target_date) return null;
  return {
    id: g.id,
    title: g.name,
    target_date: g.target_date.slice(0, 10),
    category: g.category,
  };
}

export function mapGoalRowsToMilestones(rows: readonly Goal[]): CalendarMilestone[] {
  const out: CalendarMilestone[] = [];
  for (const g of rows) {
    const m = mapGoalRowToMilestone(g);
    if (m) out.push(m);
  }
  return out;
}
