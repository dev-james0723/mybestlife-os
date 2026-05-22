"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { journalEntryInputSchema } from "@/lib/journal/schema";
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
  /** Called after a successful save. */
  onSaved?: (entry: JournalEntry) => void;
  /** Fires whenever the form transitions between clean and dirty. */
  onDirtyChange?: (dirty: boolean) => void;
}

export function JournalForm({ copy, onSaved, onDirtyChange }: JournalFormProps) {
  const [form, setForm] = useState<JournalFormState>(emptyFormState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
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
  }, []);

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

  const handleSave = useCallback(async () => {
    setErrors({});

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
      return;
    }

    setSaving(true);
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

      const entry = await journalRepository.create(input);
      setSavedEntryId(entry.id);
      // Phase 2: skip the AI summary copy — Phase 3 will replace this toast.
      toast.success(copy.toastSaveSuccess);
      onSaved?.(entry);
    } catch (err) {
      toast.error(copy.toastSaveFailed);
      if (process.env.NODE_ENV !== "production") {
        console.error("[journal] save failed:", err);
      }
    } finally {
      setSaving(false);
    }
  }, [form, copy, onSaved]);

  // ----- derived helpers -------------------------------------------------

  const topicCfg = form.topic ? TOPIC_CONFIG[form.topic] : null;
  const topicLabels = form.topic ? copy.topicCopy[form.topic] : null;

  const filteredPrimaryEmotions = useMemo<readonly Emotion[]>(() => {
    if (!form.quadrant) return [];
    return EMOTION_LISTS[form.quadrant] as readonly Emotion[];
  }, [form.quadrant]);

  const isLocked = savedEntryId !== null;

  // ----- render ----------------------------------------------------------

  return (
    <div className="space-y-6" aria-busy={saving || undefined}>
      {/* Date + Topic — always visible. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium">{copy.labelDate}</Label>
          <DatePickerInput
            value={form.entryDate}
            onChange={(v) => setForm((f) => ({ ...f, entryDate: v }))}
            disabled={isLocked}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {copy.labelTopic}
            <span className="ml-1 text-destructive">{copy.requiredMark}</span>
          </Label>
          <Select
            value={form.topic || undefined}
            onValueChange={(v) => setTopic(v as Topic)}
            disabled={isLocked}
          >
            <SelectTrigger aria-invalid={!!errors.topic}>
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
              disabled={isLocked}
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
                  value={form.primaryEmotion || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, primaryEmotion: v as Emotion }))
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger aria-invalid={!!errors.primaryEmotion}>
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
                  value={form.secondaryEmotion || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, secondaryEmotion: v as Emotion }))
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger aria-invalid={!!errors.secondaryEmotion}>
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
                  value={form.target || undefined}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, target: v as Target }))
                  }
                  disabled={isLocked}
                >
                  <SelectTrigger>
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
                  disabled={isLocked}
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
                disabled={isLocked}
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
            />

            {/* Needs */}
            <NeedsChecklist
              values={form.needs}
              onChange={(v: Need[]) => setForm((f) => ({ ...f, needs: v }))}
              cardinality={topicCfg.needsCardinality}
              copy={copy}
              errorMessage={errors.needs}
            />

            {/* Next tiny step */}
            <NextTinyStepField
              value={form.nextTinyStep}
              onChange={(v) => setForm((f) => ({ ...f, nextTinyStep: v }))}
              copy={copy}
              errorMessage={errors.nextTinyStep}
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
                disabled={isLocked}
              />
            </div>

            {/* Collapsibles */}
            <CollapsibleSection title={copy.contextFactorsTitle}>
              <ContextFactorsForm
                value={form.contextFactors}
                onChange={(v) => setForm((f) => ({ ...f, contextFactors: v }))}
                copy={copy}
              />
            </CollapsibleSection>

            <CollapsibleSection title={copy.metadataTitle}>
              <MetadataForm copy={copy} />
            </CollapsibleSection>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save button — sticky-bottom on mobile, inline on desktop. */}
      <SaveBar
        copy={copy}
        saving={saving}
        saved={isLocked}
        onSave={handleSave}
        onReset={resetAll}
      />
    </div>
  );
}

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
            className="flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
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
  saved,
  onSave,
  onReset,
}: {
  copy: JournalUiCopy;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-2 flex items-center justify-end gap-2 border-t border-transparent bg-background/95 px-2 py-3 backdrop-blur",
        "sm:static sm:mx-0 sm:border-transparent sm:bg-transparent sm:p-0 sm:backdrop-blur-none",
      )}
    >
      {saved && (
        <Button type="button" variant="outline" onClick={onReset}>
          {copy.startNewEntryButton}
        </Button>
      )}
      <Button
        type="button"
        onClick={onSave}
        disabled={saving || saved}
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {copy.savingButton}
          </>
        ) : saved ? (
          copy.savedButton
        ) : (
          copy.saveButton
        )}
      </Button>
    </div>
  );
}
