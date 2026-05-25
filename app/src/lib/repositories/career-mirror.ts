import { createClient } from "@/lib/supabase/client";
import type {
  CareerMemoryEntry,
  CareerPromptPack,
  CareerScenario,
  CareerWeeklyReview,
} from "@/types/database";

export type CreateScenarioInput = {
  title: string;
  inputs?: Record<string, unknown>;
  result?: Record<string, unknown> | null;
};

export const careerScenarioRepository = {
  async list(): Promise<CareerScenario[]> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from("career_scenarios")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerScenario[];
  },

  async create(input: CreateScenarioInput): Promise<CareerScenario> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("career_scenarios")
      .insert({
        user_id: user.id,
        title: input.title,
        inputs: input.inputs ?? {},
        result: input.result ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerScenario;
  },

  async remove(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("career_scenarios")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};

export type UpsertWeeklyReviewInput = {
  weekStart: string;
  review: Record<string, unknown>;
  modelUsed?: string | null;
};

export const careerWeeklyReviewRepository = {
  /** Returns null when no review exists for the given week. */
  async getByWeek(weekStart: string): Promise<CareerWeeklyReview | null> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return null;

    const { data, error } = await supabase
      .from("career_weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();
    if (error) throw error;
    return (data as CareerWeeklyReview | null) ?? null;
  },

  async upsert(input: UpsertWeeklyReviewInput): Promise<CareerWeeklyReview> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const payload = {
      user_id: user.id,
      week_start: input.weekStart,
      review: input.review,
      model_used: input.modelUsed ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("career_weekly_reviews")
      .upsert(payload, { onConflict: "user_id,week_start" })
      .select()
      .single();
    if (error) throw error;
    return data as CareerWeeklyReview;
  },
};

export type AppendMemoryInput = {
  kind: string;
  content?: Record<string, unknown>;
  source?: string | null;
};

export const careerMemoryRepository = {
  async list(): Promise<CareerMemoryEntry[]> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from("career_memory")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerMemoryEntry[];
  },

  async append(input: AppendMemoryInput): Promise<CareerMemoryEntry> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("career_memory")
      .insert({
        user_id: user.id,
        kind: input.kind,
        content: input.content ?? {},
        source: input.source ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerMemoryEntry;
  },
};

export type CreatePromptPackInput = {
  title?: string | null;
  prompts?: unknown[];
  generatedFor?: Record<string, unknown> | null;
};

export const careerPromptPackRepository = {
  async list(): Promise<CareerPromptPack[]> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return [];

    const { data, error } = await supabase
      .from("career_prompt_packs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CareerPromptPack[];
  },

  async create(input: CreatePromptPackInput): Promise<CareerPromptPack> {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("career_prompt_packs")
      .insert({
        user_id: user.id,
        title: input.title ?? null,
        prompts: input.prompts ?? [],
        generated_for: input.generatedFor ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CareerPromptPack;
  },
};
