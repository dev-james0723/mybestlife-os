import { createClient } from "@/lib/supabase/client";
import { requireAuthenticatedUserId } from "@/lib/grateful-things/repository-core";
import type {
  Routine,
  RoutineCompletion,
  RoutineStep,
  RoutineWithSteps,
  TimeOfDay,
} from "@/lib/habits/types";

// ============================================================
// Input shapes
// ============================================================

export type CreateRoutineInput = {
  name: string;
  description?: string | null;
  time_of_day?: TimeOfDay;
  color?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export type UpdateRoutineInput = Partial<CreateRoutineInput> & {
  archived_at?: string | null;
};

export type CreateRoutineStepInput = {
  routine_id: string;
  position: number;
  title: string;
  description?: string | null;
  duration_seconds?: number | null;
};

export type UpdateRoutineStepInput = Partial<
  Omit<CreateRoutineStepInput, "routine_id">
>;

export type CreateRoutineCompletionInput = {
  routine_id: string;
  completion_date: string;
  completed_step_ids?: string[];
};

// ============================================================
// routinesRepository
// ============================================================

export const routinesRepository = {
  async getAll(): Promise<Routine[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Routine[];
  },

  async getById(id: string): Promise<Routine> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Routine;
  },

  async getAllWithSteps(): Promise<RoutineWithSteps[]> {
    const supabase = createClient();
    const [{ data: routines, error: rErr }, { data: steps, error: sErr }] =
      await Promise.all([
        supabase
          .from("routines")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("routine_steps")
          .select("*")
          .order("position", { ascending: true }),
      ]);
    if (rErr) throw rErr;
    if (sErr) throw sErr;

    const stepsByRoutine = new Map<string, RoutineStep[]>();
    for (const s of (steps ?? []) as RoutineStep[]) {
      const list = stepsByRoutine.get(s.routine_id) ?? [];
      list.push(s);
      stepsByRoutine.set(s.routine_id, list);
    }

    return ((routines ?? []) as Routine[]).map((r) => ({
      ...r,
      steps: stepsByRoutine.get(r.id) ?? [],
    }));
  },

  async create(input: CreateRoutineInput): Promise<Routine> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("routines")
      .insert({
        user_id: userId,
        name: input.name,
        description: input.description ?? null,
        time_of_day: input.time_of_day ?? "anytime",
        color: input.color ?? null,
        icon: input.icon ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    return data as Routine;
  },

  async update(id: string, input: UpdateRoutineInput): Promise<Routine> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routines")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as Routine;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("routines").delete().eq("id", id);
    if (error) throw error;
  },
};

// ============================================================
// routineStepsRepository
// ============================================================

export const routineStepsRepository = {
  async getByRoutineId(routineId: string): Promise<RoutineStep[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routine_steps")
      .select("*")
      .eq("routine_id", routineId)
      .order("position", { ascending: true });
    if (error) throw error;
    return (data ?? []) as RoutineStep[];
  },

  async create(input: CreateRoutineStepInput): Promise<RoutineStep> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("routine_steps")
      .insert({
        user_id: userId,
        routine_id: input.routine_id,
        position: input.position,
        title: input.title,
        description: input.description ?? null,
        duration_seconds: input.duration_seconds ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as RoutineStep;
  },

  async update(
    id: string,
    input: UpdateRoutineStepInput,
  ): Promise<RoutineStep> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("routine_steps")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as RoutineStep;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("routine_steps")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  /**
   * Reorder is a batch update of (id → position) mappings. Used when the user
   * drags steps in the routine editor.
   */
  async reorder(
    updates: ReadonlyArray<{ id: string; position: number }>,
  ): Promise<void> {
    const supabase = createClient();
    // Supabase doesn't support multi-row updates with varying values in a single
    // round-trip, so we run the updates in parallel.
    const now = new Date().toISOString();
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from("routine_steps")
          .update({ position: u.position, updated_at: now })
          .eq("id", u.id),
      ),
    );
    for (const r of results) {
      if (r.error) throw r.error;
    }
  },
};

// ============================================================
// routineCompletionsRepository
// ============================================================

export const routineCompletionsRepository = {
  async getByRoutineId(
    routineId: string,
    opts?: { from?: string; to?: string; limit?: number },
  ): Promise<RoutineCompletion[]> {
    const supabase = createClient();
    let query = supabase
      .from("routine_completions")
      .select("*")
      .eq("routine_id", routineId)
      .order("completion_date", { ascending: false });
    if (opts?.from) query = query.gte("completion_date", opts.from);
    if (opts?.to) query = query.lte("completion_date", opts.to);
    if (opts?.limit) query = query.limit(opts.limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as RoutineCompletion[];
  },

  async upsert(
    input: CreateRoutineCompletionInput,
  ): Promise<RoutineCompletion> {
    const supabase = createClient();
    const userId = await requireAuthenticatedUserId(supabase);
    const { data, error } = await supabase
      .from("routine_completions")
      .upsert(
        {
          user_id: userId,
          routine_id: input.routine_id,
          completion_date: input.completion_date,
          completed_step_ids: input.completed_step_ids ?? [],
          completed_at: new Date().toISOString(),
        },
        { onConflict: "routine_id,completion_date" },
      )
      .select()
      .single();
    if (error) throw error;
    return data as RoutineCompletion;
  },

  async deleteForDate(routineId: string, date: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("routine_completions")
      .delete()
      .eq("routine_id", routineId)
      .eq("completion_date", date);
    if (error) throw error;
  },
};
