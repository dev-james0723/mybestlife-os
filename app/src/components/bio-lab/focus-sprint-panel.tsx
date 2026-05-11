"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FOCUS_PRESETS, type FocusOutcome } from "@/lib/bio-lab/flow-types";
import {
  BIO_LAB_INTENTION_MAX,
  BIO_LAB_REFLECT_NOTE_MAX,
} from "@/lib/bio-lab/bio-lab-field-limits";
import { getBioLabFlowsCopy } from "@/lib/i18n/bio-lab-flows-ui";
import { getBioLabAIAssistCopy } from "@/lib/i18n/bio-lab-ai-assist-ui";
import { useAppStore } from "@/stores/app-store";
import { useBioLabStore } from "@/stores/bio-lab-store";
import { useCreateBioLabFocusSprint } from "@/hooks/use-bio-lab-history";
import {
  appendFocusSprintTemplate,
  loadFocusSprintTemplates,
  MAX_FOCUS_SPRINT_TEMPLATES,
  persistFocusSprintTemplates,
  removeFocusSprintTemplate,
  type StoredFocusSprintTemplate,
} from "@/lib/bio-lab/focus-sprint-templates-storage";
import { fetchFocusRecommendation } from "@/lib/ai/bio-lab/clients/focus-sprint";
import type { FocusRecommendationResult } from "@/lib/ai/bio-lab/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToolCompletionCard } from "@/components/bio-lab/shared/tool-completion-card";
import { FocusClockDisplay } from "@/components/bio-lab/shared/focus-clock-display";
import type {
  FocusSprintResult,
  ToolType,
} from "@/lib/bio-lab/completion-types";

type FocusStep = "pick" | "intention" | "work" | "break" | "reflect";

type FocusState = {
  step: FocusStep;
  workSec: number;
  breakSec: number;
  intention: string;
  remaining: number;
  paused: boolean;
  customWork: string;
  customBreak: string;
  reflectOutcome: FocusOutcome | null;
  reflectNote: string;
  reflectRating: number | null;
  /** True when AI recommended the intention/duration and the user accepted. */
  aiRecommended: boolean;
};

const initialPick: FocusState = {
  step: "pick",
  workSec: 25 * 60,
  breakSec: 5 * 60,
  intention: "",
  remaining: 0,
  paused: false,
  customWork: "45",
  customBreak: "10",
  reflectOutcome: null,
  reflectNote: "",
  reflectRating: null,
  aiRecommended: false,
};

type FocusAction =
  | { type: "preset"; workMin: number; breakMin: number }
  | { type: "templatePreset"; label: string; workMin: number; breakMin: number }
  | { type: "setCustom"; work: string; br: string }
  | { type: "applyAiRecommendation"; rec: FocusRecommendationResult }
  | { type: "intention"; value: string }
  | { type: "startRun"; clearIntention: boolean }
  | { type: "tick" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "breakToReflect" }
  | { type: "setReflect"; outcome: FocusOutcome | null; note?: string }
  | { type: "setRating"; rating: number | null }
  | { type: "resetPick" };

function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case "preset":
      return {
        ...initialPick,
        workSec: action.workMin * 60,
        breakSec: action.breakMin * 60,
        step: "intention",
        customWork: String(action.workMin),
        customBreak: String(action.breakMin),
      };
    case "templatePreset":
      return {
        ...initialPick,
        workSec: action.workMin * 60,
        breakSec: action.breakMin * 60,
        step: "intention",
        intention: action.label.slice(0, BIO_LAB_INTENTION_MAX),
        customWork: String(action.workMin),
        customBreak: String(action.breakMin),
      };
    case "setCustom":
      return { ...state, customWork: action.work, customBreak: action.br };
    case "applyAiRecommendation":
      return {
        ...initialPick,
        workSec: action.rec.workMinutes * 60,
        breakSec: action.rec.breakMinutes * 60,
        step: "intention",
        intention: action.rec.intention,
        customWork: String(action.rec.workMinutes),
        customBreak: String(action.rec.breakMinutes),
        aiRecommended: true,
      };
    case "intention":
      return { ...state, intention: action.value.slice(0, BIO_LAB_INTENTION_MAX) };
    case "startRun":
      return {
        ...state,
        step: "work",
        remaining: state.workSec,
        paused: false,
        intention: action.clearIntention ? "" : state.intention,
      };
    case "tick": {
      if (state.paused || (state.step !== "work" && state.step !== "break")) return state;
      if (state.remaining <= 0) return state;
      const next = state.remaining - 1;
      if (state.step === "work" && next === 0) {
        if (state.breakSec <= 0) {
          return {
            ...state,
            step: "reflect",
            remaining: 0,
            paused: false,
            reflectOutcome: null,
            reflectNote: "",
            reflectRating: null,
          };
        }
        return { ...state, step: "break", remaining: state.breakSec, paused: false };
      }
      if (state.step === "break" && next === 0) {
        return {
          ...state,
          step: "reflect",
          remaining: 0,
          paused: false,
          reflectOutcome: null,
          reflectNote: "",
          reflectRating: null,
        };
      }
      return { ...state, remaining: next };
    }
    case "pause":
      return { ...state, paused: true };
    case "resume":
      return { ...state, paused: false };
    case "breakToReflect":
      return {
        ...state,
        step: "reflect",
        remaining: 0,
        paused: false,
        reflectOutcome: null,
        reflectNote: "",
        reflectRating: null,
      };
    case "setReflect": {
      const nextNote = (action.note ?? state.reflectNote).slice(0, BIO_LAB_REFLECT_NOTE_MAX);
      return {
        ...state,
        reflectOutcome: action.outcome,
        reflectNote: nextNote,
      };
    }
    case "setRating":
      return { ...state, reflectRating: action.rating };
    case "resetPick":
      return { ...initialPick };
    default:
      return state;
  }
}

type FocusSprintPanelProps = {
  onClose: () => void;
};

const RATING_STEPS = [1, 2, 3, 4, 5] as const;

export function FocusSprintPanel({ onClose }: FocusSprintPanelProps) {
  const language = useAppStore((s) => s.language);
  const flows = getBioLabFlowsCopy(language);
  const copy = flows.focus;
  const aiCopy = getBioLabAIAssistCopy(language);
  const reduceMotion = useReducedMotion() ?? false;

  const openTool = useBioLabStore((s) => s.openTool);
  /** Most recent client-side state read used as cross-tool context for the
   *  AI recommendation. Falls back to neutral defaults when missing. */
  const lastStateRead = useBioLabStore((s) => s.stateScanHistory[0] ?? null);
  const saveSprintMutation = useCreateBioLabFocusSprint();

  const [state, dispatch] = useReducer(focusReducer, initialPick);
  const [endOpen, setEndOpen] = useState(false);
  const [completion, setCompletion] = useState<FocusSprintResult | null>(null);
  const stateRef = useRef(state);

  // AI recommendation state (only meaningful on the "pick" step).
  const [aiPending, startAiTransition] = useTransition();
  const [aiRec, setAiRec] = useState<FocusRecommendationResult | null>(null);
  const [aiIntent, setAiIntent] = useState("");
  const [sprintTemplates, setSprintTemplates] = useState<StoredFocusSprintTemplate[]>([]);
  const [templateLabelDraft, setTemplateLabelDraft] = useState("");

  useEffect(() => {
    setSprintTemplates(loadFocusSprintTemplates());
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const tickable = state.step === "work" || state.step === "break";

  useEffect(() => {
    const onVisibility = () => {
      const s = stateRef.current;
      if (
        document.visibilityState === "hidden" &&
        (s.step === "work" || s.step === "break") &&
        !s.paused
      ) {
        dispatch({ type: "pause" });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!tickable || state.paused || state.remaining <= 0) return;
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(id);
  }, [tickable, state.paused, state.remaining, state.step]);

  const persistTemplates = useCallback((next: StoredFocusSprintTemplate[]) => {
    persistFocusSprintTemplates(next);
    setSprintTemplates(next);
  }, []);

  const saveSprintTemplate = useCallback(() => {
    const w = Math.floor(Number(state.customWork));
    const b = Math.floor(Number(state.customBreak));
    const label = templateLabelDraft.trim();
    if (!label) {
      toast.error(copy.templateMissingLabel);
      return;
    }
    if (!Number.isFinite(w) || !Number.isFinite(b) || w < 1 || w > 180 || b < 0 || b > 60) {
      toast.error(copy.customInvalid);
      return;
    }
    if (sprintTemplates.length >= MAX_FOCUS_SPRINT_TEMPLATES) {
      toast.error(copy.templateLimit(MAX_FOCUS_SPRINT_TEMPLATES));
      return;
    }
    const next = appendFocusSprintTemplate(sprintTemplates, label, w, b);
    persistTemplates(next);
    setTemplateLabelDraft("");
    toast.success(copy.templateSaved);
  }, [
    state.customWork,
    state.customBreak,
    templateLabelDraft,
    sprintTemplates,
    persistTemplates,
    copy.customInvalid,
    copy.templateMissingLabel,
    copy.templateLimit,
    copy.templateSaved,
  ]);

  const deleteSprintTemplate = useCallback(
    (id: string) => {
      persistTemplates(removeFocusSprintTemplate(sprintTemplates, id));
    },
    [sprintTemplates, persistTemplates],
  );

  const askForRecommendation = useCallback(() => {
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
            : undefined;
          const intent = aiIntent.trim() || undefined;
          if (!intent && !stateInput) {
            // Need at least one signal — silently no-op so we don't spam
            // the user with errors when there's nothing to act on.
            return;
          }
          const payload = await fetchFocusRecommendation({
            intent,
            state: stateInput,
            language,
          });
          setAiRec(payload.content);
        } catch {
          toast.error(aiCopy.shared.fallbackNotice);
        }
      })();
    });
  }, [aiPending, aiIntent, lastStateRead, language, aiCopy.shared.fallbackNotice]);

  const acceptRecommendation = () => {
    if (!aiRec) return;
    dispatch({ type: "applyAiRecommendation", rec: aiRec });
    setAiRec(null);
    setAiIntent("");
  };

  const saveReflection = useCallback(() => {
    if (!state.reflectOutcome) return;
    const result: FocusSprintResult = {
      intention: state.intention,
      workSeconds: state.workSec,
      breakSeconds: state.breakSec,
      outcome: state.reflectOutcome,
      focusRating: state.reflectRating,
      reflectionNote: state.reflectNote,
      aiRecommended: state.aiRecommended,
    };

    saveSprintMutation.mutate(
      {
        intention: result.intention,
        workSeconds: result.workSeconds,
        breakSeconds: result.breakSeconds,
        outcome: result.outcome,
        focusRating: result.focusRating,
        reflectionNote: result.reflectionNote,
        aiAssisted: result.aiRecommended,
      },
      {
        onError: () => {
          toast.error(aiCopy.shared.saveFailed);
        },
      },
    );

    setCompletion(result);
  }, [state, saveSprintMutation, aiCopy.shared.saveFailed]);

  const reset = () => {
    setCompletion(null);
    dispatch({ type: "resetPick" });
    setAiRec(null);
    setAiIntent("");
  };

  const handleOpenNext = (next: ToolType) => {
    reset();
    openTool(next);
  };

  const handleDismissCompletion = () => {
    reset();
    onClose();
  };

  if (completion) {
    return (
      <ToolCompletionCard
        completion={{ tool: "focus-sprint", data: completion }}
        onOpenNext={handleOpenNext}
        onDismiss={handleDismissCompletion}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-2">
      {state.step === "pick" && (
        <>
          <p className="text-sm text-muted-foreground">{copy.pickLead}</p>

          {/* AI recommendation block */}
          <div className="space-y-2 rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {aiCopy.focusSprint.recommendationTitle}
              </p>
            </div>
            <Input
              value={aiIntent}
              onChange={(e) =>
                setAiIntent(e.target.value.slice(0, BIO_LAB_INTENTION_MAX))
              }
              placeholder={copy.intentionPlaceholder}
              className="text-base sm:text-sm"
              aria-label={copy.intentionTitle}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 flex-1"
                onClick={askForRecommendation}
                disabled={
                  aiPending || (!aiIntent.trim() && !lastStateRead)
                }
              >
                {aiPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
                    {aiCopy.shared.thinking}
                  </>
                ) : (
                  aiCopy.focusSprint.askCta
                )}
              </Button>
            </div>
            <AnimatePresence initial={false}>
              {aiRec ? (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2 rounded-lg border border-border/60 bg-background/80 p-3"
                >
                  <p className="text-sm font-medium text-foreground">
                    {aiRec.intention}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {copy.presetLabel(aiRec.workMinutes, aiRec.breakMinutes)}
                  </p>
                  <p className="text-xs italic text-muted-foreground">
                    {aiRec.reasoning}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="min-h-9 flex-1"
                      onClick={acceptRecommendation}
                    >
                      {aiCopy.shared.accept}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-9"
                      onClick={() => setAiRec(null)}
                    >
                      {aiCopy.shared.dismiss}
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="grid gap-2.5">
            {FOCUS_PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                variant="outline"
                className="h-auto min-h-11 justify-start py-3 text-left whitespace-normal"
                onClick={() =>
                  dispatch({ type: "preset", workMin: p.workMinutes, breakMin: p.breakMinutes })
                }
              >
                <span className="block font-medium">
                  {copy.presetLabel(p.workMinutes, p.breakMinutes)}
                </span>
              </Button>
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {copy.templatesTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{copy.templatesLead}</p>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs" htmlFor="sprint-template-label">
                {copy.templatePurposeLabel}
              </Label>
              <Input
                id="sprint-template-label"
                value={templateLabelDraft}
                onChange={(e) =>
                  setTemplateLabelDraft(e.target.value.slice(0, BIO_LAB_INTENTION_MAX))
                }
                placeholder={copy.intentionPlaceholder}
                className="text-base sm:text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="grid min-w-[120px] flex-1 gap-1">
                <Label className="text-xs">{copy.customWork}</Label>
                <Input
                  inputMode="numeric"
                  value={state.customWork}
                  onChange={(e) =>
                    dispatch({ type: "setCustom", work: e.target.value, br: state.customBreak })
                  }
                  aria-label={copy.customWork}
                />
              </div>
              <div className="grid min-w-[120px] flex-1 gap-1">
                <Label className="text-xs">{copy.customBreak}</Label>
                <Input
                  inputMode="numeric"
                  value={state.customBreak}
                  onChange={(e) =>
                    dispatch({ type: "setCustom", work: state.customWork, br: e.target.value })
                  }
                  aria-label={copy.customBreak}
                />
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              variant="secondary"
              onClick={saveSprintTemplate}
            >
              {copy.saveTemplate}
            </Button>

            {sprintTemplates.length > 0 ? (
              <div className="space-y-2 pt-1" role="list" aria-label={copy.templatesTitle}>
                {sprintTemplates.map((t) => (
                  <div key={t.id} className="flex gap-1.5" role="listitem">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-11 flex-1 flex-col items-stretch justify-center gap-0.5 py-3 text-left whitespace-normal"
                      onClick={() =>
                        dispatch({
                          type: "templatePreset",
                          label: t.label,
                          workMin: t.workMinutes,
                          breakMin: t.breakMinutes,
                        })
                      }
                    >
                      <span className="block font-medium">{t.label}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {copy.presetLabel(t.workMinutes, t.breakMinutes)}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={copy.removeTemplate}
                      onClick={() => deleteSprintTemplate(t.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}

      {state.step === "intention" && (
        <div className="space-y-3">
          <h3 id="focus-intention-title" className="text-sm font-semibold">
            {copy.intentionTitle}
          </h3>
          <Textarea
            value={state.intention}
            placeholder={copy.intentionPlaceholder}
            onChange={(e) => dispatch({ type: "intention", value: e.target.value })}
            rows={3}
            maxLength={BIO_LAB_INTENTION_MAX}
            className="min-h-[88px] resize-none text-base sm:text-sm"
            aria-labelledby="focus-intention-title"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={() => dispatch({ type: "startRun", clearIntention: true })}
            >
              {copy.intentionSkip}
            </Button>
            <Button
              type="button"
              className="min-h-11 flex-1"
              onClick={() => dispatch({ type: "startRun", clearIntention: false })}
            >
              {copy.intentionContinue}
            </Button>
          </div>
        </div>
      )}

      {(state.step === "work" || state.step === "break") && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {state.step === "work" ? copy.phaseWork : copy.phaseBreak}
            </span>
            {state.intention.trim() ? (
              <span className="max-w-[65%] truncate text-xs text-muted-foreground">
                {state.intention.trim()}
              </span>
            ) : null}
          </div>
          <FocusClockDisplay
            phase={state.step === "work" ? "work" : "break"}
            remainingSec={state.remaining}
            totalSec={state.step === "work" ? state.workSec : state.breakSec}
            paused={state.paused}
            remainingLabel={copy.timeRemaining}
          />
          <div className="flex flex-wrap gap-2">
            {state.paused ? (
              <Button
                type="button"
                className="min-h-11 flex-1"
                onClick={() => dispatch({ type: "resume" })}
              >
                {copy.resume}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 flex-1"
                onClick={() => dispatch({ type: "pause" })}
              >
                {copy.pause}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={() => setEndOpen(true)}
            >
              {copy.endSession}
            </Button>
          </div>
        </div>
      )}

      {state.step === "reflect" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">{copy.reflectTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{copy.reflectLead}</p>
          </div>
          <div className="grid gap-2">
            {(
              [
                ["completed", copy.outcomeCompleted],
                ["partial", copy.outcomePartial],
                ["blocked", copy.outcomeBlocked],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={state.reflectOutcome === key ? "default" : "outline"}
                className="min-h-11 justify-start"
                aria-pressed={state.reflectOutcome === key}
                onClick={() => dispatch({ type: "setReflect", outcome: key })}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Focus rating — appears once an outcome is selected. */}
          {state.reflectOutcome ? (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">
                  {aiCopy.focusSprint.focusRatingLabel}
                </p>
                {state.reflectRating !== null ? (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "setRating", rating: null })}
                    className="text-[0.65rem] uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    {aiCopy.focusSprint.focusRatingSkip}
                  </button>
                ) : null}
              </div>
              <div className="flex gap-1.5" role="group" aria-label={aiCopy.focusSprint.focusRatingLabel}>
                {RATING_STEPS.map((r) => (
                  <Button
                    key={r}
                    type="button"
                    size="sm"
                    variant={state.reflectRating === r ? "default" : "outline"}
                    className="min-h-9 flex-1 tabular-nums"
                    aria-pressed={state.reflectRating === r}
                    onClick={() => dispatch({ type: "setRating", rating: r })}
                  >
                    {r}
                  </Button>
                ))}
              </div>
              <p className="text-[0.65rem] text-muted-foreground">
                {aiCopy.focusSprint.focusRatingHint}
              </p>
            </div>
          ) : null}

          <Textarea
            value={state.reflectNote}
            placeholder={copy.reflectNotePlaceholder}
            onChange={(e) =>
              dispatch({
                type: "setReflect",
                outcome: state.reflectOutcome,
                note: e.target.value,
              })
            }
            rows={2}
            maxLength={BIO_LAB_REFLECT_NOTE_MAX}
            className="resize-none text-base sm:text-sm"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-11 flex-1"
              disabled={!state.reflectOutcome || saveSprintMutation.isPending}
              onClick={saveReflection}
            >
              {copy.saveReflection}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={() => dispatch({ type: "resetPick" })}
            >
              {copy.newSprint}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={endOpen} onOpenChange={setEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.endConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{copy.endConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEndOpen(false);
                dispatch({ type: "breakToReflect" });
              }}
            >
              {copy.confirmEnd}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
