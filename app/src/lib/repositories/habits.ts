import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUserId } from "@/lib/grateful-things/repository-core";
import type {
  Habit,
  HabitCompletion,
  HabitFrequency,
  HabitReflection,
  HabitReflectionMood,
  HabitLink,
  HabitLinkKind,
  HabitType,
  HabitVisual,
  StreakFreeze,
  Tag,
  TimerSession,
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

export type UpsertHabitVisualInput = {
  habit_id?: string | null;
  routine_id?: string | null;
  kind: "habit" | "routine";
  visual_prompt: string;
  image_url: string;
  storage_path?: string | null;
  model_used?: string | null;
  source_hash?: string | null;
};

export type CreateTimerSessionInput = {
  habit_id?: string | null;
  routine_id?: string | null;
  routine_step_id?: string | null;
  target_duration_seconds: number;
};

export type CreateHabitReflectionInput = {
  habit_id?: string | null;
  routine_id?: string | null;
  timer_session_id?: string | null;
  reflection_date: string;
  mood?: HabitReflectionMood | null;
  note?: string | null;
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
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("habits")
      .insert({
        user_id: userId,
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
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("habit_completions")
      .upsert(
        {
          user_id: userId,
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
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("streak_freezes")
      .insert({
        user_id: userId,
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
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: userId, name: input.name, color: input.color ?? null })
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
    const userId = await requireAuthenticatedUserId(supabase);
    // Simple atomic-ish: delete then insert.
    const { error: delError } = await supabase
      .from("habit_tags")
      .delete()
      .eq("habit_id", habitId);
    if (delError) throw delError;

    if (tagIds.length === 0) return;

    const { error: insError } = await supabase
      .from("habit_tags")
      .insert(tagIds.map((tag_id) => ({ habit_id: habitId, tag_id, user_id: userId })));
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
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("habit_links")
      .insert({ ...input, user_id: userId })
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

// ============================================================
// habitVisualsRepository
// ============================================================

export const habitVisualsRepository = {
  async list(): Promise<HabitVisual[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_visuals")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as HabitVisual[];
  },

  async getForHabits(habitIds: readonly string[]): Promise<HabitVisual[]> {
    if (habitIds.length === 0) return [];
    const supabase = createClient();
    const { data, error } = await supabase
      .from("habit_visuals")
      .select("*")
      .eq("kind", "habit")
      .in("habit_id", [...habitIds]);
    if (error) throw error;
    return (data ?? []) as HabitVisual[];
  },

  async upsert(input: UpsertHabitVisualInput): Promise<HabitVisual> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);

    const existingQuery =
      input.kind === "habit" && input.habit_id
        ? supabase
            .from("habit_visuals")
            .select("id")
            .eq("user_id", userId)
            .eq("kind", "habit")
            .eq("habit_id", input.habit_id)
            .maybeSingle()
        : input.kind === "routine" && input.routine_id
          ? supabase
              .from("habit_visuals")
              .select("id")
              .eq("user_id", userId)
              .eq("kind", "routine")
              .eq("routine_id", input.routine_id)
              .maybeSingle()
          : null;

    const payload = {
      user_id: userId,
      habit_id: input.habit_id ?? null,
      routine_id: input.routine_id ?? null,
      kind: input.kind,
      visual_prompt: input.visual_prompt,
      image_url: input.image_url,
      storage_path: input.storage_path ?? null,
      model_used: input.model_used ?? null,
      source_hash: input.source_hash ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existingQuery) {
      const { data: existing, error: readError } = await existingQuery;
      if (readError) throw readError;
      if (existing?.id) {
        const { data, error } = await supabase
          .from("habit_visuals")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as HabitVisual;
      }
    }

    const { data, error } = await supabase
      .from("habit_visuals")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as HabitVisual;
  },
};

// ============================================================
// timerSessionsRepository
// ============================================================

function secondsBetween(olderIso: string, newerIso: string): number {
  const older = new Date(olderIso).getTime();
  const newer = new Date(newerIso).getTime();
  if (!Number.isFinite(older) || !Number.isFinite(newer)) return 0;
  return Math.max(0, Math.floor((newer - older) / 1000));
}

export const timerSessionsRepository = {
  async getActive(): Promise<TimerSession | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("timer_sessions")
      .select("*")
      .in("status", ["running", "paused"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as TimerSession | null) ?? null;
  },

  async create(input: CreateTimerSessionInput): Promise<TimerSession> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const now = new Date().toISOString();

    const { error: cancelError } = await supabase
      .from("timer_sessions")
      .update({
        status: "cancelled",
        completed_at: now,
        updated_at: now,
      })
      .eq("user_id", userId)
      .in("status", ["running", "paused"]);
    if (cancelError) throw cancelError;

    const { data, error } = await supabase
      .from("timer_sessions")
      .insert({
        user_id: userId,
        habit_id: input.habit_id ?? null,
        routine_id: input.routine_id ?? null,
        routine_step_id: input.routine_step_id ?? null,
        started_at: now,
        target_duration_seconds: Math.max(
          1,
          Math.round(input.target_duration_seconds),
        ),
        total_paused_seconds: 0,
        status: "running",
      })
      .select()
      .single();
    if (error) throw error;
    return data as TimerSession;
  },

  async pause(id: string): Promise<TimerSession> {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("timer_sessions")
      .update({ status: "paused", paused_at: now, updated_at: now })
      .eq("id", id)
      .eq("status", "running")
      .select()
      .single();
    if (error) throw error;
    return data as TimerSession;
  },

  async resume(id: string): Promise<TimerSession> {
    const supabase = createClient();
    const { data: current, error: readError } = await supabase
      .from("timer_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (readError) throw readError;
    const session = current as TimerSession;
    const now = new Date().toISOString();
    const pausedDelta = session.paused_at
      ? secondsBetween(session.paused_at, now)
      : 0;
    const { data, error } = await supabase
      .from("timer_sessions")
      .update({
        status: "running",
        paused_at: null,
        total_paused_seconds: session.total_paused_seconds + pausedDelta,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TimerSession;
  },

  async complete(id: string): Promise<TimerSession> {
    const supabase = createClient();
    const { data: current, error: readError } = await supabase
      .from("timer_sessions")
      .select("*")
      .eq("id", id)
      .single();
    if (readError) throw readError;
    const session = current as TimerSession;
    const now = new Date().toISOString();
    const pausedDelta =
      session.status === "paused" && session.paused_at
        ? secondsBetween(session.paused_at, now)
        : 0;
    const { data, error } = await supabase
      .from("timer_sessions")
      .update({
        status: "completed",
        paused_at: null,
        total_paused_seconds: session.total_paused_seconds + pausedDelta,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TimerSession;
  },

  async cancel(id: string): Promise<TimerSession> {
    const supabase = createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("timer_sessions")
      .update({
        status: "cancelled",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TimerSession;
  },
};

// ============================================================
// habitReflectionsRepository
// ============================================================

export const habitReflectionsRepository = {
  async create(input: CreateHabitReflectionInput): Promise<HabitReflection> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("habit_reflections")
      .insert({
        user_id: userId,
        habit_id: input.habit_id ?? null,
        routine_id: input.routine_id ?? null,
        timer_session_id: input.timer_session_id ?? null,
        reflection_date: input.reflection_date,
        mood: input.mood ?? null,
        note: input.note ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as HabitReflection;
  },
};
