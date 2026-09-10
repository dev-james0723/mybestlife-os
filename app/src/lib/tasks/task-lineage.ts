import { z } from "zod";

export const taskDerivationSchema = z.object({
  version: z.literal(1),
  account: z.string().uuid(),
  command_id: z.string().uuid(),
  source_id: z.string().uuid(),
  relation: z.enum(["split", "copy", "recreate", "next_step"]),
  titles: z.array(z.string().trim().min(1).max(180)).min(1).max(5),
}).strict().refine((value) => value.relation === "split" ? value.titles.length >= 2 : value.titles.length === 1);

export type TaskDerivationCommand = z.infer<typeof taskDerivationSchema>;
export type TaskLineage = {
  task_id: string;
  user_id: string;
  outcome_id: string;
  parent_task_id: string | null;
  relation: "original" | TaskDerivationCommand["relation"];
};

export function taskDerivationStorageKey(account: string, sourceId: string) {
  return `mybestlife:task-derivation:v1:${account}:${sourceId}`;
}

/** A retry keeps its captured account, titles and relationship, even after reload. */
export function readTaskDerivation(raw: string | null, account: string, sourceId: string) {
  if (!raw) return null;
  const value = taskDerivationSchema.parse(JSON.parse(raw));
  if (value.account !== account || value.source_id !== sourceId) throw new Error("Task draft account changed");
  return value;
}
