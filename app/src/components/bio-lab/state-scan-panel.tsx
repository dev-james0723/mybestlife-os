"use client";

import { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { getBioLabFlowsCopy } from "@/lib/i18n/bio-lab-flows-ui";
import { getBioLabAIAssistCopy } from "@/lib/i18n/bio-lab-ai-assist-ui";
import { BIO_LAB_STATE_NOTE_MAX } from "@/lib/bio-lab/bio-lab-field-limits";
import { useAppStore } from "@/stores/app-store";
import { useBioLabStore } from "@/stores/bio-lab-store";
import { useCreateBioLabStateScan } from "@/hooks/use-bio-lab-history";
import { fetchStateInference } from "@/lib/ai/bio-lab/clients/state-scan";
import { BioLabAIError } from "@/lib/ai/bio-lab/clients/_shared";
import type { StateInferenceResult } from "@/lib/ai/bio-lab/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolCompletionCard } from "@/components/bio-lab/shared/tool-completion-card";
import type {
  StateScanResult,
  ToolType,
} from "@/lib/bio-lab/completion-types";
import { cn } from "@/lib/utils";

type Dim = "mood" | "energy" | "focus" | "stress";
const DIMS: readonly Dim[] = ["mood", "energy", "focus", "stress"] as const;

function dimLabel(copy: ReturnType<typeof getBioLabFlowsCopy>["state"], d: Dim): string {
  switch (d) {
    case "mood":
      return copy.mood;
    case "energy":
      return copy.energy;
    case "focus":
      return copy.focus;
    case "stress":
      return copy.stress;
  }
}

function localeForDate(language: string): string | undefined {
  if (language === "en") return undefined;
  if (language === "zh-TW" || language === "zh-CN") return language;
  return undefined;
}

const MAX_AI_INPUT = 800;

export function StateScanPanel() {
  const language = useAppStore((s) => s.language);
  const flows = getBioLabFlowsCopy(language);
  const copy = flows.state;
  const aiCopy = getBioLabAIAssistCopy(language);
  const reduceMotion = useReducedMotion() ?? false;

  const { history, addLocal, openTool } = useBioLabStore(
    useShallow((s) => ({
      history: s.stateScanHistory,
      addLocal: s.addStateScanEntry,
      openTool: s.openTool,
    })),
  );
  const saveScanMutation = useCreateBioLabStateScan();

  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [focus, setFocus] = useState(3);
  const [stress, setStress] = useState(3);
  const [note, setNote] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  // AI inference state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPending, startAiTransition] = useTransition();
  const [aiInferred, setAiInferred] = useState<{
    raw: string;
    result: StateInferenceResult;
  } | null>(null);

  // Completion state — when present, we render the ToolCompletionCard
  // instead of the form.
  const [completion, setCompletion] = useState<StateScanResult | null>(null);

  /** Set of dimensions just prefilled by AI; clears after ~1.4s so the
   *  glow is felt as a one-time "moment", not a persistent badge. */
  const [aiGlowDims, setAiGlowDims] = useState<ReadonlySet<Dim>>(() => new Set());

  const values: Record<Dim, number> = { mood, energy, focus, stress };

  /**
   * Slider setter wrapper that also clears the AI-glow on the touched
   * dimension so the user gets immediate visual confirmation that their
   * adjustment overrode the AI suggestion.
   */
  const setDim = (d: Dim, n: number) => {
    if (aiGlowDims.has(d)) {
      setAiGlowDims((prev) => {
        const next = new Set(prev);
        next.delete(d);
        return next;
      });
    }
    switch (d) {
      case "mood":
        setMood(n);
        break;
      case "energy":
        setEnergy(n);
        break;
      case "focus":
        setFocus(n);
        break;
      case "stress":
        setStress(n);
        break;
    }
  };

  useEffect(() => {
    if (!savedFlash) return;
    const id = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(id);
  }, [savedFlash]);

  // Auto-clear the AI glow after a brief moment so it reads as celebration,
  // not as decoration.
  useEffect(() => {
    if (aiGlowDims.size === 0) return;
    const id = window.setTimeout(() => setAiGlowDims(new Set()), 1400);
    return () => window.clearTimeout(id);
  }, [aiGlowDims]);

  const runInference = () => {
    const raw = aiPrompt.trim();
    if (!raw || aiPending) return;
    startAiTransition(() => {
      void (async () => {
        try {
          const payload = await fetchStateInference({
            rawInput: raw,
            language,
          });
          const result = payload.content;
          setMood(result.mood);
          setEnergy(result.energy);
          setFocus(result.focus);
          setStress(result.stress);
          if (result.note && !note.trim()) setNote(result.note);
          setAiInferred({ raw, result });
          setAiGlowDims(new Set<Dim>(["mood", "energy", "focus", "stress"]));
        } catch (e) {
          // Graceful degradation — surface a one-line notice but keep the
          // panel usable. Validation errors still hide; everything else
          // gets the same calm fallback message.
          if (e instanceof BioLabAIError && e.kind === "validation") {
            // Silent — the user just hit input limits; field shows it.
          } else {
            toast.error(aiCopy.shared.fallbackNotice);
          }
        }
      })();
    });
  };

  const save = () => {
    addLocal({ mood, energy, focus, stress, note });
    setSavedFlash(true);
    const aiAssisted = aiInferred !== null;
    const aiMetadata = aiInferred
      ? {
          rawInput: aiInferred.raw,
          inferred: aiInferred.result,
        }
      : null;

    saveScanMutation.mutate(
      {
        mood,
        energy,
        focus,
        stress,
        note,
        aiAssisted,
        aiMetadata,
      },
      {
        onError: () => {
          // Localstorage write succeeded — surface a soft notice but don't
          // block the user. The next online save will reconcile.
          toast.error(aiCopy.shared.saveFailed);
        },
      },
    );

    setCompletion({
      mood,
      energy,
      focus,
      stress,
      note,
      inferredFromText: aiAssisted,
    });
  };

  const reset = () => {
    setCompletion(null);
    setMood(3);
    setEnergy(3);
    setFocus(3);
    setStress(3);
    setNote("");
    setAiPrompt("");
    setAiInferred(null);
  };

  const handleOpenNext = (next: ToolType) => {
    reset();
    openTool(next);
  };

  const last = history[0];
  const dateLocale = localeForDate(language);

  if (completion) {
    return (
      <ToolCompletionCard
        completion={{ tool: "state-scan", data: completion }}
        onOpenNext={handleOpenNext}
        onDismiss={reset}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      <p className="text-sm text-muted-foreground">{copy.lead}</p>
      <p className="text-xs text-muted-foreground">{copy.scaleHint}</p>

      <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
        <Label htmlFor="state-scan-ai-prompt" className="text-xs font-medium text-muted-foreground">
          <Sparkles className="mr-1 inline-block size-3 text-primary" aria-hidden />
          {aiCopy.stateScan.aiPromptLabel}
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="state-scan-ai-prompt"
            value={aiPrompt}
            placeholder={aiCopy.stateScan.aiPromptPlaceholder}
            onChange={(e) => setAiPrompt(e.target.value.slice(0, MAX_AI_INPUT))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runInference();
              }
            }}
            className="text-base sm:text-sm"
            aria-busy={aiPending}
          />
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 sm:min-h-9"
            disabled={!aiPrompt.trim() || aiPending}
            onClick={runInference}
          >
            {aiPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                {aiCopy.shared.thinking}
              </>
            ) : (
              aiCopy.stateScan.aiPromptCta
            )}
          </Button>
        </div>
        <AnimatePresence initial={false}>
          {aiInferred ? (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[0.7rem] italic text-muted-foreground"
            >
              {aiCopy.stateScan.appliedCaption}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-4">
        {DIMS.map((d) => {
          const glowing = aiGlowDims.has(d);
          return (
            <div key={d} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label id={`state-scan-${d}-label`} className="text-sm font-medium">
                  {dimLabel(copy, d)}
                </Label>
                <motion.span
                  key={`${d}-${values[d]}-${glowing ? "ai" : "manual"}`}
                  initial={
                    reduceMotion || !glowing
                      ? false
                      : { scale: 0.9, backgroundColor: "rgba(99, 102, 241, 0.18)" }
                  }
                  animate={
                    glowing
                      ? {
                          scale: [1, 1.08, 1],
                          backgroundColor: [
                            "rgba(99, 102, 241, 0.18)",
                            "rgba(99, 102, 241, 0.28)",
                            "rgba(99, 102, 241, 0)",
                          ],
                        }
                      : { scale: 1, backgroundColor: "rgba(99, 102, 241, 0)" }
                  }
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className={cn(
                    "inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5",
                    "tabular-nums text-sm font-semibold text-foreground",
                  )}
                >
                  {values[d]}
                </motion.span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={values[d]}
                onChange={(e) => setDim(d, Number(e.target.value))}
                className={cn(
                  "h-2 w-full cursor-pointer accent-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                )}
                aria-labelledby={`state-scan-${d}-label`}
                aria-valuemin={1}
                aria-valuemax={5}
                aria-valuenow={values[d]}
                aria-valuetext={`${values[d]} / 5`}
              />
              <div className="flex justify-between text-[0.65rem] text-muted-foreground uppercase tracking-wide">
                <span>{copy.scaleLow}</span>
                <span>{copy.scaleHigh}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="state-scan-note" className="text-sm">
          {copy.note}
        </Label>
        <Textarea
          id="state-scan-note"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, BIO_LAB_STATE_NOTE_MAX))}
          placeholder={copy.notePlaceholder}
          rows={2}
          maxLength={BIO_LAB_STATE_NOTE_MAX}
          className="resize-none text-base sm:text-sm"
        />
      </div>

      <Button
        type="button"
        className="min-h-11 w-full"
        onClick={save}
        disabled={saveScanMutation.isPending}
      >
        {savedFlash ? copy.saved : copy.save}
      </Button>

      {last ? (
        <div className="rounded-xl border border-border/60 bg-muted/15 p-3">
          <p className="text-xs font-medium text-muted-foreground">{copy.lastTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(last.createdAt).toLocaleString(dateLocale)}
          </p>
          <p className="mt-2 text-sm tabular-nums text-foreground">
            {copy.mood} {last.mood} · {copy.energy} {last.energy} · {copy.focus} {last.focus} ·{" "}
            {copy.stress} {last.stress}
          </p>
          {last.note ? (
            <p
              className="mt-2 line-clamp-5 text-sm break-words text-muted-foreground whitespace-pre-wrap"
              title={last.note.length > 120 ? last.note : undefined}
            >
              {last.note}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
