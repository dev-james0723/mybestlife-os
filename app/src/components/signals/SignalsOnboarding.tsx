"use client";

import { useCallback, useMemo, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Check, Radar } from "lucide-react";

import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import {
  MAX_PURPOSES,
  MAX_TOPICS,
  MIN_TOPICS,
  PURPOSE_TOPIC_SEED,
  SIGNAL_CONSENT_KEYS,
  SIGNAL_PURPOSE_IDS,
  SIGNAL_TOPIC_IDS,
  type SignalConsentKey,
  type SignalPurposeId,
  type SignalTopicId,
} from "@/lib/signals/constants";
import type { SignalsPreferences } from "@/lib/signals/types";

import { z } from "zod";
import { useAccountDraft } from "@/hooks/use-account-draft";
import { LocalDraftStatus } from "@/components/shared/local-draft-status";
const draftSchema = z.object({ step: z.number().int().min(1).max(3), purposes: z.array(z.enum(SIGNAL_PURPOSE_IDS)).max(MAX_PURPOSES), topics: z.array(z.enum(SIGNAL_TOPIC_IDS)).max(MAX_TOPICS), consent: z.object({ useBrainContext: z.boolean(), useProjects: z.boolean(), useCalendar: z.boolean(), useTasks: z.boolean(), useLocation: z.boolean(), useReadingBehavior: z.boolean() }) });
type Props = {
  copy: SignalsUiCopy;
  onComplete: (patch: Partial<SignalsPreferences>) => boolean;
  initialPreferences: SignalsPreferences;
  onCancel?: () => void;
};

const TOTAL_STEPS = 4;

export function SignalsOnboarding({ copy, onComplete, initialPreferences, onCancel }: Props) {
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  const initialDraft: z.infer<typeof draftSchema> = { step: 1, purposes: initialPreferences.purposes.filter((value): value is SignalPurposeId => SIGNAL_PURPOSE_IDS.includes(value as SignalPurposeId)), topics: initialPreferences.followedTopics.filter((value): value is SignalTopicId => SIGNAL_TOPIC_IDS.includes(value as SignalTopicId)), consent: { useBrainContext: initialPreferences.useBrainContext, useProjects: initialPreferences.useProjects, useCalendar: initialPreferences.useCalendar, useTasks: initialPreferences.useTasks, useLocation: initialPreferences.useLocation, useReadingBehavior: initialPreferences.useReadingBehavior } };
  const { draft, setDraft, clearDraft, ready, storageError } = useAccountDraft("signals:setup", initialDraft, draftSchema);
  const { step, purposes, topics, consent } = draft;
  const setField = useCallback(<K extends keyof typeof draft>(key: K, value: SetStateAction<typeof draft[K]>) => setDraft((previous) => ({ ...previous, [key]: typeof value === "function" ? (value as (current: typeof draft[K]) => typeof draft[K])(previous[key]) : value })), [setDraft]);

  const seededTopics = useMemo(() => {
    const seed = new Set<SignalTopicId>();
    for (const p of purposes) {
      for (const t of PURPOSE_TOPIC_SEED[p]) seed.add(t);
    }
    return [...seed];
  }, [purposes]);

  const togglePurpose = (id: SignalPurposeId) => {
    setField("purposes", (prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= MAX_PURPOSES
          ? prev
          : [...prev, id],
    );
  };

  const toggleTopic = (id: SignalTopicId) => {
    setField("topics", (prev) =>
      prev.includes(id)
        ? prev.filter((t) => t !== id)
        : prev.length >= MAX_TOPICS
          ? prev
          : [...prev, id],
    );
  };

  const goNext = () => {
    if (step === 1 && topics.length === 0) {
      // Entering topics → pre-seed from chosen purposes (truthful, deterministic).
      setField("topics", seededTopics.slice(0, MAX_TOPICS));
    }
    setField("step", (s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };
  const goBack = () => setField("step", (s) => Math.max(1, s - 1));

  const finish = () => {
    const finalTopics = topics.length > 0 ? topics : seededTopics;
    const saved = onComplete({
      onboardingCompleted: true,
      purposes,
      followedTopics: finalTopics.length > 0 ? finalTopics : ["AI", "World affairs", "Technology"],
      useBrainContext: consent.useBrainContext,
      useProjects: consent.useProjects,
      useCalendar: consent.useCalendar,
      useTasks: consent.useTasks,
      useLocation: consent.useLocation,
      useReadingBehavior: consent.useReadingBehavior,
    });
    if (saved) clearDraft();
  };

  const canContinue =
    step === 0 ||
    (step === 1 && purposes.length >= 1) ||
    (step === 2 && topics.length >= MIN_TOPICS) ||
    step === 3;

  if (!ready) return <p role="status">{chinese ? "載入草稿…" : "Loading draft…"}</p>;
  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <LocalDraftStatus unavailable={storageError} />
      {onCancel && <Button variant="ghost" onClick={onCancel}>{chinese ? "返回動態，保留原有偏好" : "Return to feed with existing preferences"}</Button>}
      <GlassPanel className="calendar-specular-highlight overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Radar className="h-4 w-4" />
          </span>
          <span>{step === 1 ? copy.onboarding.purposeTitle : copy.onboarding.step(step + 1, TOTAL_STEPS)}</span>
        </div>

        {/* Progress dots */}
        <div className="mt-3 hidden gap-1.5" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary/70" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="mt-6 min-h-[280px]">
          {step === 0 && (
            <div className="space-y-3">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {copy.onboarding.promiseTitle}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {copy.onboarding.promiseBody}
              </p>
            </div>
          )}

          {step === 1 && (
            <fieldset className="space-y-4">
              <legend className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {copy.onboarding.purposeTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.purposeSubtitle} {copy.onboarding.purposePickHint(MAX_PURPOSES)}
                </p>
              </legend>
              <div className="flex flex-wrap gap-2">
                {SIGNAL_PURPOSE_IDS.map((id) => (
                  <SelectChip
                    key={id}
                    label={copy.purposeLabels[id]}
                    selected={purposes.includes(id)}
                    disabled={!purposes.includes(id) && purposes.length >= MAX_PURPOSES}
                    onClick={() => togglePurpose(id)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {copy.onboarding.selectedCount(purposes.length)}
              </p>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset className="space-y-4">
              <legend className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {copy.onboarding.topicsTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.topicsSubtitle}{" "}
                  {copy.onboarding.topicsPickHint(MIN_TOPICS, MAX_TOPICS)}
                </p>
              </legend>
              <div className="flex flex-wrap gap-2">
                {SIGNAL_TOPIC_IDS.map((id) => (
                  <SelectChip
                    key={id}
                    label={copy.topicLabels[id]}
                    selected={topics.includes(id)}
                    disabled={!topics.includes(id) && topics.length >= MAX_TOPICS}
                    onClick={() => toggleTopic(id)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {copy.onboarding.selectedCount(topics.length)}
              </p>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset className="space-y-4">
              <legend className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {copy.onboarding.consentTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {copy.onboarding.consentSubtitle}
                </p>
              </legend>
              <div className="space-y-2">
                {SIGNAL_CONSENT_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/50 bg-card/50 px-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <Checkbox
                      checked={consent[key]}
                      onCheckedChange={(checked) =>
                        setField("consent", (prev) => ({ ...prev, [key]: checked === true }))
                      }
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {copy.consentLabels[key].label}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {copy.consentLabels[key].hint}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {copy.onboarding.consentTopicOnly}
              </p>
            </fieldset>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            {step > 1 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft />
                {copy.onboarding.back}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5" onClick={finish}>
              {copy.onboarding.skip}
            </Button>
            {step < TOTAL_STEPS - 1 ? (
              <>
              {step === 1 ? <Button size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5" onClick={finish} disabled={!canContinue}>{copy.onboarding.finish}</Button> : null}
              <Button variant={step === 1 ? "outline" : "default"} size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5" onClick={goNext} disabled={!canContinue}>
                {step === 1 ? (chinese ? "更多偏好（選填）" : "More preferences (optional)") : copy.onboarding.continue}
                <ArrowRight />
              </Button></>
            ) : (
              <Button size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5" onClick={finish}>
                <Check />
                {copy.onboarding.finish}
              </Button>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function SelectChip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button data-control-variant="outline" data-selected={selected}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-40 sm:min-h-0 sm:px-3 sm:py-1.5",
        selected
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-card/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
