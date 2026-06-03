"use client";

import { useMemo } from "react";
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, GripVertical, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/utils/date";
import type { Task } from "@/types/database";
import {
  groupTasks,
  NO_PROJECT_GROUP,
  UNCATEGORIZED_GROUP,
  type TaskGroup,
  type TaskGroupBy,
} from "@/lib/tasks/task-grouping";
import { toTaskViewModel } from "@/lib/tasks/task-view-model";
import {
  taskPriorityLabel,
  taskStatusLabel,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  deadlineColumnLabel,
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import type { TaskLinkFlags } from "@/lib/tasks/task-filters";
import {
  TaskLinkIndicators,
  buildTaskIndicatorFlags,
} from "./task-link-indicators";

const COLUMN_PREFIX = "column:";

export const BOARD_GROUP_OPTIONS: TaskGroupBy[] = [
  "status",
  "priority",
  "project",
  "category",
  "deadline",
];

interface TaskBoardViewProps {
  tasks: Task[];
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  now: Date;
  groupBy: TaskGroupBy;
  onGroupByChange: (groupBy: TaskGroupBy) => void;
  onOpenTask: (task: Task) => void;
  /** Move a task into a different lane; parent maps key -> field patch. */
  onMoveTask: (taskId: string, targetKey: string) => void;
  getLinkFlags?: (taskId: string) => TaskLinkFlags | undefined;
}

function groupByLabel(
  groupBy: TaskGroupBy,
  copy: TasksUiCopy,
  centerCopy: TasksCenterUiCopy,
): string {
  switch (groupBy) {
    case "status":
      return copy.filterStatus;
    case "priority":
      return copy.filterPriority;
    case "project":
      return centerCopy.quickFilterProject;
    case "category":
      return centerCopy.filterCategory;
    case "deadline":
      return centerCopy.filterDeadline;
  }
}

function columnLabel(
  group: TaskGroup,
  groupBy: TaskGroupBy,
  copy: TasksUiCopy,
  centerCopy: TasksCenterUiCopy,
): string {
  switch (groupBy) {
    case "status":
      return taskStatusLabel(copy, group.key as Task["status"]);
    case "priority":
      return taskPriorityLabel(copy, group.key as Task["priority"]);
    case "deadline":
      return deadlineColumnLabel(centerCopy, group.key);
    case "project":
      return group.key === NO_PROJECT_GROUP
        ? centerCopy.groupNoProject
        : group.label || group.key;
    case "category":
      return group.key === UNCATEGORIZED_GROUP
        ? centerCopy.groupUncategorized
        : taskCategoryLabel(centerCopy, group.key);
  }
}

export function TaskBoardView({
  tasks,
  copy,
  centerCopy,
  now,
  groupBy,
  onGroupByChange,
  onOpenTask,
  onMoveTask,
  getLinkFlags,
}: TaskBoardViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columns = useMemo(
    () => groupTasks(tasks, groupBy, { now, includeEmpty: true }),
    [tasks, groupBy, now],
  );

  const groupByOptions = BOARD_GROUP_OPTIONS.map((value) => ({
    value,
    label: groupByLabel(value, copy, centerCopy),
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    let targetKey: string | null = null;
    if (overId.startsWith(COLUMN_PREFIX)) {
      targetKey = overId.slice(COLUMN_PREFIX.length);
    } else {
      // Dropped onto a card — adopt that card's column.
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        const overColumn = columns.find((c) =>
          c.tasks.some((t) => t.id === overId),
        );
        targetKey = overColumn?.key ?? null;
      }
    }
    if (targetKey === null) return;

    const sourceColumn = columns.find((c) => c.tasks.some((t) => t.id === taskId));
    if (sourceColumn && sourceColumn.key === targetKey) return;

    onMoveTask(taskId, targetKey);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{centerCopy.groupBy}</span>
        <Select
          value={groupBy}
          onValueChange={(v) => {
            if (v !== null) onGroupByChange(v as TaskGroupBy);
          }}
          itemToStringLabel={(v) =>
            groupByOptions.find((o) => o.value === v)?.label ?? String(v)
          }
        >
          <SelectTrigger className="h-11 min-h-11 w-[150px] rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {groupByOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:snap-none">
          {columns.map((col) => (
            <BoardColumn
              key={col.key}
              column={col}
              label={columnLabel(col, groupBy, copy, centerCopy)}
              copy={copy}
              centerCopy={centerCopy}
              now={now}
              onOpenTask={onOpenTask}
              getLinkFlags={getLinkFlags}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function BoardColumn({
  column,
  label,
  copy,
  centerCopy,
  now,
  onOpenTask,
  getLinkFlags,
}: {
  column: TaskGroup;
  label: string;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  now: Date;
  onOpenTask: (task: Task) => void;
  getLinkFlags?: (taskId: string) => TaskLinkFlags | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${COLUMN_PREFIX}${column.key}` });

  return (
    <div className="flex min-w-[280px] max-w-[320px] shrink-0 snap-center flex-col rounded-xl bg-muted/30 sm:min-w-[300px]">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium">{label}</h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs tabular-nums">
            {column.tasks.length}
          </Badge>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-1 flex-col rounded-lg transition-colors min-h-[120px]",
          isOver && "bg-primary/5 ring-1 ring-primary/20",
        )}
      >
        <SortableContext
          id={column.key}
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            {column.tasks.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground/60">
                {centerCopy.boardEmptyColumn}
              </p>
            ) : (
              column.tasks.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  copy={copy}
                  centerCopy={centerCopy}
                  now={now}
                  onSelect={() => onOpenTask(task)}
                  getLinkFlags={getLinkFlags}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function BoardCard({
  task,
  copy,
  centerCopy,
  now,
  onSelect,
  getLinkFlags,
}: {
  task: Task;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  now: Date;
  onSelect: () => void;
  getLinkFlags?: (taskId: string) => TaskLinkFlags | undefined;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const vm = toTaskViewModel(task, now);
  const flags = buildTaskIndicatorFlags(task, vm, getLinkFlags?.(task.id));

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isDragging && "opacity-50 shadow-lg",
          vm.isOverdue && "border-l-2 border-l-destructive",
        )}
        onClick={onSelect}
      >
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 text-sm font-medium leading-snug">
              {task.title}
            </h4>
            <div
              {...listeners}
              className="-mr-2 flex size-11 cursor-grab touch-manipulation items-center justify-center rounded-xl text-muted-foreground/70 hover:bg-muted/60"
              onClick={(e) => e.stopPropagation()}
              aria-label={centerCopy.dragHandleAria}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
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

          {(task.due_date || vm.hasProject) && (
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              {vm.hasProject ? (
                <span className="truncate">{task.project?.name}</span>
              ) : (
                <span />
              )}
              {task.due_date && (
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1",
                    vm.isOverdue && "font-medium text-destructive",
                  )}
                >
                  {vm.isOverdue && <AlertCircle className="h-3 w-3" />}
                  {formatDateShort(task.due_date)}
                </span>
              )}
            </div>
          )}

          <TaskLinkIndicators flags={{ ...flags, project: false }} />
        </CardContent>
      </Card>
    </div>
  );
}
