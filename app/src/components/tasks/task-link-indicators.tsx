"use client";

import {
  BookOpen,
  Calendar,
  CalendarDays,
  Clock,
  Folder,
  Lightbulb,
  Repeat,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/database";
import type { TaskLinkFlags } from "@/lib/tasks/task-filters";
import type { TaskViewModel } from "@/lib/tasks/task-view-model";

export type TaskLinkIndicatorFlags = {
  project?: boolean;
  goal?: boolean;
  habit?: boolean;
  planner?: boolean;
  calendar?: boolean;
  knowledge?: boolean;
  idea?: boolean;
  scheduled?: boolean;
  ai?: boolean;
};

type IndicatorDef = { key: keyof TaskLinkIndicatorFlags; icon: LucideIcon; label: string };

const INDICATORS: IndicatorDef[] = [
  { key: "project", icon: Folder, label: "Project" },
  { key: "goal", icon: Target, label: "Goal" },
  { key: "habit", icon: Repeat, label: "Habit / Routine" },
  { key: "planner", icon: CalendarDays, label: "Daily Planner" },
  { key: "calendar", icon: Calendar, label: "Calendar" },
  { key: "knowledge", icon: BookOpen, label: "Knowledge" },
  { key: "idea", icon: Lightbulb, label: "Idea" },
  { key: "scheduled", icon: Clock, label: "Scheduled" },
  { key: "ai", icon: Sparkles, label: "AI-generated" },
];

interface TaskLinkIndicatorsProps {
  flags: TaskLinkIndicatorFlags;
  className?: string;
  iconClassName?: string;
}

/** Compact row of small icons showing which Life OS systems a task links to. */
export function TaskLinkIndicators({
  flags,
  className,
  iconClassName,
}: TaskLinkIndicatorsProps) {
  const active = INDICATORS.filter((def) => flags[def.key]);
  if (active.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
      {active.map(({ key, icon: Icon, label }) => (
        <span key={key} title={label} aria-label={label} className="inline-flex">
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              key === "ai" && "text-primary",
              iconClassName,
            )}
          />
        </span>
      ))}
    </div>
  );
}

/** Merge derived (task columns + view model) and context (relations) link flags. */
export function buildTaskIndicatorFlags(
  task: Task,
  vm: TaskViewModel,
  ctx?: TaskLinkFlags,
): TaskLinkIndicatorFlags {
  return {
    project: vm.hasProject,
    ai: vm.isAiGenerated,
    scheduled: Boolean(task.scheduled_date),
    calendar: Boolean(task.calendar_event_id) || Boolean(ctx?.calendar),
    goal: ctx?.goal,
    habit: ctx?.habit,
    planner: ctx?.planner,
    knowledge: ctx?.knowledge,
    idea: ctx?.idea,
  };
}
