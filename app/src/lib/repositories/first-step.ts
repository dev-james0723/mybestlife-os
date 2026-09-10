import { createClient } from "@/lib/supabase/client";
import { coerceFreePlanTasks } from "@/lib/normalize-plan-tasks";

export type FirstStep = { id: string; title: string; minutes: number; date: string };

/** Each retry uses the same task and planner-row ids, including after a reload. */
export async function saveFirstStep(input: FirstStep) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Sign in to save your plan.");
  const { error: taskError } = await supabase.from("tasks").upsert({
    id: input.id, user_id: user.id, title: input.title.trim(), status: "todo", priority: "medium", due_date: input.date, source: "first-step",
  }, { onConflict: "id", ignoreDuplicates: true });
  if (taskError) throw taskError;
  const { data: task, error: readError } = await supabase.from("tasks").select("id,title").eq("id", input.id).eq("user_id", user.id).single();
  if (readError) throw readError;

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: plan, error } = await supabase.from("daily_plans").select("id,free_tasks,updated_at").eq("user_id", user.id).eq("plan_date", input.date).maybeSingle();
    if (error) throw error;
    const entries = coerceFreePlanTasks(plan?.free_tasks);
    if (entries.some((entry) => entry.taskId === task.id)) return task;
    const freeTasks = [...entries, { id: input.id, taskId: task.id, title: task.title, priority: "must" as const, order: entries.length, estimatedMinutes: input.minutes }];
    if (plan) {
      const { data: updated, error: updateError } = await supabase.from("daily_plans").update({ free_tasks: freeTasks, updated_at: new Date().toISOString() }).eq("id", plan.id).eq("user_id", user.id).eq("updated_at", plan.updated_at).select("id").maybeSingle();
      if (updateError) throw updateError;
      if (updated) return task;
    } else {
      const { error: insertError } = await supabase.from("daily_plans").insert({ user_id: user.id, plan_date: input.date, start_time: "09:00", end_time: "19:00", mode: "free", tasks: [], free_tasks: freeTasks });
      if (!insertError) return task;
      if (insertError.code !== "23505") throw insertError;
    }
  }
  throw new Error("Your task is saved, but the plan changed while saving. Retry to add the same task.");
}
