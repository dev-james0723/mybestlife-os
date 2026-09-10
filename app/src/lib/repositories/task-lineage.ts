import { createClient } from "@/lib/supabase/client";
import { taskDerivationSchema, type TaskDerivationCommand, type TaskLineage } from "@/lib/tasks/task-lineage";
import { z } from "zod";

const resultSchema = z.object({ task_ids: z.array(z.string().uuid()).min(1).max(5), replayed: z.boolean() });

export const taskLineageRepository = {
  async get(taskId: string, account: string): Promise<TaskLineage | null> {
    const { data, error } = await createClient().from("task_lineage")
      .select("task_id,user_id,outcome_id,parent_task_id,relation")
      .eq("task_id", taskId).eq("user_id", account).maybeSingle();
    if (error) throw error;
    return data as TaskLineage | null;
  },
  async derive(command: TaskDerivationCommand) {
    const input = taskDerivationSchema.parse(command);
    const supabase = createClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (auth.user?.id !== input.account) throw new Error("Task account changed");
    const { data, error } = await supabase.rpc("task_derive", {
      p_account: input.account, p_command_id: input.command_id, p_source_id: input.source_id,
      p_relation: input.relation, p_titles: input.titles,
    });
    if (error) throw error;
    return resultSchema.parse(data);
  },
};
