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
import type { Task } from "@/types/database";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import type { TaskLinkFlags } from "@/lib/tasks/task-filters";
import { toTaskViewModel } from "@/lib/tasks/task-view-model";
import {
  buildTaskIndicatorFlags,
  type TaskLinkIndicatorFlags,
} from "./task-link-indicators";

interface TaskLinkedEntitiesProps {
  task: Task;
  copy: TasksCenterUiCopy;
  now: Date;
  linkFlags?: TaskLinkFlags;
}

type Entry = {
  key: keyof TaskLinkIndicatorFlags;
  icon: LucideIcon;
  label: (copy: TasksCenterUiCopy) => string;
};

const ENTRIES: Entry[] = [
  { key: "project", icon: Folder, label: (c) => c.linkedHasProject },
  { key: "goal", icon: Target, label: (c) => c.linkedGoal },
  { key: "habit", icon: Repeat, label: (c) => c.linkedHabit },
  { key: "planner", icon: CalendarDays, label: (c) => c.linkedPlanner },
  { key: "calendar", icon: Calendar, label: (c) => c.linkedCalendar },
  { key: "knowledge", icon: BookOpen, label: (c) => c.linkedKnowledge },
  { key: "idea", icon: Lightbulb, label: (c) => c.linkedIdea },
  { key: "scheduled", icon: Clock, label: (c) => c.scheduledLabel },
  { key: "ai", icon: Sparkles, label: (c) => c.linkedAi },
];

/** Read-only summary of every Life OS system a task is connected to. */
export function TaskLinkedEntities({
  task,
  copy,
  now,
  linkFlags,
}: TaskLinkedEntitiesProps) {
  const vm = toTaskViewModel(task, now);
  const flags = buildTaskIndicatorFlags(task, vm, linkFlags);
  const active = ENTRIES.filter((e) => flags[e.key]);

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-muted-foreground">
        {copy.detailLinkedTitle}
      </p>
      {active.length === 0 ? (
        <p className="text-xs italic text-muted-foreground/60">
          {copy.noProjectLinked}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {active.map(({ key, icon: Icon, label }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
            >
              <Icon
                className={cnIcon(key)}
              />
              {label(copy)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function cnIcon(key: keyof TaskLinkIndicatorFlags): string {
  return key === "ai" ? "h-3.5 w-3.5 text-primary" : "h-3.5 w-3.5 text-muted-foreground";
}
