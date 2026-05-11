import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/types/database";

export type CreateTaskInput = {
  title: string;
  description?: string;
  project_id?: string;
  status?: Task["status"];
  priority?: Task["priority"];
  due_date?: string;
  estimated_blocks?: number;
  tags?: string[];
  source?: string;
  source_url?: string;
};

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  completed_at?: string | null;
};

async function getCurrentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("You must be signed in to create tasks.");
  }

  return data.user.id;
}

export const tasksRepository = {
  async getAll(): Promise<Task[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, project:projects(id, name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Task> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, project:projects(id, name)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(input: CreateTaskInput): Promise<Task> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        ...input,
        user_id: userId,
        status: input.status ?? "todo",
        priority: input.priority ?? "medium",
        tags: input.tags ?? [],
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },
};
