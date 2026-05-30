"use client";

import { AlertCircle, CheckCircle, Folder, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils/date";
import { toTaskViewModel } from "@/lib/tasks/task-view-model";
import { taskPriorityLabel, taskStatusLabel } from "@/lib/i18n/tasks-ui";
import { taskCategoryLabel } from "@/lib/i18n/tasks-center-ui";
import {
  TaskLinkIndicators,
  buildTaskIndicatorFlags,
} from "./task-link-indicators";
import type { TaskViewCommonProps } from "./task-card-view";

export function TaskGridView({
  tasks,
  copy,
  centerCopy,
  now,
  onOpenTask,
  onToggleComplete,
  getLinkFlags,
}: TaskViewCommonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => {
        const vm = toTaskViewModel(task, now);
        const flags = buildTaskIndicatorFlags(task, vm, getLinkFlags?.(task.id));
        return (
          <Card
            key={task.id}
            className="group cursor-pointer transition-all hover:shadow-md"
            onClick={() => onOpenTask(task)}
          >
            <CardContent className="flex h-full flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-medium">{task.title}</h3>
                {task.status !== "done" && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    aria-label={copy.completeTaskAria}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
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
                  <Badge variant="outline" className="text-[11px]">
                    {taskCategoryLabel(centerCopy, vm.category)}
                  </Badge>
                )}
                {vm.isAiGenerated && (
                  <Badge variant="secondary" className="gap-1 text-[11px]">
                    <Sparkles className="h-3 w-3" />
                    {centerCopy.aiBadge}
                  </Badge>
                )}
              </div>

              <div className="mt-auto space-y-1.5">
                {vm.hasProject ? (
                  <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                    <Folder className="h-3 w-3 shrink-0" />
                    <span className="truncate">{task.project?.name}</span>
                  </span>
                ) : (
                  <span className="text-[11px] italic text-muted-foreground/70">
                    {centerCopy.noProjectLinked}
                  </span>
                )}
                <div className="flex items-center justify-between gap-2">
                  {task.due_date ? (
                    <span
                      className={cn(
                        "flex items-center gap-1 text-xs text-muted-foreground",
                        vm.isOverdue && "font-medium text-destructive",
                      )}
                    >
                      {vm.isOverdue && <AlertCircle className="h-3 w-3" />}
                      {formatDateShort(task.due_date)}
                    </span>
                  ) : (
                    <span />
                  )}
                  <TaskLinkIndicators flags={{ ...flags, project: false }} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
