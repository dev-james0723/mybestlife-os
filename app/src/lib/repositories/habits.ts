import { createClient } from "@/lib/supabase/client";
import type {
  Habit,
  HabitCompletion,
  HabitFrequency,
  HabitLink,
  HabitLinkKind,
  HabitType,
  StreakFreeze,
  Tag,
  TimeOfDay,
} from "@/lib/habits/types";

// ============================================================
// Input shapes
// ============================================================

export type CreateHabitInput = {
  name: string;
  description?: string | null;
  type?: HabitType;
  target_value?: number | null;
  frequency?: HabitFrequency;
  time_of_day?: TimeOfDay;
  color?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateHabitInput = Partial<CreateHabitInput> & {
  archived_at?: string | null;
};

export type CreateCompletionInput = {
  habit_id: string;
  completion_date: string;
  status?: "done" | "skipped";
  value?: number | null;
  note?: string | null;
};

export type UpdateCompletionInput = Partial<
  Pick<CreateCompletionInput, "status" | "value" | "note">
>;

export type CreateFreezeInput = {
  habit_id: string;
  freeze_date: string;
  reason?: string | null;
};

export type CreateTagInput = {
  name: string;
  color?: string | null;
};

export type CreateHabitLinkInput = {
  habit_id: string;
  target_kind: HabitLinkKind;
  target_id: string;
};

// ============================================================
// Row narrowing — JSONB frequency needs validation before we return it.
// ============================================================

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

// ============================================================
// habitsRepository
// ============================================================

export const habitsRepository = {
  async getAll(): Promise<Habit[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => narrowHabit(row as HabitRow));
  },

  async getById(id: string): Promise<Habit> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return narrowHabit(data as HabitRow);
  },

  async create(input: CreateHabitInput): Promise<Habit> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habits")
      .insert({
        name: input.name,
        description: input.description ?? null,
        type: input.type ?? "checkbox",
        target_value: input.target_value ?? null,
        frequency: input.frequency ?? { kind: "daily" },
        time_of_day: input.time_of_day ?? "anytime",
        color: input.color ?? null,
        icon: input.icon ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return narrowHabit(data as HabitRow);
  },

  async update(id: string, input: UpdateHabitInput): Promise<Habit> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habits")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return narrowHabit(data as HabitRow);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// habitCompletionsRepository
// ============================================================

export const habitCompletionsRepository = {
  async getByHabitId(
    habitId: string,
    opts?: { from?: string; to?: string; limit?: number },
  ): Promise<HabitCompletion[]> {
    const supabase = createClient();
    let query = supabase
      .from("habit_completions")
      .select("*")
      .eq("habit_id", habitId)
      .order("completion_date", { ascending: false });
    if (opts?.from) query = query.gte("completion_date", opts.from);
    if (opts?.to) query = query.lte("completion_date", opts.to);
    if (opts?.limit) query = query.limit(opts.limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as HabitCompletion[];
  },

  async getForUser(opts?: {
    from?: string;
    to?: string;
  }): Promise<HabitCompletion[]> {
    const supabase = createClient();
    let query = supabase
      .from("habit_completions")
      .select("*")
      .order("completion_date", { ascending: false });
    if (opts?.from) query = query.gte("completion_date", opts.from);
    if (opts?.to) query = query.lte("completion_date", opts.to);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as HabitCompletion[];
  },

  /**
   * Idempotent check-off: if a completion for (habit_id, completion_date)
   * exists, update it; else insert. Used by the Today view.
   */
  async upsert(input: CreateCompletionInput): Promise<HabitCompletion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_completions")
      .upsert(
        {
          habit_id: input.habit_id,
          completion_date: input.completion_date,
          status: input.status ?? "done",
          value: input.value ?? null,
          note: input.note ?? null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "habit_id,completion_date" },
      )
      .select()
      .single();
    if (error) throw error;
    return data as HabitCompletion;
  },

  async update(
    id: string,
    input: UpdateCompletionInput,
  ): Promise<HabitCompletion> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_completions")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as HabitCompletion;
  },

  async deleteForDate(habitId: string, date: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_id", habitId)
      .eq("completion_date", date);
    if (error) throw error;
  },
};

// ============================================================
// streakFreezesRepository
// ============================================================

export const streakFreezesRepository = {
  /** All freezes for the current user in a calendar range (RLS-scoped). */
  async getForUserInRange(opts: {
    from: string;
    to: string;
  }): Promise<StreakFreeze[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("streak_freezes")
      .select("*")
      .gte("freeze_date", opts.from)
      .lte("freeze_date", opts.to)
      .order("freeze_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as StreakFreeze[];
  },

  async getByHabitId(habitId: string): Promise<StreakFreeze[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("streak_freezes")
      .select("*")
      .eq("habit_id", habitId)
      .order("freeze_date", { ascending: false });
    if (error) throw error;
    return (data ?? []) as StreakFreeze[];
  },

  async create(input: CreateFreezeInput): Promise<StreakFreeze> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("streak_freezes")
      .insert({
        habit_id: input.habit_id,
        freeze_date: input.freeze_date,
        reason: input.reason ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as StreakFreeze;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("streak_freezes")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// tagsRepository + habitTagsRepository
// ============================================================

export const tagsRepository = {
  async getAll(): Promise<Tag[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Tag[];
  },

  async create(input: CreateTagInput): Promise<Tag> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tags")
      .insert({ name: input.name, color: input.color ?? null })
      .select()
      .single();
    if (error) throw error;
    return data as Tag;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) throw error;
  },
};

export const habitTagsRepository = {
  async setForHabit(habitId: string, tagIds: readonly string[]): Promise<void> {
    const supabase = createClient();
    // Simple atomic-ish: delete then insert.
    const { error: delError } = await supabase
      .from("habit_tags")
      .delete()
      .eq("habit_id", habitId);
    if (delError) throw delError;

    if (tagIds.length === 0) return;

    const { error: insError } = await supabase
      .from("habit_tags")
      .insert(tagIds.map((tag_id) => ({ habit_id: habitId, tag_id })));
    if (insError) throw insError;
  },
};

// ============================================================
// habitLinksRepository
// ============================================================

export const habitLinksRepository = {
  async getByHabitId(habitId: string): Promise<HabitLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_links")
      .select("*")
      .eq("habit_id", habitId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as HabitLink[];
  },

  /**
   * List every habit link for the current user. Used by the Brain graph to
   * derive habit → goal / project / task / knowledge edges in a single
   * round-trip. RLS scopes to `auth.uid()` automatically.
   */
  async list(): Promise<HabitLink[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_links")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as HabitLink[];
  },

  async create(input: CreateHabitLinkInput): Promise<HabitLink> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_links")
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as HabitLink;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("habit_links").delete().eq("id", id);
    if (error) throw error;
  },
};
