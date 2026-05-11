import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Habit,
  HabitCompletion,
  HabitFrequency,
  StreakFreeze,
} from "@/lib/habits/types";

function coerceFrequency(value: unknown): HabitFrequency {
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const kind = obj.kind;
    if (kind === "daily") return { kind: "daily" };
    if (kind === "weekly_count" && typeof obj.count === "number") {
      return { kind: "weekly_count", count: obj.count };
    }
    if (kind === "weekdays" && Array.isArray(obj.days)) {
      const days = obj.days.filter(
        (d): d is 0 | 1 | 2 | 3 | 4 | 5 | 6 =>
          typeof d === "number" && d >= 0 && d <= 6,
      );
      return { kind: "weekdays", days };
    }
    if (kind === "every_n_days" && typeof obj.n === "number") {
      return { kind: "every_n_days", n: obj.n };
    }
  }
  return { kind: "daily" };
}

type HabitRow = Omit<Habit, "frequency"> & { frequency: unknown };

function narrowHabit(row: HabitRow): Habit {
  return { ...row, frequency: coerceFrequency(row.frequency) };
}

export type UserHabitDataSnapshot = {
  habits: Habit[];
  completions: HabitCompletion[];
  freezes: StreakFreeze[];
};

/**
 * Loads habits plus completions and streak freezes in a date window for
 * server-side habit AI routes (RLS applies via the user's Supabase client).
 */
export async function loadUserHabitDataSnapshot(
  supabase: SupabaseClient,
  params: { completionFrom: string; completionTo: string },
): Promise<UserHabitDataSnapshot> {
  const [{ data: habitRows, error: hErr }, { data: compRows, error: cErr }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase
        .from("habit_completions")
        .select("*")
        .gte("completion_date", params.completionFrom)
        .lte("completion_date", params.completionTo)
        .order("completion_date", { ascending: true }),
    ]);

  if (hErr) throw hErr;
  if (cErr) throw cErr;

  const habits = (habitRows ?? []).map((row) =>
    narrowHabit(row as HabitRow),
  );
  const habitIds = habits.map((h) => h.id);

  let freezes: StreakFreeze[] = [];
  if (habitIds.length > 0) {
    const { data: fRows, error: fErr } = await supabase
      .from("streak_freezes")
      .select("*")
      .in("habit_id", habitIds)
      .gte("freeze_date", params.completionFrom)
      .lte("freeze_date", params.completionTo)
      .order("freeze_date", { ascending: true });
    if (fErr) throw fErr;
    freezes = (fRows ?? []) as StreakFreeze[];
  }

  return {
    habits,
    completions: (compRows ?? []) as HabitCompletion[],
    freezes,
  };
}
