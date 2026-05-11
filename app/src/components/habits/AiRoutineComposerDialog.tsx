"use client";

import { useState } from "react";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import { timeOfDayLabel } from "@/lib/i18n/habits-ui";
import type { RoutineComposerResponse } from "@/lib/ai/schemas/habits/routine-composer";
import { parseRoutineComposerResponse } from "@/lib/ai/schemas/habits/routine-composer";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRoutine, useCreateRoutineStep } from "@/hooks/use-routines";
import { useAppStore } from "@/stores/app-store";

export interface AiRoutineComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: HabitsUiCopy;
}

export function AiRoutineComposerDialog({
  open,
  onOpenChange,
  copy,
}: AiRoutineComposerDialogProps) {
  const language = useAppStore((s) => s.language);
  const createRoutine = useCreateRoutine();
  const createStep = useCreateRoutineStep();

  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<RoutineComposerResponse | null>(null);

  const reset = () => {
    setIntent("");
    setErr(null);
    setResult(null);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const generate = async () => {
    const q = intent.trim();
    if (!q) return;
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/habits/compose-routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: q, language }),
      });
      const raw = await res.json();
      if (!res.ok) {
        setErr(typeof raw.error === "string" ? raw.error : "request_failed");
        return;
      }
      setResult(parseRoutineComposerResponse(raw.content));
    } catch {
      setErr("network_error");
    } finally {
      setLoading(false);
    }
  };

  const createFromResult = async () => {
    if (!result) return;
    try {
      const routine = await createRoutine.mutateAsync({
        name: result.name,
        description: result.description ?? null,
        time_of_day: result.timeOfDay,
      });
      for (let i = 0; i < result.steps.length; i++) {
        const st = result.steps[i]!;
        await createStep.mutateAsync({
          routine_id: routine.id,
          position: i,
          title: st.title,
          description: st.description ?? null,
          duration_seconds: st.durationSeconds ?? null,
        });
      }
      handleOpenChange(false);
    } catch {
      /* hooks toast */
    }
  };

  const pending = createRoutine.isPending || createStep.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{copy.dialogAiRoutineTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ai-rt-intent">{copy.intentLabel}</Label>
            <Input
              id="ai-rt-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder={copy.intentPlaceholderRoutine}
              maxLength={500}
            />
          </div>
          {err && (
            <p className="text-sm text-destructive">{copy.insightFailed}</p>
          )}
          <Button type="button" disabled={loading || !intent.trim()} onClick={() => void generate()}>
            {loading ? copy.aiGenerating : copy.aiGenerate}
          </Button>

          {result && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
              <p className="font-medium">{result.name}</p>
              {result.description && (
                <p className="text-muted-foreground">{result.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {timeOfDayLabel(result.timeOfDay, copy)}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{copy.aiRationale}: </span>
                {result.rationale}
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-xs">
                {result.steps.map((s, i) => (
                  <li key={i}>
                    {s.title}
                    {s.durationSeconds != null && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {Math.round(s.durationSeconds / 60)}m
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => void createFromResult()}
              >
                {copy.routineSubmitCreate}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {copy.formCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
