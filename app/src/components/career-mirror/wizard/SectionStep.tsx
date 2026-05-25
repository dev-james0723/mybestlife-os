"use client";

import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QuestionRenderer } from "./QuestionRenderer";
import type {
  QuestionDef,
  SectionId,
  SetupAnswer,
  SetupAnswers,
} from "@/lib/career-mirror/careerSetupTypes";
import type { CareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import type { CareerSetupQuestionCopy } from "@/lib/i18n/career-mirror-questions-ui";

export type SectionInsightState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; text: string }
  | { status: "error" }
  | { status: "skipped" };

export type SectionStepProps = {
  section: SectionId;
  /** Questions to show on this screen (the whole section, or one on mobile). */
  questions: QuestionDef[];
  answers: SetupAnswers;
  onAnswerChange: (questionId: string, answer: SetupAnswer) => void;
  ui: CareerMirrorUiCopy;
  questionCopy: CareerSetupQuestionCopy;
  /** Post-section AI insight slot (non-blocking). */
  insight?: SectionInsightState;
  onRetryInsight?: () => void;
  onSkipInsight?: () => void;
  /** Optional extra content rendered above the questions (e.g. autofill). */
  header?: React.ReactNode;
  /** Optional extra content rendered below the questions (e.g. portrait/banner). */
  footer?: React.ReactNode;
};

/**
 * Renders a single section's heading, its question(s), and a non-blocking AI
 * insight card. Each question auto-scrolls into the centre of the scroll
 * container on focus so the mobile keyboard never covers the active input.
 */
export function SectionStep({
  section,
  questions,
  answers,
  onAnswerChange,
  ui,
  questionCopy,
  insight,
  onRetryInsight,
  onSkipInsight,
  header,
  footer,
}: SectionStepProps) {
  const sectionCopy = questionCopy.sections[section];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {sectionCopy?.title}
        </h2>
        {sectionCopy?.subtitle ? (
          <p className="text-sm text-muted-foreground">{sectionCopy.subtitle}</p>
        ) : null}
      </header>

      {header}

      <div className="flex flex-col gap-6">
        {questions.map((question) => {
          const copy = questionCopy.questions[question.id];
          return (
            <QuestionField
              key={question.id}
              prompt={copy?.prompt ?? question.id}
              helper={copy?.helper}
            >
              <QuestionRenderer
                question={question}
                answer={answers[question.id]}
                onChange={(a) => onAnswerChange(question.id, a)}
                ui={ui}
                questionCopy={questionCopy}
              />
            </QuestionField>
          );
        })}
      </div>

      {footer}

      {insight && insight.status !== "idle" && insight.status !== "skipped" ? (
        <InsightCard
          ui={ui}
          state={insight}
          onRetry={onRetryInsight}
          onSkip={onSkipInsight}
        />
      ) : null}
    </div>
  );
}

type QuestionFieldProps = {
  prompt: string;
  helper?: string;
  children: React.ReactNode;
};

function QuestionField({ prompt, helper, children }: QuestionFieldProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  // Keep the active input centred so the mobile keyboard can't cover it.
  const handleFocus = React.useCallback(() => {
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={ref}
      onFocusCapture={handleFocus}
      className="flex flex-col gap-2.5 scroll-mt-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{prompt}</p>
        {helper ? (
          <p className="text-xs text-muted-foreground">{helper}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

type InsightCardProps = {
  ui: CareerMirrorUiCopy;
  state: SectionInsightState;
  onRetry?: () => void;
  onSkip?: () => void;
};

function InsightCard({ ui, state, onRetry, onSkip }: InsightCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-2xl border p-3.5 [background:var(--surface-glass)] [border-color:var(--border-glass)] [box-shadow:var(--shadow-glass)]",
      )}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-pink)]/12 text-[var(--accent-pink)]">
          <Sparkles className="size-3.5" />
        </span>
        <span className="text-xs font-semibold text-foreground">
          {ui.aiSuggestion.badge}
        </span>
      </div>

      {state.status === "loading" ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          {ui.states.loading}
        </div>
      ) : null}

      {state.status === "ready" ? (
        <p className="text-sm leading-snug text-foreground">{state.text}</p>
      ) : null}

      {state.status === "error" ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{ui.states.error}</span>
          <div className="flex items-center gap-1">
            {onRetry ? (
              <Button variant="ghost" size="sm" onClick={onRetry}>
                {ui.states.retry}
              </Button>
            ) : null}
            {onSkip ? (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                {ui.buttons.skip}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SectionStep;
