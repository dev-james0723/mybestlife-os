import type { Habit, HabitCompletion } from "./types";

export function isSuccessfulCompletion(
  habit: Pick<Habit, "type" | "target_value">,
  c: HabitCompletion | undefined,
): boolean {
  if (!c || c.status === "skipped") return false;
  if (habit.type === "checkbox" || habit.type === "negative") {
    return c.status === "done";
  }
  if (habit.type === "counter") {
    const target = habit.target_value ?? 1;
    return c.status === "done" && (c.value ?? 0) >= target;
  }
  if (habit.type === "duration") {
    const target = habit.target_value ?? 1;
    return c.status === "done" && (c.value ?? 0) >= target;
  }
  return false;
}

/** 0..1 for heatmap intensity (skipped → 0). */
export function completionIntensity(
  habit: Pick<Habit, "type" | "target_value">,
  c: HabitCompletion | undefined,
): number {
  if (!c || c.status === "skipped") return 0;
  if (habit.type === "checkbox" || habit.type === "negative") {
    return c.status === "done" ? 1 : 0;
  }
  if (habit.type === "counter") {
    const target = habit.target_value ?? 1;
    const v = c.value ?? 0;
    if (target <= 0) return c.status === "done" ? 1 : 0;
    return Math.max(0, Math.min(1, v / target));
  }
  if (habit.type === "duration") {
    const target = habit.target_value ?? 1;
    const v = c.value ?? 0;
    if (target <= 0) return 0;
    return Math.max(0, Math.min(1, v / target));
  }
  return 0;
}
