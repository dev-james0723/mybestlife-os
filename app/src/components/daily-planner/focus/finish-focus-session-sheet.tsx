"use client";

import { useEffect, useMemo, useState } from "react";
import { SquareCheckBig } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import {
  completionStateLabel,
  focusSessionTypeLabel,
} from "@/components/daily-planner/focus/focus-session-labels";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type {
  PlannerFocusSession,
  PlannerFocusSessionCompletionState,
} from "@/types/database";

const COMPLETION_STATES: readonly PlannerFocusSessionCompletionState[] = [
  "completed",
  "partial",
  "not_completed",
];

function boundedRating(value: string): number | null {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) return null;
  return Math.min(5, Math.max(1, parsed));
}

export function FinishFocusSessionSheet({
  copy,
  open,
  session,
  pending,
  onOpenChange,
  onFinish,
}: {
  copy: DailyPlannerUiCopy;
  open: boolean;
  session: PlannerFocusSession | null | undefined;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onFinish: (input: {
    energyAfter: number | null;
    focusRating: number | null;
    completionState: PlannerFocusSessionCompletionState;
    completionNote: string | null;
  }) => void;
}) {
  const [energyAfter, setEnergyAfter] = useState("3");
  const [focusRating, setFocusRating] = useState("3");
  const [completionState, setCompletionState] =
    useState<PlannerFocusSessionCompletionState>("completed");
  const [completionNote, setCompletionNote] = useState("");

  useEffect(() => {
    if (!session || !open) return;
    setEnergyAfter(session.energy_after ? String(session.energy_after) : "3");
    setFocusRating(session.focus_rating ? String(session.focus_rating) : "3");
    setCompletionState(session.completion_state ?? "completed");
    setCompletionNote(session.completion_note ?? "");
  }, [open, session]);

  const energy = useMemo(() => boundedRating(energyAfter), [energyAfter]);
  const rating = useMemo(() => boundedRating(focusRating), [focusRating]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom-card" className="max-h-[92vh] overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border/50 px-4 pt-4 pb-3 sm:px-6">
          <SheetTitle>{copy.finishFocusSheetTitle}</SheetTitle>
          <SheetDescription>
            {session
              ? `${session.task_title} · ${focusSessionTypeLabel(copy, session.session_type)}`
              : copy.untitledTask}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="focus-energy-after">{copy.energyAfter}</Label>
              <Input
                id="focus-energy-after"
                type="number"
                min={1}
                max={5}
                inputMode="numeric"
                value={energyAfter}
                onChange={(event) => setEnergyAfter(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="focus-rating">{copy.focusRating}</Label>
              <Input
                id="focus-rating"
                type="number"
                min={1}
                max={5}
                inputMode="numeric"
                value={focusRating}
                onChange={(event) => setFocusRating(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{copy.completionState}</Label>
              <Select
                value={completionState}
                onValueChange={(value) => {
                  if (COMPLETION_STATES.includes(value as PlannerFocusSessionCompletionState)) {
                    setCompletionState(value as PlannerFocusSessionCompletionState);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPLETION_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {completionStateLabel(copy, state)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="focus-completion-note">{copy.completionNote}</Label>
              <Textarea
                id="focus-completion-note"
                value={completionNote}
                onChange={(event) => setCompletionNote(event.target.value)}
                placeholder={copy.completionNotePlaceholder}
                rows={4}
              />
            </div>
          </div>
        </div>

        <SheetFooter className="border-t border-border/50 bg-popover/95 px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            className="h-11 min-h-11 gap-1.5 rounded-xl"
            disabled={!session || pending}
            onClick={() =>
              onFinish({
                energyAfter: energy,
                focusRating: rating,
                completionState,
                completionNote: completionNote.trim() || null,
              })
            }
          >
            <SquareCheckBig className="h-3.5 w-3.5" />
            {copy.finishFocus}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
