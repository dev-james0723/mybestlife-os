"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ListTree, Flag, CalendarClock, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import { postTaskAi, type TaskAiSource } from "@/lib/ai/task-ai";
import { useCreateSubtasksBulk } from "@/hooks/use-task-subtasks";

type ActionKind = "breakdown" | "prioritize" | "schedule";

interface TaskAiActionsProps {
  task: Task;
  locale: AppLocale;
  copy: TasksCenterUiCopy;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}

/** Per-task AI helpers in the detail panel: breakdown / prioritize / schedule. */
export function TaskAiActions({ task, locale, copy, onUpdate }: TaskAiActionsProps) {
  const [busy, setBusy] = useState<ActionKind | null>(null);
  const [note, setNote] = useState<{ text: string; source: TaskAiSource } | null>(
    null,
  );
  const createSubtasks = useCreateSubtasksBulk(task.id);

  const run = async (kind: ActionKind) => {
    if (busy) return;
    setBusy(kind);
    setNote(null);
    try {
      if (kind === "breakdown") {
        const res = await postTaskAi("breakdown", {
          locale,
          title: task.title,
          description: task.description ?? undefined,
        });
        if (res.subtasks.length > 0) {
          await createSubtasks.mutateAsync(res.subtasks);
          toast.success(copy.aiToastSubtasksAdded);
          setNote({ text: res.summary || copy.aiToastSubtasksAdded, source: res.source });
        } else {
          toast.message(copy.aiToastNoChange);
        }
      } else if (kind === "prioritize") {
        const res = await postTaskAi("prioritize", { locale, taskIds: [task.id] });
        const item = res.items.find((i) => i.id === task.id) ?? res.items[0];
        if (item && item.priority !== task.priority) {
          onUpdate(task.id, { priority: item.priority });
          toast.success(copy.aiToastPriorityUpdated);
          setNote({ text: item.reason || copy.aiToastPriorityUpdated, source: res.source });
        } else {
          toast.message(copy.aiToastNoChange);
          if (item?.reason) setNote({ text: item.reason, source: res.source });
        }
      } else {
        const res = await postTaskAi("schedule", { locale, taskIds: [task.id] });
        const item = res.items.find((i) => i.id === task.id) ?? res.items[0];
        if (item?.scheduledDate) {
          const patch: Record<string, unknown> = { scheduled_date: item.scheduledDate };
          if (item.dueDate) patch.due_date = item.dueDate;
          onUpdate(task.id, patch);
          toast.success(copy.aiToastScheduleUpdated);
          setNote({ text: item.reason || copy.aiToastScheduleUpdated, source: res.source });
        } else {
          toast.message(copy.aiToastNoChange);
        }
      }
    } catch {
      toast.error(copy.aiToastFailed);
    } finally {
      setBusy(null);
    }
  };

  const Action = ({
    kind,
    icon: Icon,
    label,
  }: {
    kind: ActionKind;
    icon: typeof ListTree;
    label: string;
  }) => (
    <Button
      variant="outline"
      size="sm"
      disabled={busy !== null}
      onClick={() => run(kind)}
    >
      {busy === kind ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {copy.aiAssistHeading}
      </p>
      <div className="flex flex-wrap gap-2">
        <Action kind="breakdown" icon={ListTree} label={copy.aiBreakdown} />
        <Action kind="prioritize" icon={Flag} label={copy.aiPrioritize} />
        <Action kind="schedule" icon={CalendarClock} label={copy.aiSchedule} />
      </div>
      {note && (
        <p className="flex items-start gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5 text-xs text-foreground/80">
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {note.source === "gemini" ? copy.aiSourceAi : copy.aiSourceHeuristic}
          </Badge>
          <span>{note.text}</span>
        </p>
      )}
    </div>
  );
}
