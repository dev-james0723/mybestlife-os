"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SYSTEM_RESET_STEPS } from "@/lib/bio-lab/flow-types";
import { getBioLabFlowsCopy } from "@/lib/i18n/bio-lab-flows-ui";
import { getBioLabAIAssistCopy } from "@/lib/i18n/bio-lab-ai-assist-ui";
import { useAppStore } from "@/stores/app-store";
import { useBioLabStore } from "@/stores/bio-lab-store";
import { useCreateBioLabSystemReset } from "@/hooks/use-bio-lab-history";
import { fetchResetSequence } from "@/lib/ai/bio-lab/clients/system-reset";
import type { ResetSequenceResult } from "@/lib/ai/bio-lab/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolCompletionCard } from "@/components/bio-lab/shared/tool-completion-card";
import type {
  SystemResetResult,
  SystemResetStepCompletion,
  ToolType,
} from "@/lib/bio-lab/completion-types";
import { cn } from "@/lib/utils";

const NOTE_MAX = 240;
/** Default per-step duration when running the static (non-AI) sequence.
 *  Used as the recorded `durationSeconds` for each completed step. */
const STATIC_STEP_DURATION_SEC = 60;

type Sequence =
  | { kind: "static"; steps: ReadonlyArray<{ id: string; title: string; body: string; durationSeconds: number }> }
  | { kind: "adaptive"; sequence: ResetSequenceResult };

export function SystemResetPanel() {
  const language = useAppStore((s) => s.language);
  const flows = getBioLabFlowsCopy(language);
  const copy = flows.reset;
  const aiCopy = getBioLabAIAssistCopy(language);
  const reduceMotion = useReducedMotion() ?? false;

  const closeTool = useBioLabStore((s) => s.closeTool);
  const openTool = useBioLabStore((s) => s.openTool);
  const lastStateRead = useBioLabStore((s) => s.stateScanHistory[0] ?? null);
  const saveResetMutation = useCreateBioLabSystemReset();

  const [aiNote, setAiNote] = useState("");
  const [aiPending, startAiTransition] = useTransition();
  const [aiSequence, setAiSequence] = useState<ResetSequenceResult | null>(null);

  const [index, setIndex] = useState(0);
  /** True once the user has begun executing a sequence (static or AI).
   *  Step navigation only renders after this. */
  const [running, setRunning] = useState(false);
  /** Records which steps the user actually advanced through, with timestamps
   *  so we can compute an honest per-step `durationSeconds`. */
  const stepStartedAtRef = useRef<number | null>(null);
  const completedStepsRef = useRef<SystemResetStepCompletion[]>([]);

  const stepTitleRef = useRef<HTMLHeadingElement>(null);
  const [completion, setCompletion] = useState<SystemResetResult | null>(null);

  // Pull in the static sequence with localized title/body for parity with
  // the adaptive variant.
  const staticSequence = useMemo<Sequence>(
    () => ({
      kind: "static",
      steps: SYSTEM_RESET_STEPS.map((s) => ({
        id: s.id,
        title: copy.steps[s.id].title,
        body: copy.steps[s.id].body,
        durationSeconds: STATIC_STEP_DURATION_SEC,
      })),
    }),
    [copy.steps],
  );

  const sequence: Sequence = aiSequence
    ? { kind: "adaptive", sequence: aiSequence }
    : staticSequence;

  const sequenceSteps =
    sequence.kind === "static" ? sequence.steps : sequence.sequence.steps;
  const total = sequenceSteps.length;
  const finished = running && index >= total;

  useLayoutEffect(() => {
    if (!running || finished) return;
    stepTitleRef.current?.focus({ preventScroll: true });
    stepStartedAtRef.current = Date.now();
  }, [index, running, finished]);

  const askForAdaptive = useCallback(() => {
    if (aiPending) return;
    startAiTransition(() => {
      void (async () => {
        try {
          const stateInput = lastStateRead
            ? {
                mood: lastStateRead.mood,
                energy: lastStateRead.energy,
                focus: lastStateRead.focus,
                stress: lastStateRead.stress,
              }
            : { mood: 3, energy: 3, focus: 3, stress: 3 };
          const payload = await fetchResetSequence({
            state: stateInput,
            note: aiNote.trim() || undefined,
            language,
          });
          setAiSequence(payload.content);
        } catch {
          toast.error(aiCopy.shared.fallbackNotice);
        }
      })();
    });
  }, [aiPending, lastStateRead, aiNote, language, aiCopy.shared.fallbackNotice]);

  const startSequence = () => {
    completedStepsRef.current = [];
    setIndex(0);
    setRunning(true);
  };

  const recordCurrentStep = () => {
    const step = sequenceSteps[index];
    if (!step) return;
    const startedAt = stepStartedAtRef.current ?? Date.now();
    const elapsedSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    completedStepsRef.current.push({
      id: step.id,
      durationSeconds: elapsedSec,
      skipped: false,
    });
  };

  const advance = () => {
    recordCurrentStep();
    if (index + 1 >= total) {
      setIndex(total);
      finalize();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const finalize = () => {
    const adaptive = sequence.kind === "adaptive";
    const result: SystemResetResult = {
      steps: completedStepsRef.current.slice(),
      aiAdaptive: adaptive,
    };
    saveResetMutation.mutate(
      {
        steps: result.steps,
        aiAssisted: adaptive,
        aiMetadata: adaptive
          ? {
              summary: sequence.sequence.summary,
              note: aiNote.trim() || null,
              state: lastStateRead
                ? {
                    mood: lastStateRead.mood,
                    energy: lastStateRead.energy,
                    focus: lastStateRead.focus,
                    stress: lastStateRead.stress,
                  }
                : null,
            }
          : null,
      },
      {
        onError: () => {
          toast.error(aiCopy.shared.saveFailed);
        },
      },
    );
    setCompletion(result);
  };

  const reset = () => {
    setCompletion(null);
    setRunning(false);
    setIndex(0);
    setAiSequence(null);
    setAiNote("");
    completedStepsRef.current = [];
    stepStartedAtRef.current = null;
  };

  const handleOpenNext = (next: ToolType) => {
    reset();
    openTool(next);
  };

  const handleDismissCompletion = () => {
    reset();
    closeTool();
  };

  if (completion) {
    return (
      <ToolCompletionCard
        completion={{ tool: "system-reset", data: completion }}
        onOpenNext={handleOpenNext}
        onDismiss={handleDismissCompletion}
      />
    );
  }

  // ----- Pre-flight: pick standard vs adaptive -----
  if (!running) {
    return (
      <div className="flex flex-col gap-5 pb-2">
        <p className="text-sm text-muted-foreground">{copy.lead}</p>

        <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {aiCopy.systemReset.adaptiveTitle}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {aiCopy.systemReset.stateHintTitle}
          </p>
          <div className="space-y-1.5">
            <Label
              htmlFor="reset-ai-note"
              className="text-[0.7rem] font-medium text-muted-foreground"
            >
              {aiCopy.systemReset.stateHintNoteLabel}
            </Label>
            <Input
              id="reset-ai-note"
              value={aiNote}
              onChange={(e) => setAiNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder={aiCopy.systemReset.stateHintNotePlaceholder}
              className="text-base sm:text-sm"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 w-full"
            disabled={aiPending}
            onClick={askForAdaptive}
          >
            {aiPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                {aiCopy.shared.thinking}
              </>
            ) : (
              aiCopy.systemReset.askAdaptiveCta
            )}
          </Button>

          <AnimatePresence initial={false}>
            {aiSequence ? (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3"
              >
                <p className="text-xs italic text-muted-foreground">
                  {aiSequence.summary}
                </p>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-foreground">
                  {aiSequence.steps.map((s) => (
                    <li key={s.id}>
                      <span className="font-medium">{s.title}</span>
                      <span className="text-muted-foreground"> · {s.body}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    className="min-h-9 flex-1"
                    onClick={startSequence}
                  >
                    {aiCopy.shared.accept}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="min-h-9"
                    onClick={() => setAiSequence(null)}
                  >
                    {aiCopy.shared.dismiss}
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <Button
          type="button"
          className="min-h-11 w-full"
          variant={aiSequence ? "outline" : "default"}
          onClick={startSequence}
        >
          {aiSequence ? aiCopy.systemReset.useDefault : copy.next}
        </Button>
      </div>
    );
  }

  // ----- Finished state shows the completion card via the early return
  // above, so this branch only handles "running" states.

  if (finished) {
    // Safety net — finalize() already triggers completion, but if we somehow
    // hit this path, finalize again.
    return null;
  }

  const step = sequenceSteps[index];

  return (
    <div className="flex flex-col gap-5 pb-2">
      <p className="text-sm text-muted-foreground">{copy.lead}</p>
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-xs font-medium text-muted-foreground"
          aria-live="polite"
        >
          {copy.progress(index + 1, total)}
        </p>
        <ProgressDots
          total={total}
          currentIndex={index}
          reduceMotion={reduceMotion}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${sequence.kind}-${index}`}
          initial={
            reduceMotion
              ? false
              : { opacity: 0, y: 6, scale: 0.99 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -6, scale: 0.99, transition: { duration: 0.18 } }
          }
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          className={cn(
            "rounded-2xl border border-border/70 bg-gradient-to-br from-muted/40 to-card px-4 py-5",
            "motion-safe:transition-[box-shadow] motion-safe:duration-300",
          )}
          role="region"
          aria-labelledby="system-reset-step-title"
        >
          <h3
            ref={stepTitleRef}
            id="system-reset-step-title"
            tabIndex={-1}
            className="text-base font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1"
          disabled={index === 0}
          onClick={() => {
            // Going back doesn't record a completion for the (still) current
            // step — it just rewinds. The previously-recorded entry stays.
            if (completedStepsRef.current.length > 0) {
              completedStepsRef.current.pop();
            }
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          {copy.back}
        </Button>
        <Button type="button" className="min-h-11 flex-1" onClick={advance}>
          {index + 1 >= total ? copy.done : copy.next}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Internal: progress dots
// ============================================================

/**
 * Compact progress indicator for the reset sequence.
 *
 * - Already-completed steps render as small filled dots.
 * - The current step renders as a wider pill with a subtle fade-pulse.
 * - Pending steps render as outlined dots.
 *
 * Decorative — the parent already announces "Step N of M" via aria-live,
 * so the dots themselves are aria-hidden to avoid duplicated announcements.
 */
function ProgressDots({
  total,
  currentIndex,
  reduceMotion,
}: {
  total: number;
  currentIndex: number;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <motion.span
            key={i}
            layout={!reduceMotion}
            className={cn(
              "block h-1.5 rounded-full transition-colors",
              isPast && "w-1.5 bg-primary/60",
              isCurrent && "w-5 bg-primary",
              !isPast && !isCurrent && "w-1.5 bg-border",
            )}
            animate={
              isCurrent && !reduceMotion
                ? { opacity: [0.7, 1, 0.7] }
                : { opacity: 1 }
            }
            transition={
              isCurrent && !reduceMotion
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.2 }
            }
          />
        );
      })}
    </div>
  );
}
