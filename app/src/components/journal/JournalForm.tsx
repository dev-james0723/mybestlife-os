"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  ALL_EMOTIONS,
  EMOTION_LISTS,
  TARGETS,
  TOPICS,
  type Emotion,
  type Need,
  type Quadrant,
  type Target,
  type Topic,
} from "@/lib/journal/constants";
import { TOPIC_CONFIG } from "@/lib/journal/topic-config";
import {
  aiOutputSchema,
  journalEntryInputSchema,
} from "@/lib/journal/schema";
import {
  emptyFormState,
  isFormDirty,
  type JournalFormState,
} from "@/lib/journal/form-state";
import type { JournalUiCopy } from "@/lib/i18n/journal-ui";
import { type JournalEntry } from "@/types/database";
import {
  journalRepository,
  type CreateJournalEntryInput,
} from "@/lib/repositories/journal";

import { BulletsField } from "./BulletsField";
import { ContextFactorsForm } from "./ContextFactorsForm";
import { EmotionPicker } from "./EmotionPicker";
import { JournalSlider } from "./JournalSlider";
import { MetadataForm } from "./MetadataForm";
import { NeedsChecklist } from "./NeedsChecklist";
import { NextTinyStepField } from "./NextTinyStepField";
import { TopicExtrasForm } from "./TopicExtrasForm";

type FieldErrors = Partial<Record<string, string>>;

interface JournalFormProps {
  copy: JournalUiCopy;
  /** Called after a successful save (before AI summary). */
  onSaved?: (entry: JournalEntry) => void;
  /** Fires whenever the form transitions between clean and dirty. */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Called after the AI summary has been generated and persisted back onto
   * the row. The entry passed here has `aiOutput` populated. Fires once per
   * save cycle. If the summary call fails, this is NOT called.
   */
  onSummaryReady?: (entry: JournalEntry) => void;
  /** Called when the entry saved but its AI summary could not be generated. */
  onSummaryFailed?: () => void;
  /** Called when the user clicks "Start new entry" after a save. */
  onReset?: () => void;
  /** Prevents resetting while a generated media request is still in flight. */
  resetDisabled?: boolean;
}

export interface JournalFormHandle {
  /**
   * Imperatively trigger a save (and its AI summary attempt). Returns the
   * inserted entry or `null` if validation failed / a save is already running
   * / the user is already in the saved-locked state.
   */
  saveNow: () => Promise<JournalEntry | null>;
  /** True when the form has been saved and is currently locked. */
  isSaved: () => boolean;
}

export const JournalForm = forwardRef<JournalFormHandle, JournalFormProps>(
  function JournalForm(
    {
      copy,
      onSaved,
      onDirtyChange,
      onSummaryReady,
      onSummaryFailed,
      onReset,
      resetDisabled = false,
    },
    ref,
  ) {
  const [form, setForm] = useState<JournalFormState>(emptyFormState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const saveGateRef = useRef(false);
  const reduceMotion = useReducedMotion();

  const dirty = savedEntryId === null && isFormDirty(form);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // Section reveal flags derived from selections.
  const showEmotionPicker = form.topic !== "";
  const showRestOfForm = form.quadrant !== "";

  const resetAll = useCallback(() => {
    setForm(emptyFormState());
    setErrors({});
    setSavedEntryId(null);
    onReset?.();
  }, [onReset]);

  // ----- setters ---------------------------------------------------------

  const setTopic = (next: Topic | "") => {
    setForm((f) => ({
      ...f,
      topic: next,
      // Reset extras and self-story expectations when topic changes.
      topicExtras: {},
      // If switching out of Quick Reset, allow up to 2 needs; vice versa,
      // trim down to 1 so the field stays valid.
      needs:
        next && TOPIC_CONFIG[next].needsCardinality === "exactly-one"
          ? f.needs.slice(0, 1)
          : f.needs,
    }));
    setErrors((e) => ({ ...e, topic: undefined, topicExtras: undefined }));
  };

  const setQuadrant = (q: Quadrant) => {
    setForm((f) => ({
      ...f,
      quadrant: q,
      // Spec: changing quadrant resets primaryEmotion.
      primaryEmotion: "",
    }));
    setErrors((e) => ({ ...e, quadrant: undefined, primaryEmotion: undefined }));
  };

  // ----- save ------------------------------------------------------------

  const handleSave = useCallback(async (): Promise<JournalEntry | null> => {
    setErrors({});

    if (savedEntryId !== null || saveGateRef.current) return null;
    saveGateRef.current = true;

    // Normalize bullets / strings before validation.
    const trimmedBullets = form.bullets
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const candidate = {
      entryDate: form.entryDate,
      topic: form.topic,
      quadrant: form.quadrant,
      primaryEmotion: form.primaryEmotion,
      secondaryEmotion: form.secondaryEmotion || null,
      intensity: form.intensity,
      target: form.target || null,
      bullets: { items: trimmedBullets },
      selfStory: form.selfStory.trim() || null,
      needs: form.needs,
      nextTinyStep: form.nextTinyStep.trim(),
      appreciation: form.appreciation.trim() || null,
      topicExtras:
        Object.keys(form.topicExtras).length > 0 ? form.topicExtras : null,
      contextFactors:
        Object.keys(form.contextFactors).length > 0 ? form.contextFactors : null,
      metadata:
        form.projectIds.length > 0 || form.taskIds.length > 0
          ? { projectIds: form.projectIds, taskIds: form.taskIds }
          : null,
    };

    const parsed = journalEntryInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "_");
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      const firstMessage = parsed.error.issues[0]?.message ?? copy.toastSaveFailed;
      toast.error(firstMessage);
      saveGateRef.current = false;
      return null;
    }

    setSaving(true);
    let inserted: JournalEntry | null = null;
    try {
      const input: CreateJournalEntryInput = {
        entryDate: parsed.data.entryDate,
        topic: parsed.data.topic,
        quadrant: parsed.data.quadrant,
        primaryEmotion: parsed.data.primaryEmotion,
        secondaryEmotion: parsed.data.secondaryEmotion ?? null,
        intensity: parsed.data.intensity,
        target: parsed.data.target ?? null,
        bullets: parsed.data.bullets,
        selfStory: parsed.data.selfStory ?? null,
        needs: { items: parsed.data.needs },
        nextTinyStep: parsed.data.nextTinyStep,
        appreciation: parsed.data.appreciation ?? null,
        topicExtras: parsed.data.topicExtras ?? null,
        contextFactors: parsed.data.contextFactors ?? null,
        projectIds: parsed.data.metadata?.projectIds ?? [],
        taskIds: parsed.data.metadata?.taskIds ?? [],
      };

      inserted = await journalRepository.create(input);
      setSavedEntryId(inserted.id);
      onSaved?.(inserted);
    } catch (err) {
      toast.error(copy.toastSaveFailed);
      if (process.env.NODE_ENV !== "production") {
        console.error("[journal] save failed:", err);
      }
      setSaving(false);
      saveGateRef.current = false;
      return null;
    }

    // Insert succeeded — now generate the AI summary in the background.
    setGeneratingSummary(true);
    try {
      const res = await fetch("/api/journal/summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, entryId: inserted.id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        aiOutput?: unknown;
        error?: string;
      };
      const parsedAiOutput = aiOutputSchema.safeParse(body.aiOutput);
      if (!res.ok || !parsedAiOutput.success) {
        onSummaryFailed?.();
        toast.warning(copy.pastSummaryFailed);
      } else {
        const withAi: JournalEntry = {
          ...inserted,
          aiOutput: parsedAiOutput.data,
        };
        toast.success(copy.toastSaveSuccess);
        onSummaryReady?.(withAi);
      }
    } catch (err) {
      onSummaryFailed?.();
      toast.warning(copy.pastSummaryFailed);
      if (process.env.NODE_ENV !== "production") {
        console.error("[journal] summary fetch failed:", err);
      }
    } finally {
      setGeneratingSummary(false);
      setSaving(false);
      saveGateRef.current = false;
    }

    return inserted;
  }, [form, copy, onSaved, onSummaryReady, onSummaryFailed, savedEntryId]);

  useImperativeHandle(
    ref,
    () => ({
      saveNow: handleSave,
      isSaved: () => savedEntryId !== null,
    }),
    [handleSave, savedEntryId],
  );

  // ----- derived helpers -------------------------------------------------

  const topicCfg = form.topic ? TOPIC_CONFIG[form.topic] : null;
  const topicLabels = form.topic ? copy.topicCopy[form.topic] : null;

  const filteredPrimaryEmotions = useMemo<readonly Emotion[]>(() => {
    if (!form.quadrant) return [];
    return EMOTION_LISTS[form.quadrant] as readonly Emotion[];
  }, [form.quadrant]);

  const isLocked = savedEntryId !== null;
  const fieldsDisabled = isLocked || saving;

  // ----- render ----------------------------------------------------------

  return (
    <form
      className="space-y-6 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:border-border/75 [&_[data-slot=input]]:bg-card/60 [&_[data-slot=textarea]]:rounded-xl [&_[data-slot=textarea]]:border-border/75 [&_[data-slot=textarea]]:bg-card/60 dark:[&_[data-slot=input]]:border-border/75 dark:[&_[data-slot=input]]:bg-card/60 dark:[&_[data-slot=textarea]]:border-border/75 dark:[&_[data-slot=textarea]]:bg-card/60"
      aria-busy={saving || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
    >
      {/* Date + Topic — always visible. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{copy.labelDate}</Label>
          <DatePickerInput
            value={form.entryDate}
            onChange={(v) => setForm((f) => ({ ...f, entryDate: v }))}
            disabled={fieldsDisabled}
            className="border-border/75 bg-card/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] dark:border-border/75 dark:bg-card/60"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {copy.labelTopic}
            <span className="ml-1 text-destructive">{copy.requiredMark}</span>
          </Label>
          <Select
            value={form.topic || null}
            onValueChange={(v) => setTopic(v as Topic)}
            disabled={fieldsDisabled}
          >
            <SelectTrigger
              aria-invalid={!!errors.topic}
              className="w-full rounded-xl border-border/75 bg-card/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] dark:border-border/75 dark:bg-card/60"
            >
              <SelectValue placeholder={copy.topicPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((t) => (
                <SelectItem key={t} value={t}>
                  {copy.topicName[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.topic && (
            <p role="alert" className="text-xs text-destructive">
              {errors.topic}
            </p>
          )}
        </div>
      </div>

      {/* Emotion picker — after topic chosen. */}
      <AnimatePresence initial={false}>
        {showEmotionPicker && (
          <motion.section
            key="emotion-picker"
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            <Label className="text-sm font-medium">
              {copy.labelEmotionPicker}
              <span className="ml-1 text-destructive">{copy.requiredMark}</span>
            </Label>
            <EmotionPicker
              value={form.quadrant}
              onChange={setQuadrant}
              copy={copy}
              disabled={fieldsDisabled}
            />
          </motion.section>
        )}
      </AnimatePresence>

      {/* Rest of the form — after quadrant chosen. */}
      <AnimatePresence initial={false}>
        {showRestOfForm && topicCfg && topicLabels && (
          <motion.div
            key="form-body"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {/* Emotion + target + intensity */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {copy.labelPrimaryEmotion}
                  <span className="ml-1 text-destructive">{copy.requiredMark}</span>
                </Label>
                <Select
                  value={form.primaryEmotion || null}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, primaryEmotion: v as Emotion }))
                  }
                  disabled={fieldsDisabled}
                >
                  <SelectTrigger
                    aria-invalid={!!errors.primaryEmotion}
                    className="w-full rounded-xl border-border/75 bg-card/60 dark:border-border/75 dark:bg-card/60"
                  >
                    <SelectValue placeholder={copy.primaryEmotionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPrimaryEmotions.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.primaryEmotion && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.primaryEmotion}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {copy.labelSecondaryEmotion}
                </Label>
                <Select
                  value={form.secondaryEmotion || null}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, secondaryEmotion: v as Emotion }))
                  }
                  disabled={fieldsDisabled}
                >
                  <SelectTrigger
                    aria-invalid={!!errors.secondaryEmotion}
                    className="w-full rounded-xl border-border/75 bg-card/60 dark:border-border/75 dark:bg-card/60"
                  >
                    <SelectValue placeholder={copy.primaryEmotionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_EMOTIONS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.secondaryEmotion && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.secondaryEmotion}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">{copy.labelTarget}</Label>
                <Select
                  value={form.target || null}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, target: v as Target }))
                  }
                  disabled={fieldsDisabled}
                >
                  <SelectTrigger className="w-full rounded-xl border-border/75 bg-card/60 dark:border-border/75 dark:bg-card/60">
                    <SelectValue placeholder={copy.targetPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGETS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {copy.targetName[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {copy.labelIntensity}
                  <span className="ml-1 text-destructive">{copy.requiredMark}</span>
                </Label>
                <JournalSlider
                  label={copy.labelIntensity}
                  value={form.intensity}
                  onChange={(n) => setForm((f) => ({ ...f, intensity: n }))}
                  min={1}
                  max={10}
                  valueSuffix="/10"
                  disabled={fieldsDisabled}
                />
              </div>
            </div>

            {/* Bullets */}
            <BulletsField
              label={topicLabels.bulletLabel}
              required
              values={form.bullets}
              onChange={(v) => setForm((f) => ({ ...f, bullets: v }))}
              copy={copy}
              errorMessage={errors.bullets}
              disabled={fieldsDisabled}
            />

            {/* Self story */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {topicLabels.selfStoryLabel}
                {topicCfg.selfStoryRequired && (
                  <span className="ml-1 text-destructive">{copy.requiredMark}</span>
                )}
              </Label>
              <Textarea
                value={form.selfStory}
                onChange={(e) =>
                  setForm((f) => ({ ...f, selfStory: e.target.value }))
                }
                rows={3}
                disabled={fieldsDisabled}
                aria-invalid={!!errors.selfStory}
              />
              {errors.selfStory && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.selfStory}
                </p>
              )}
            </div>

            {/* Topic extras */}
            <TopicExtrasForm
              topic={form.topic as Topic}
              values={form.topicExtras}
              onChange={(v) => setForm((f) => ({ ...f, topicExtras: v }))}
              copy={copy}
              disabled={fieldsDisabled}
            />

            {/* Needs */}
            <NeedsChecklist
              values={form.needs}
              onChange={(v: Need[]) => setForm((f) => ({ ...f, needs: v }))}
              cardinality={topicCfg.needsCardinality}
              copy={copy}
              errorMessage={errors.needs}
              disabled={fieldsDisabled}
            />

            {/* Next tiny step */}
            <NextTinyStepField
              value={form.nextTinyStep}
              onChange={(v) => setForm((f) => ({ ...f, nextTinyStep: v }))}
              copy={copy}
              errorMessage={errors.nextTinyStep}
              disabled={fieldsDisabled}
            />

            {/* Appreciation */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{copy.labelAppreciation}</Label>
              <Input
                value={form.appreciation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, appreciation: e.target.value }))
                }
                placeholder={copy.appreciationPlaceholder}
                disabled={fieldsDisabled}
              />
            </div>

            {/* Collapsibles */}
            <CollapsibleSection title={copy.contextFactorsTitle}>
              <ContextFactorsForm
                value={form.contextFactors}
                onChange={(v) => setForm((f) => ({ ...f, contextFactors: v }))}
                copy={copy}
                disabled={fieldsDisabled}
              />
            </CollapsibleSection>

            <CollapsibleSection title={copy.metadataTitle}>
              <MetadataForm copy={copy} />
            </CollapsibleSection>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The action appears once the progressive form is ready to complete. */}
      {(showRestOfForm || isLocked) && (
        <SaveBar
          copy={copy}
          saving={saving}
          generatingSummary={generatingSummary}
          saved={isLocked}
          resetDisabled={resetDisabled}
          onSave={handleSave}
          onReset={resetAll}
        />
      )}
    </form>
  );
});

function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between rounded-xl border border-border/75 bg-card/60 px-3 py-2 text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] transition-colors hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "size-4 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function SaveBar({
  copy,
  saving,
  generatingSummary,
  saved,
  resetDisabled,
  onSave,
  onReset,
}: {
  copy: JournalUiCopy;
  saving: boolean;
  generatingSummary: boolean;
  saved: boolean;
  resetDisabled: boolean;
  onSave: () => Promise<JournalEntry | null>;
  onReset: () => void;
}) {
  const statusMessage = generatingSummary
    ? copy.savingSummaryButton
    : saving
      ? copy.savingButton
      : saved
        ? copy.savedButton
        : "";

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-end">
      {/* Polite live region announces save / summary progress to AT. */}
      <span className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </span>

      {saved ? (
        <>
          <div className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/45 px-3 text-sm font-medium text-muted-foreground sm:min-h-9">
            {generatingSummary ? (
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            ) : (
              <CheckCircle2 className="size-4 text-primary" aria-hidden />
            )}
            {generatingSummary ? copy.savingSummaryButton : copy.savedButton}
          </div>
          <OSPrimaryAction
            type="button"
            onClick={onReset}
            disabled={generatingSummary || resetDisabled}
            size="lg"
            className="w-full sm:w-auto"
          >
            {copy.startNewEntryButton}
          </OSPrimaryAction>
        </>
      ) : (
        <OSPrimaryAction
          type="submit"
          onClick={() => void onSave()}
          disabled={saving}
          size="lg"
          className="w-full sm:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              {copy.savingButton}
            </>
          ) : (
            copy.saveButton
          )}
        </OSPrimaryAction>
      )}
    </div>
  );
}
