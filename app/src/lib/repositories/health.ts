import { createClient } from "@/lib/supabase/client";
import type { DailyCheckIn, ExerciseLog, NutritionLog, SleepLog } from "@/types/database";

export type CreateSleepLogInput = {
  log_date: string;
  bed_time?: string | null;
  wake_time?: string | null;
  duration_hours?: number | null;
  quality?: number | null;
  notes?: string | null;
};

export type CreateExerciseLogInput = {
  log_date: string;
  exercise_type: string;
  duration_minutes?: number | null;
  intensity?: ExerciseLog["intensity"];
  notes?: string | null;
};

export type CreateNutritionLogInput = {
  log_date: string;
  meal_type: string;
  description?: string | null;
  calories?: number | null;
  notes?: string | null;
};

export type CreateDailyCheckInInput = {
  check_date: string;
  mood?: number | null;
  energy?: number | null;
  notes?: string | null;
};

export const sleepLogsRepository = {
  async getAll(): Promise<SleepLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sleep_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateSleepLogInput): Promise<SleepLog> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sleep_logs")
      .insert({
        log_date: input.log_date,
        bed_time: input.bed_time ?? null,
        wake_time: input.wake_time ?? null,
        duration_hours: input.duration_hours ?? null,
        quality: input.quality ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("sleep_logs").delete().eq("id", id);
    if (error) throw error;
  },
};

export const exerciseLogsRepository = {
  async getAll(): Promise<ExerciseLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercise_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateExerciseLogInput): Promise<ExerciseLog> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("exercise_logs")
      .insert({
        log_date: input.log_date,
        exercise_type: input.exercise_type,
        duration_minutes: input.duration_minutes ?? null,
        intensity: input.intensity ?? "medium",
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("exercise_logs").delete().eq("id", id);
    if (error) throw error;
  },
};

export const nutritionLogsRepository = {
  async getAll(): Promise<NutritionLog[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("nutrition_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateNutritionLogInput): Promise<NutritionLog> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("nutrition_logs")
      .insert({
        log_date: input.log_date,
        meal_type: input.meal_type,
        description: input.description ?? null,
        calories: input.calories ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
    if (error) throw error;
  },
};

export const dailyCheckInsRepository = {
  async getAll(): Promise<DailyCheckIn[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_check_ins")
      .select("*")
      .order("check_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateDailyCheckInInput): Promise<DailyCheckIn> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("daily_check_ins")
      .insert({
        check_date: input.check_date,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("daily_check_ins").delete().eq("id", id);
    if (error) throw error;
  },
};
