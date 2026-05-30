"use client";

import { useMemo } from "react";
import { CalendarPlus, Loader2, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils/date";
import type { Task } from "@/types/database";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";

export interface TaskConnectionsGoal {
  id: string;
  name: string;
}

interface TaskConnectionsProps {
  task: Task;
  goals: TaskConnectionsGoal[];
  linkedGoalIds: string[];
  onAddToPlan: () => void;
  addingToPlan?: boolean;
  onLinkGoal: (goalId: string) => void;
  onUnlinkGoal: (goalId: string) => void;
  copy: TasksCenterUiCopy;
}

/** Action block in the detail panel: schedule into today's plan + link goals. */
export function TaskConnections({
  task,
  goals,
  linkedGoalIds,
  onAddToPlan,
  addingToPlan,
  onLinkGoal,
  onUnlinkGoal,
  copy,
}: TaskConnectionsProps) {
  const goalName = useMemo(() => {
    const map = new Map(goals.map((g) => [g.id, g.name]));
    return (id: string) => map.get(id) ?? id;
  }, [goals]);

  const linkable = useMemo(
    () => goals.filter((g) => !linkedGoalIds.includes(g.id)),
    [goals, linkedGoalIds],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">
        {copy.connectionsTitle}
      </p>

      <div className="space-y-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={onAddToPlan}
          disabled={addingToPlan}
        >
          {addingToPlan ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarPlus className="h-4 w-4" />
          )}
          {copy.addToTodayPlan}
        </Button>
        {task.scheduled_date && (
          <p className="pl-1 text-xs text-muted-foreground">
            {copy.scheduledForLabel} · {formatDate(task.scheduled_date)}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Target className="h-3.5 w-3.5" />
          {copy.linkGoalLabel}
        </p>

        {linkedGoalIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkedGoalIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 py-1 pl-2.5 pr-1 text-xs"
              >
                {goalName(id)}
                <button
                  type="button"
                  onClick={() => onUnlinkGoal(id)}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`${copy.goalUnlinkedToast}: ${goalName(id)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {linkable.length > 0 ? (
          <Select value="" onValueChange={(v) => v && onLinkGoal(v)}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder={copy.linkGoalPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {linkable.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          linkedGoalIds.length === 0 && (
            <p className="text-xs italic text-muted-foreground/60">
              {copy.noGoalsAvailable}
            </p>
          )
        )}
      </div>
    </div>
  );
}
