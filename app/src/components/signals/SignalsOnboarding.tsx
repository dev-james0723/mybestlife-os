"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Radar } from "lucide-react";

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

type Props = {
  copy: SignalsUiCopy;
  onComplete: (patch: Partial<SignalsPreferences>) => void;
};

const TOTAL_STEPS = 4;

export function SignalsOnboarding({ copy, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [purposes, setPurposes] = useState<SignalPurposeId[]>([]);
  const [topics, setTopics] = useState<SignalTopicId[]>([]);
  const [consent, setConsent] = useState<Record<SignalConsentKey, boolean>>({
    useBrainContext: false,
    useProjects: false,
    useCalendar: false,
    useTasks: false,
    useLocation: false,
    useReadingBehavior: false,
  });

  const seededTopics = useMemo(() => {
    const seed = new Set<SignalTopicId>();
    for (const p of purposes) {
      for (const t of PURPOSE_TOPIC_SEED[p]) seed.add(t);
    }
    return [...seed];
  }, [purposes]);

  const togglePurpose = (id: SignalPurposeId) => {
    setPurposes((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= MAX_PURPOSES
          ? prev
          : [...prev, id],
    );
  };

  const toggleTopic = (id: SignalTopicId) => {
    setTopics((prev) =>
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
      setTopics(seededTopics.slice(0, MAX_TOPICS));
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const finish = () => {
    const finalTopics = topics.length > 0 ? topics : seededTopics;
    onComplete({
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
  };

  const canContinue =
    step === 0 ||
    (step === 1 && purposes.length >= 1) ||
    (step === 2 && topics.length >= MIN_TOPICS) ||
    step === 3;

  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-10">
      <GlassPanel className="calendar-specular-highlight overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Radar className="h-4 w-4" />
          </span>
          <span>{copy.onboarding.step(step + 1, TOTAL_STEPS)}</span>
        </div>

        {/* Progress dots */}
        <div className="mt-3 flex gap-1.5" aria-hidden>
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
                        setConsent((prev) => ({ ...prev, [key]: checked === true }))
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
        <div className="mt-6 flex items-center justify-between gap-2">
          <div>
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft />
                {copy.onboarding.back}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5" onClick={finish}>
              {copy.onboarding.skip}
            </Button>
            {step < TOTAL_STEPS - 1 ? (
              <Button size="sm" className="h-11 px-4 sm:h-7 sm:px-2.5" onClick={goNext} disabled={!canContinue}>
                {copy.onboarding.continue}
                <ArrowRight />
              </Button>
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
    <button
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
