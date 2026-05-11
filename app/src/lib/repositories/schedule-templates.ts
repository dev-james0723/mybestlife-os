import { createClient } from "@/lib/supabase/client";
import { coerceDailyPlanTasks } from "@/lib/normalize-plan-tasks";
import type { DailyPlanTask, ScheduleTemplate } from "@/types/database";

export type CreateScheduleTemplateInput = {
  name: string;
  tasks: DailyPlanTask[];
};

async function getCurrentUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("You must be signed in to save templates.");
  }

  return data.user.id;
}

function withNormalizedTasks(row: ScheduleTemplate): ScheduleTemplate {
  return { ...row, tasks: coerceDailyPlanTasks(row.tasks) };
}

export const scheduleTemplatesRepository = {
  async getAll(): Promise<ScheduleTemplate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("schedule_templates")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return ((data ?? []) as ScheduleTemplate[]).map(withNormalizedTasks);
  },

  async create(input: CreateScheduleTemplateInput): Promise<ScheduleTemplate> {
    const supabase = createClient();
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("schedule_templates")
      .insert({
        ...input,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return withNormalizedTasks(data as ScheduleTemplate);
  },

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.from("schedule_templates").delete().eq("id", id);
    if (error) throw error;
  },
};
