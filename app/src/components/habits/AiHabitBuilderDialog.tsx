"use client";

import { useState } from "react";
import type { HabitsUiCopy } from "@/lib/i18n/habits-ui";
import type {
  HabitBuilderResponse,
  HabitProposal,
} from "@/lib/ai/schemas/habits/habit-builder";
import { parseHabitBuilderResponse } from "@/lib/ai/schemas/habits/habit-builder";
import { habitProposalToCreateInput } from "@/lib/habits/map-proposal-to-create-input";
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
import { useCreateHabit } from "@/hooks/use-habits";
import { useAppStore } from "@/stores/app-store";

export interface AiHabitBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: HabitsUiCopy;
}

export function AiHabitBuilderDialog({
  open,
  onOpenChange,
  copy,
}: AiHabitBuilderDialogProps) {
  const language = useAppStore((s) => s.language);
  const create = useCreateHabit();

  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<HabitBuilderResponse | null>(null);

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
      const res = await fetch("/api/ai/habits/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: q, language }),
      });
      const raw = await res.json();
      if (!res.ok) {
        setErr(typeof raw.error === "string" ? raw.error : "request_failed");
        return;
      }
      const parsed = parseHabitBuilderResponse(raw.content);
      setResult(parsed);
    } catch {
      setErr("network_error");
    } finally {
      setLoading(false);
    }
  };

  const commitProposal = (proposal: HabitProposal) => {
    create.mutate(habitProposalToCreateInput(proposal), {
      onSuccess: () => handleOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{copy.dialogAiHabitTitle}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="ai-habit-intent">{copy.intentLabel}</Label>
            <Input
              id="ai-habit-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder={copy.intentPlaceholderHabit}
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
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
              <div>
                <p className="font-medium">{result.primary.name}</p>
                {result.primary.description && (
                  <p className="mt-1 text-muted-foreground">{result.primary.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{copy.aiRationale}: </span>
                  {result.primary.rationale}
                </p>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  disabled={create.isPending}
                  onClick={() => commitProposal(result.primary)}
                >
                  {copy.aiUsePrimary}
                </Button>
              </div>
              {result.alternatives.length > 0 && (
                <div className="space-y-2 border-t border-border/50 pt-2">
                  {result.alternatives.map((alt, i) => (
                    <div key={i}>
                      <p className="font-medium">{alt.name}</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-1"
                        disabled={create.isPending}
                        onClick={() => commitProposal(alt)}
                      >
                        {alt.name}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
