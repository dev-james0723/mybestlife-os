"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import type { HabitWizardStepCopy, HabitWizardStepKey, HabitsUiCopy } from "@/lib/i18n/habits-ui";
import type {
  CrossPageHabitSuggestion,
  OnboardingRecommendResponse,
} from "@/lib/ai/schemas/habits/secretary";
import { parseOnboardingRecommendResponse } from "@/lib/ai/schemas/habits/secretary";
import { habitProposalToCreateInput } from "@/lib/habits/map-proposal-to-create-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCreateHabit } from "@/hooks/use-habits";
import { useAppStore } from "@/stores/app-store";

export interface AiHabitBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: HabitsUiCopy;
}

type Answers = Record<HabitWizardStepKey, string>;

const makeInitialAnswers = (steps: HabitWizardStepCopy[]): Answers =>
  steps.reduce(
    (acc, step) => ({
      ...acc,
      [step.key]: step.defaultOption,
    }),
    {} as Answers,
  );

export function AiHabitBuilderDialog({
  open,
  onOpenChange,
  copy,
}: AiHabitBuilderDialogProps) {
  const language = useAppStore((s) => s.language);
  const create = useCreateHabit();
  const steps = copy.aiWizardSteps;
  const initialAnswers = useMemo(() => makeInitialAnswers(steps), [steps]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => makeInitialAnswers(copy.aiWizardSteps));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingRecommendResponse | null>(null);

  const step = steps[stepIndex]!;
  const progress = useMemo(
    () => Math.round(((stepIndex + 1) / steps.length) * 100),
    [stepIndex, steps.length],
  );

  const reset = () => {
    setStepIndex(0);
    setAnswers(initialAnswers);
    setErr(null);
    setResult(null);
    setLoading(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const generate = async () => {
    setLoading(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/habits/onboarding-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, language }),
      });
      const raw = await res.json();
      if (!res.ok) {
        setErr(typeof raw.error === "string" ? raw.error : "request_failed");
        return;
      }
      const parsed = parseOnboardingRecommendResponse(raw.content);
      setResult(parsed);
    } catch {
      setErr("network_error");
    } finally {
      setLoading(false);
    }
  };

  const commitProposal = (proposal: CrossPageHabitSuggestion) => {
    create.mutate(habitProposalToCreateInput(proposal), {
      onSuccess: () => handleOpenChange(false),
    });
  };

  const choose = (value: string) => {
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{copy.dialogAiHabitTitle}</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {stepIndex + 1} / {steps.length}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {step.options.map((option) => (
                <Button
                  key={option}
                  type="button"
                  variant={answers[step.key] === option ? "default" : "outline"}
                  className="h-auto justify-start whitespace-normal py-3 text-left"
                  onClick={() => choose(option)}
                >
                  {answers[step.key] === option && <Check className="size-4" />}
                  {option}
                </Button>
              ))}
            </div>
            {err && <p className="text-sm text-destructive">{copy.insightFailed}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
              <Badge className="mb-3 bg-primary/15 text-primary" variant="secondary">
                <Sparkles className="mr-1 size-3" />
                {copy.aiWizardPrimaryRecommendation}
              </Badge>
              <h3 className="text-base font-semibold">{result.primary.name}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {result.primary.reason}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="outline">{result.primary.timeOfDay}</Badge>
                <Badge variant="outline">{result.primary.difficulty}</Badge>
                <Badge variant="outline">{result.expectedFriction}</Badge>
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                disabled={create.isPending}
                onClick={() => commitProposal(result.primary)}
              >
                {copy.aiUsePrimary}
              </Button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-muted-foreground">
              {result.secretaryNote}
            </div>
            {result.alternatives.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {result.alternatives.map((alt) => (
                  <button
                    key={alt.name}
                    type="button"
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-sm transition hover:border-primary/30"
                    disabled={create.isPending}
                    onClick={() => commitProposal(alt)}
                  >
                    <span className="font-medium">{alt.name}</span>
                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                      {alt.reason}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!result && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              >
                <ArrowLeft className="size-4" />
                {copy.aiWizardBack}
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() =>
                  stepIndex === steps.length - 1
                    ? void generate()
                    : setStepIndex((i) => i + 1)
                }
              >
                {stepIndex === steps.length - 1
                  ? loading
                    ? copy.aiGenerating
                    : copy.aiGenerate
                  : copy.aiWizardNext}
                <ArrowRight className="size-4" />
              </Button>
            </>
          )}
          {result && (
            <Button type="button" variant="outline" onClick={() => setResult(null)}>
              {copy.aiWizardBackToAnswers}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
