import type { Task } from "@/types/database";

/** Tasks created via planner AI or project AI flows */
export function isTaskAiGenerated(task: Pick<Task, "source" | "tags">): boolean {
  if (task.source?.toLowerCase().startsWith("ai:")) return true;
  return Boolean(task.tags?.includes("ai-generated"));
}
