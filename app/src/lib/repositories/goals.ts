import { createClient } from "@/lib/supabase/client";
import type { Goal, KeyResult } from "@/types/database";

export type CreateGoalInput = {
  name: string;
  description?: string;
  status?: Goal["status"];
  target_date?: string;
  category?: string;
};

export type UpdateGoalInput = Partial<CreateGoalInput>;

export type CreateKeyResultInput = {
  goal_id: string;
  name: string;
  target_value?: number;
  unit?: string;
};

export type UpdateKeyResultInput = Partial<Omit<CreateKeyResultInput, "goal_id">> & {
  current_value?: number;
};

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated");
  return user.id;
}

export const goalsRepository = {
  async getAll(): Promise<Goal[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateGoalInput): Promise<Goal> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goals")
      .insert({ ...input, user_id: userId, status: input.status ?? "active" })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateGoalInput): Promise<Goal> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("goals")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) throw error;
  },
};

export const keyResultsRepository = {
  async getByGoalId(goalId: string): Promise<KeyResult[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("key_results")
      .select("*")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateKeyResultInput): Promise<KeyResult> {
    const userId = await requireUserId();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("key_results")
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateKeyResultInput): Promise<KeyResult> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("key_results")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("key_results").delete().eq("id", id);
    if (error) throw error;
  },
};
