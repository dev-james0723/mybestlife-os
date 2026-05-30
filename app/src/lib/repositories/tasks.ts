import { createClient } from "@/lib/supabase/client";
import type {
  CalendarProvider,
  Json,
  Task,
  TaskSubtask,
} from "@/types/database";

const TASK_SELECT = "*, project:projects(id, name, status, priority)";

export type CreateTaskInput = {
  title: string;
  description?: string;
  project_id?: string | null;
  status?: Task["status"];
  priority?: Task["priority"];
  due_date?: string | null;
  estimated_blocks?: number | null;
  tags?: string[];
  source?: string;
  source_url?: string;
  reminder_date?: string | null;
  category?: string | null;
  ai_generated?: boolean;
  ai_metadata?: Json | null;
  sort_order?: number | null;
  scheduled_date?: string | null;
  calendar_event_id?: string | null;
  calendar_provider?: CalendarProvider | null;
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
      .select(TASK_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string): Promise<Task> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select(TASK_SELECT)
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
      .select(TASK_SELECT)
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
      .select(TASK_SELECT)
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

// ---------------------------------------------------------------------------
// Subtasks (lightweight checklist rows in `task_subtasks`)
// ---------------------------------------------------------------------------

export type CreateSubtaskInput = {
  task_id: string;
  title: string;
  sort_order?: number;
};

export type UpdateSubtaskInput = {
  title?: string;
  is_done?: boolean;
  sort_order?: number;
};

export const taskSubtasksRepository = {
  async listByTask(taskId: string): Promise<TaskSubtask[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("task_subtasks")
      .select("*")
      .eq("task_id", taskId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CreateSubtaskInput): Promise<TaskSubtask> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("task_subtasks")
      .insert({
        task_id: input.task_id,
        title: input.title,
        sort_order: input.sort_order ?? 0,
        user_id: userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async createMany(
    taskId: string,
    titles: string[],
    startOrder = 0,
  ): Promise<TaskSubtask[]> {
    const clean = titles.map((t) => t.trim()).filter(Boolean);
    if (clean.length === 0) return [];
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const rows = clean.map((title, i) => ({
      task_id: taskId,
      title,
      sort_order: startOrder + i,
      user_id: userId,
    }));
    const { data, error } = await supabase
      .from("task_subtasks")
      .insert(rows)
      .select("*");
    if (error) throw error;
    return data ?? [];
  },

  async update(id: string, input: UpdateSubtaskInput): Promise<TaskSubtask> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("task_subtasks")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("task_subtasks").delete().eq("id", id);
    if (error) throw error;
  },
};
