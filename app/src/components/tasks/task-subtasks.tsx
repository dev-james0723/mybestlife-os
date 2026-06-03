"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { OSIconControl } from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import {
  useCreateSubtask,
  useDeleteSubtask,
  useTaskSubtasks,
  useUpdateSubtask,
} from "@/hooks/use-task-subtasks";

interface TaskSubtasksProps {
  taskId: string;
  copy: TasksCenterUiCopy;
}

export function TaskSubtasks({ taskId, copy }: TaskSubtasksProps) {
  const { data: subtasks, isLoading } = useTaskSubtasks(taskId);
  const createSubtask = useCreateSubtask(taskId);
  const updateSubtask = useUpdateSubtask(taskId);
  const deleteSubtask = useDeleteSubtask(taskId);

  const [draft, setDraft] = useState("");

  const items = subtasks ?? [];
  const done = items.filter((s) => s.is_done).length;
  const total = items.length;

  const handleAdd = () => {
    const title = draft.trim();
    if (!title) return;
    createSubtask.mutate({
      task_id: taskId,
      title,
      sort_order: total,
    });
    setDraft("");
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          {copy.detailSubtasksTitle}
        </p>
        {total > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {copy.subtaskProgress(done, total)}
          </span>
        )}
      </div>

      {total > 0 && (
        <Progress value={total > 0 ? (done / total) * 100 : 0} className="h-1.5" />
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        </div>
      ) : (
        <ul className="space-y-1">
          {items.map((subtask) => (
            <li
              key={subtask.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
            >
              <Checkbox
                checked={subtask.is_done}
                onCheckedChange={(v) =>
                  updateSubtask.mutate({
                    id: subtask.id,
                    input: { is_done: v === true },
                  })
                }
                aria-label={subtask.title}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  subtask.is_done && "text-muted-foreground line-through",
                )}
              >
                {subtask.title}
              </span>
              <button
                type="button"
                onClick={() => deleteSubtask.mutate(subtask.id)}
                aria-label={copy.deleteSubtaskAria}
                className="flex size-11 items-center justify-center rounded-xl text-muted-foreground/60 opacity-0 transition-opacity hover:bg-muted/60 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
          {total === 0 && (
            <li className="px-1 py-1 text-xs italic text-muted-foreground/70">
              {copy.noSubtasks}
            </li>
          )}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={copy.addSubtaskPlaceholder}
          className="h-11 min-h-11 rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <OSIconControl
          variant="outline"
          onClick={handleAdd}
          disabled={!draft.trim() || createSubtask.isPending}
          aria-label={copy.addSubtaskAction}
        >
          <Plus className="h-4 w-4" />
        </OSIconControl>
      </div>
    </div>
  );
}
