"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { FreePlanTask } from "@/types/database";

const PRIORITIES: ReadonlyArray<FreePlanTask["priority"]> = [
  "must",
  "should",
  "could",
  "done",
];

function priorityLabel(copy: DailyPlannerUiCopy, p: FreePlanTask["priority"]): string {
  switch (p) {
    case "must":
      return copy.freePriorityMust;
    case "should":
      return copy.freePriorityShould;
    case "could":
      return copy.freePriorityCould;
    case "done":
      return copy.freePriorityDone;
  }
}

export interface FreePlanTaskDetailSheetProps {
  copy: DailyPlannerUiCopy;
  task: FreePlanTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedTask: FreePlanTask) => void;
  onDelete: (taskId: string) => void;
}

export function FreePlanTaskDetailSheet({
  copy,
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: FreePlanTaskDetailSheetProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<FreePlanTask["priority"]>("should");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setNotes(task.notes ?? "");
    setPriority(task.priority);
    setEstimatedMinutes(
      task.estimatedMinutes != null && task.estimatedMinutes > 0
        ? String(task.estimatedMinutes)
        : "",
    );
  }, [task]);

  const titleTrimmed = title.trim();
  const canSave = Boolean(titleTrimmed);

  const handleSave = useCallback(() => {
    if (!task || !titleTrimmed) return;
    const estRaw = estimatedMinutes.trim();
    const estParsed = estRaw ? Math.max(1, Math.floor(Number(estRaw))) : undefined;
    const est =
      estParsed != null && Number.isFinite(estParsed) && estParsed > 0
        ? estParsed
        : undefined;
    onSave({
      ...task,
      title: titleTrimmed,
      notes: notes.trim() || undefined,
      priority,
      estimatedMinutes: est,
    });
  }, [task, titleTrimmed, notes, priority, estimatedMinutes, onSave]);

  const handleToggleDone = useCallback(() => {
    setPriority((p) => (p === "done" ? "should" : "done"));
  }, []);

  const doneToggleLabel = useMemo(() => {
    if (priority === "done") {
      return copy.freeMoveTaskToBucket(copy.freePriorityShould);
    }
    return copy.freePriorityDone;
  }, [priority, copy]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom-card"
        className={cn(
          "flex flex-col gap-0 p-0 sm:max-w-3xl",
          "max-h-[88vh] overflow-hidden",
        )}
      >
        {task ? (
          <>
            <SheetHeader className="shrink-0 border-b border-border/50 px-4 pt-4 pb-3 sm:px-6">
              <SheetTitle>{copy.freeTaskDetailsTitle}</SheetTitle>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="free-task-detail-title">{copy.freeTaskTitleLabel}</Label>
                  <Input
                    id="free-task-detail-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={copy.freeQuickCapturePlaceholder}
                    aria-invalid={!canSave}
                  />
                  {!canSave ? (
                    <p className="text-[12px] text-destructive" role="alert">
                      {copy.freeTaskTitleRequired}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free-task-detail-notes">{copy.freeTaskNotesLabel}</Label>
                  <Textarea
                    id="free-task-detail-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={copy.freeTaskNotesPlaceholder}
                    rows={4}
                    className="min-h-[6rem] resize-y"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="free-task-detail-priority">
                      {copy.freeTaskPriorityLabel}
                    </Label>
                    <Select
                      value={priority}
                      onValueChange={(v) => {
                        if (v != null) setPriority(v as FreePlanTask["priority"]);
                      }}
                    >
                      <SelectTrigger id="free-task-detail-priority" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {priorityLabel(copy, p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="free-task-detail-estimate">
                      {copy.detailEstimatedPrefix}
                    </Label>
                    <Input
                      id="free-task-detail-estimate"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      placeholder="30"
                      className="tabular-nums"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={handleToggleDone}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {doneToggleLabel}
                </Button>
              </div>
            </div>

            <SheetFooter className="shrink-0 flex-row flex-wrap gap-2 border-t border-border/50 bg-popover/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
              <Button
                type="button"
                variant="destructive"
                className="order-3 sm:order-1 sm:mr-auto"
                onClick={() => onDelete(task.id)}
              >
                {copy.freeTaskDelete}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="order-1 flex-1 sm:order-2 sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                {copy.freeTaskCancel}
              </Button>
              <Button
                type="button"
                className="order-2 flex-1 sm:order-3 sm:flex-none"
                disabled={!canSave}
                onClick={handleSave}
              >
                {copy.freeTaskSaveChanges}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
