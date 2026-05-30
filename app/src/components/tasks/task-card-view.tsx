"use client";

import { AlertCircle, CheckCircle, Folder, Sparkles } from "lucide-react";
import { EntityCard } from "@/components/shared/entity-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils/date";
import type { Task } from "@/types/database";
import type { TaskLinkFlags } from "@/lib/tasks/task-filters";
import { toTaskViewModel } from "@/lib/tasks/task-view-model";
import {
  taskPriorityLabel,
  taskStatusLabel,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import {
  TaskLinkIndicators,
  buildTaskIndicatorFlags,
} from "./task-link-indicators";

export interface TaskViewCommonProps {
  tasks: Task[];
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  now: Date;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  getLinkFlags?: (taskId: string) => TaskLinkFlags | undefined;
}

function TagRow({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  const shown = tags.slice(0, 4);
  const extra = tags.length - shown.length;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {shown.map((tag) => (
        <span
          key={tag}
          className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
        >
          #{tag}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[11px] text-muted-foreground/70">+{extra}</span>
      )}
    </div>
  );
}

export function TaskCardView({
  tasks,
  copy,
  centerCopy,
  now,
  onOpenTask,
  onToggleComplete,
  getLinkFlags,
}: TaskViewCommonProps) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const vm = toTaskViewModel(task, now);
        const flags = buildTaskIndicatorFlags(task, vm, getLinkFlags?.(task.id));
        return (
          <EntityCard
            key={task.id}
            title={task.title}
            onClick={() => onOpenTask(task)}
            badges={
              <>
                <StatusBadge
                  variant="status"
                  value={task.status}
                  label={taskStatusLabel(copy, task.status)}
                />
                <StatusBadge
                  variant="priority"
                  value={task.priority}
                  label={taskPriorityLabel(copy, task.priority)}
                />
                {vm.category && (
                  <Badge variant="outline" className="text-xs">
                    {taskCategoryLabel(centerCopy, vm.category)}
                  </Badge>
                )}
                {vm.isAiGenerated && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    {centerCopy.aiBadge}
                  </Badge>
                )}
              </>
            }
            meta={
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {task.due_date && (
                  <span
                    className={cn(
                      "flex items-center gap-1",
                      vm.isOverdue && "font-medium text-destructive",
                    )}
                  >
                    {vm.isOverdue && <AlertCircle className="h-3 w-3" />}
                    {formatDateShort(task.due_date)}
                  </span>
                )}
                <span>
                  {centerCopy.createdLabel} {formatDateShort(task.created_at)}
                </span>
              </div>
            }
            actions={
              task.status !== "done" ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onToggleComplete(task)}
                  aria-label={copy.completeTaskAria}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              ) : undefined
            }
          >
            <div className="flex items-center justify-between gap-2">
              {vm.hasProject ? (
                <span className="flex min-w-0 items-center gap-1 truncate text-sm text-muted-foreground">
                  <Folder className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{task.project?.name}</span>
                </span>
              ) : (
                <span className="text-xs italic text-muted-foreground/70">
                  {centerCopy.noProjectLinked}
                </span>
              )}
              <TaskLinkIndicators flags={{ ...flags, project: false }} />
            </div>
            <TagRow tags={task.tags} />
          </EntityCard>
        );
      })}
    </div>
  );
}
