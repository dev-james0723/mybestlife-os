"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ImageIcon,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAppStore } from "@/stores/app-store";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  useCareerMirror,
  type SynthesizeResult,
  type BannerResult,
} from "@/hooks/use-career-mirror";
import { getCareerMirrorUiCopy } from "@/lib/i18n/career-mirror-ui";
import { getCareerSetupQuestionCopy } from "@/lib/i18n/career-mirror-questions-ui";
import {
  CAREER_SETUP_SECTIONS,
  CAREER_SETUP_QUESTIONS,
} from "@/lib/career-mirror/careerSetupQuestionBank";
import { computeMissingFields } from "@/lib/career-mirror/careerSetupMapping";
import type {
  QuestionDef,
  SectionId,
  SetupAnswer,
  SetupAnswers,
} from "@/lib/career-mirror/careerSetupTypes";
import {
  CAREER_BANNER_STYLES,
  CAREER_BANNER_STYLE_DEFAULT_LABELS,
  type CareerBannerStyle,
} from "@/lib/career-mirror/banner/career-banner-style-config";
import { BannerStylePicker } from "@/components/career-mirror/profile/BannerStylePicker";
import { MasterDocumentSelector } from "@/components/career-profile/MasterDocumentSelector";
import { getSetupProgress } from "@/lib/career-mirror/setup-progress";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WizardProgress } from "./WizardProgress";
import { WizardFooter } from "./WizardFooter";
import { SectionStep, type SectionInsightState } from "./SectionStep";
import { AutofillBanner, type AutofillSuggestion } from "./AutofillBanner";

export type CareerMirrorWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
};

/** Sections that get a post-section AI insight (skip special/portrait/visual). */
const INSIGHT_SECTIONS: ReadonlySet<SectionId> = new Set<SectionId>([
  "current-state",
  "motivation",
  "blockers",
  "ambition",
]);

type FinishState =
  | { status: "idle" }
  | { status: "working" }
  | {
      status: "done";
      synthesize: SynthesizeResult;
      banner: BannerResult | null;
    };

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * AI Career Mirror setup wizard. Renders inside a Dialog (`3xl`) on desktop and
 * a bottom-card Sheet on mobile. Walks the setup sections one screen at a time
 * (one question per screen on mobile), autosaving the draft as the user goes.
 * Special steps cover the optional portrait and the banner visual. Finishing
 * synthesises the profile, optionally generates a banner, and shows a rich
 * success summary. Closing mid-way keeps the draft (autosave + flush).
 */
export function CareerMirrorWizard({
  open,
  onOpenChange,
  onCompleted,
}: CareerMirrorWizardProps) {
  const language = useAppStore((s) => s.language);
  const ui = React.useMemo(() => getCareerMirrorUiCopy(language), [language]);
  const questionCopy = React.useMemo(
    () => getCareerSetupQuestionCopy(language),
    [language],
  );
  const isDesktop = useIsDesktop();
  const prefersReduced = useReducedMotion();

  const {
    draftAnswers,
    isLoading,
    loadError,
    retryLoad,
    isSaving,
    saveError,
    saveDraft,
    flushDraft,
    synthesize,
    autofill,
    sectionInsight,
    generateBanner,
  } = useCareerMirror();

  const [answers, setAnswers] = React.useState<SetupAnswers>({});
  const [seeded, setSeeded] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [insights, setInsights] = React.useState<
    Partial<Record<SectionId, SectionInsightState>>
  >({});
  const [portraitDataUrl, setPortraitDataUrl] = React.useState<string | null>(
    null,
  );
  const [portraitVaultId, setPortraitVaultId] = React.useState<string | null>(
    null,
  );
  const [bannerStyle, setBannerStyle] = React.useState<CareerBannerStyle>(
    CAREER_BANNER_STYLES[0],
  );
  const [closing, setClosing] = React.useState(false);
  const [allowInsights, setAllowInsights] = React.useState(false);
  const [finish, setFinish] = React.useState<FinishState>({ status: "idle" });
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Seed the local draft from the persisted answers once the dialog opens.
  React.useEffect(() => {
    if (open && !seeded && !isLoading && !loadError) {
      setAnswers(draftAnswers ?? {});
      setStepIndex(getSetupProgress(draftAnswers ?? {}).resumeSection);
      setSeeded(true);
    }
    if (!open && seeded) {
      // Reset transient UI state when closed so a re-open starts clean.
      setSeeded(false);
      setAllowInsights(false);
      setStepIndex(0);
      setFinish({ status: "idle" });
    }
  }, [open, seeded, draftAnswers, isLoading, loadError]);

  // Build the screen list: one section per screen.
  const sections = CAREER_SETUP_SECTIONS;
  const totalSteps = sections.length;
  const currentSection = sections[stepIndex];

  const questionsForSection = React.useCallback(
    (section: SectionId): QuestionDef[] =>
      CAREER_SETUP_QUESTIONS.filter((q) => q.section === section),
    [],
  );

  const setAnswer = React.useCallback(
    (questionId: string, answer: SetupAnswer) => {
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: answer };
        saveDraft(next);
        return next;
      });
    },
    [saveDraft],
  );

  const acceptAutofill = React.useCallback(
    (s: AutofillSuggestion) => {
      // Autofill targets profile fields; we keep the accepted text as a
      // free-text seed on the closest section question so it isn't lost.
      const display = Array.isArray(s.value)
        ? s.value.map(String).join(", ")
        : String(s.value ?? "");
      if (!display) return;
      setAnswers((prev) => {
        const key = `autofill:${s.field}`;
        const next: SetupAnswers = {
          ...prev,
          [key]: { value: display, freeText: display, status: "answered" },
        };
        saveDraft(next);
        return next;
      });
    },
    [saveDraft],
  );

  // Fetch a non-blocking insight when landing on an insight-bearing section.
  React.useEffect(() => {
    if (!open || !currentSection || !allowInsights) return;
    if (!INSIGHT_SECTIONS.has(currentSection)) return;
    if (insights[currentSection]) return;

    const answered = questionsForSection(currentSection).some(
      (q) => answers[q.id]?.status === "answered",
    );
    if (!answered) return;

    let cancelled = false;
    setInsights((p) => ({ ...p, [currentSection]: { status: "loading" } }));
    void sectionInsight(currentSection, answers).then((res) => {
      if (cancelled) return;
      setInsights((p) => ({
        ...p,
        [currentSection]: res.ok
          ? { status: "ready", text: res.insight }
          : { status: "error" },
      }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentSection, stepIndex, allowInsights]);

  const retryInsight = React.useCallback(
    (section: SectionId) => {
      setInsights((p) => ({ ...p, [section]: { status: "loading" } }));
      void sectionInsight(section, answers).then((res) => {
        setInsights((p) => ({
          ...p,
          [section]: res.ok
            ? { status: "ready", text: res.insight }
            : { status: "error" },
        }));
      });
    },
    [answers, sectionInsight],
  );

  const scrollToTop = React.useCallback(() => {
    scrollRef.current?.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [prefersReduced]);

  const goNext = React.useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
    scrollToTop();
  }, [totalSteps, scrollToTop]);

  const goBack = React.useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
    scrollToTop();
  }, [scrollToTop]);

  const skipStep = React.useCallback(() => {
    // Mark all questions in this section skipped, then advance.
    setAnswers((prev) => {
      const next = { ...prev };
      for (const q of questionsForSection(currentSection)) {
        if (!next[q.id]) next[q.id] = { value: null, status: "skipped" };
      }
      saveDraft(next);
      return next;
    });
    goNext();
  }, [currentSection, questionsForSection, saveDraft, goNext]);

  const saveAndExit = React.useCallback(async () => {
    if (closing || !seeded || finish.status === "working") return;
    setClosing(true);
    try {
      await flushDraft(answers);
      onOpenChange(false);
    } catch {
      // Keep the visible answers and dialog open so the user can retry.
    } finally {
      setClosing(false);
    }
  }, [answers, closing, seeded, finish.status, flushDraft, onOpenChange]);

  const handleClose = React.useCallback((next: boolean) => {
    if (next) onOpenChange(true);
    else if (!seeded || finish.status === "done") onOpenChange(false);
    else void saveAndExit();
  }, [seeded, finish.status, saveAndExit, onOpenChange]);

  const wantsBanner = answers["generate-visual"]?.value === "yes";

  const handleFinish = React.useCallback(async () => {
    setFinish({ status: "working" });
    try {
      await flushDraft(answers, "in_progress");
    } catch {
      setFinish({ status: "idle" });
      return;
    }
    const synthRes = await synthesize(answers);
    let bannerRes: BannerResult | null = null;
    if (wantsBanner) {
      bannerRes = await generateBanner(
        bannerStyle,
        portraitDataUrl ?? undefined,
      );
    }
    setFinish({ status: "done", synthesize: synthRes, banner: bannerRes });
    if (synthRes.ok) onCompleted?.();
  }, [
    answers,
    flushDraft,
    synthesize,
    wantsBanner,
    generateBanner,
    bannerStyle,
    portraitDataUrl,
    onCompleted,
  ]);

  const isLast = stepIndex === totalSteps - 1;
  const canBack = stepIndex > 0;
  const sectionQuestions = currentSection
    ? questionsForSection(currentSection)
    : [];
  const canSkip = sectionQuestions.every((q) => q.optional);

  // --- Body -----------------------------------------------------------------
  const body =
    finish.status === "done" ? (
      <SuccessSummary
        ui={ui}
        result={finish.synthesize}
        banner={finish.banner}
        wantsBanner={wantsBanner}
        onClose={() => onOpenChange(false)}
      />
    ) : (
      <SectionStep
        section={currentSection}
        questions={sectionQuestions}
        answers={answers}
        onAnswerChange={setAnswer}
        ui={ui}
        questionCopy={questionCopy}
        insight={allowInsights ? insights[currentSection] : undefined}
        onRetryInsight={() => { if (allowInsights) retryInsight(currentSection); }}
        onSkipInsight={() =>
          setInsights((p) => ({ ...p, [currentSection]: { status: "skipped" } }))
        }
        header={
          currentSection === "current-state" ? (
            <AutofillBanner ui={ui} onRun={() => autofill()} onAccept={acceptAutofill} />
          ) : undefined
        }
        footer={
          currentSection === "portrait" ? (
            <PortraitStep
              ui={ui}
              portraitDataUrl={portraitDataUrl}
              onPortrait={setPortraitDataUrl}
              vaultId={portraitVaultId}
              onVaultId={setPortraitVaultId}
            />
          ) : currentSection === "visual" && wantsBanner ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">
                {ui.banner.pickerTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {ui.banner.pickerSubtitle}
              </p>
              <BannerStylePicker
                value={bannerStyle}
                onChange={setBannerStyle}
                labels={bannerLabels}
              />
            </div>
          ) : undefined
        }
      />
    );

  const showFooter = finish.status !== "done";
  const finishing = finish.status === "working" || closing || !seeded;
  const footer = showFooter ? (
    <WizardFooter
      ui={ui}
      canBack={canBack}
      canSkip={canSkip}
      isLast={isLast}
      finishing={finishing}
      onBack={goBack}
      onSkip={skipStep}
      onNext={goNext}
      onSaveAndExit={saveAndExit}
      onFinish={handleFinish}
    />
  ) : null;

  const inner = (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-x-hidden">
      {finish.status !== "done" ? (
        <WizardProgress
          current={stepIndex + 1}
          total={totalSteps}
          progress={getSetupProgress(answers)}
          ui={ui}
          className="pr-12"
        />
      ) : null}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-4"
      >
        {!seeded && loadError ? <div role="alert" className="space-y-3"><p>{language.startsWith("zh") ? "未能載入已保存的答案。請重試以繼續。" : "Could not load your saved answers. Retry to continue."}</p><Button variant="outline" onClick={retryLoad}>{language.startsWith("zh") ? "重試" : "Retry"}</Button></div> : !seeded ? <p role="status">{language.startsWith("zh") ? "載入已保存的答案…" : "Loading saved answers…"}</p> : body}
      </div>
      {finish.status === "idle" && seeded ? <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={allowInsights} onChange={(event) => setAllowInsights(event.target.checked)} className="mt-0.5" />
        {language.startsWith("zh") ? "選用 AI 提示：將目前問卷答案傳送至 AI 服務作分析。關閉仍可保存。" : "Optional AI insights: send these questionnaire answers to the AI service for suggestions. You can save with this off."}
      </label> : null}
      {saveError ? <p role="alert" className="text-sm text-destructive">{language.startsWith("zh") ? "未能保存。答案仍在此處，請重試儲存後離開。" : "Could not save. Your answers are still here; retry Save & exit."}</p> : isSaving ? <p role="status" className="text-xs text-muted-foreground">{language.startsWith("zh") ? "儲存中…" : "Saving…"}</p> : null}
      {footer}
    </div>
  );

  if (!isDesktop) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side="bottom-card"
          className="data-[side=bottom-card]:left-3 data-[side=bottom-card]:right-3 h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] overflow-hidden p-4 pt-5"
        >
          <SheetTitle className="sr-only">{ui.hero.title}</SheetTitle>
          <SheetDescription className="sr-only">
            {ui.hero.subtitle}
          </SheetDescription>
          {inner}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="3xl" className="flex h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] flex-col overflow-hidden p-5">
        <DialogTitle className="sr-only">{ui.hero.title}</DialogTitle>
        <DialogDescription className="sr-only">{ui.hero.subtitle}</DialogDescription>
        {inner}
      </DialogContent>
    </Dialog>
  );
}

const bannerLabels: Record<
  CareerBannerStyle,
  { name: string; description?: string }
> = CAREER_BANNER_STYLES.reduce(
  (acc, style) => {
    acc[style] = { name: CAREER_BANNER_STYLE_DEFAULT_LABELS[style] };
    return acc;
  },
  {} as Record<CareerBannerStyle, { name: string; description?: string }>,
);

type PortraitStepProps = {
  ui: ReturnType<typeof getCareerMirrorUiCopy>;
  portraitDataUrl: string | null;
  onPortrait: (url: string | null) => void;
  vaultId: string | null;
  onVaultId: (id: string | null) => void;
};

function PortraitStep({
  ui,
  portraitDataUrl,
  onPortrait,
  vaultId,
  onVaultId,
}: PortraitStepProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      onPortrait(url);
    } catch {
      onPortrait(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          {portraitDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portraitDataUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload />
            {ui.controls.typeMyOwn}
          </Button>
          {portraitDataUrl ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPortrait(null)}
            >
              {ui.banner.skip}
            </Button>
          ) : null}
        </div>
      </div>
      <MasterDocumentSelector
        label={ui.banner.pickerTitle}
        selectedId={vaultId}
        onSelect={onVaultId}
      />
    </div>
  );
}

type SuccessSummaryProps = {
  ui: ReturnType<typeof getCareerMirrorUiCopy>;
  result: SynthesizeResult;
  banner: BannerResult | null;
  wantsBanner: boolean;
  onClose: () => void;
};

function SuccessSummary({
  ui,
  result,
  banner,
  wantsBanner,
  onClose,
}: SuccessSummaryProps) {
  if (!result.ok) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{ui.states.error}</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          {ui.states.retry}
        </Button>
      </div>
    );
  }

  const profile = result.profile;
  const diagnosis = profile.ai_diagnosis?.narrative ?? null;
  const primaryAction = profile.ai_next_actions?.[0] ?? null;
  const missing = computeMissingFields(profile as unknown as Record<string, unknown>);

  const bannerLabel = wantsBanner
    ? banner && banner.ok
      ? banner.status === "completed" || banner.status === "fallback"
        ? ui.banner.useThis
        : ui.banner.generating
      : ui.states.error
    : ui.banner.skip;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <CheckCircle2 className="size-9 text-[var(--accent-pink)]" />
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {ui.states.successTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {ui.states.successDescription}
        </p>
      </div>

      {profile.ai_summary ? (
        <SummaryBlock title={ui.aiSuggestion.badge}>
          <p className="text-sm leading-snug text-foreground">
            {profile.ai_summary}
          </p>
        </SummaryBlock>
      ) : null}

      {diagnosis ? (
        <SummaryBlock title={ui.panels.realityCheck}>
          <p className="text-sm leading-snug text-foreground">{diagnosis}</p>
        </SummaryBlock>
      ) : null}

      {primaryAction ? (
        <SummaryBlock title={ui.completion.keepGoing}>
          <p className="text-sm font-medium text-foreground">
            {primaryAction.title}
          </p>
          {primaryAction.why ? (
            <p className="text-xs text-muted-foreground">{primaryAction.why}</p>
          ) : null}
        </SummaryBlock>
      ) : null}

      <SummaryBlock title={ui.completion.missingTitle}>
        {missing.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {missing.slice(0, 8).join(", ")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {ui.completion.missingEmpty}
          </p>
        )}
      </SummaryBlock>

      <SummaryBlock title={ui.banner.pickerTitle}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5" />
          {bannerLabel}
        </div>
        {banner && banner.ok && banner.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.banner_url}
            alt=""
            className="mt-2 aspect-video w-full rounded-lg object-cover"
          />
        ) : null}
      </SummaryBlock>

      <Button variant="gradient-pink" onClick={onClose}>
        <Sparkles />
        {ui.states.saved}
      </Button>
    </div>
  );
}

function SummaryBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border p-3.5 [background:var(--surface-glass)] [border-color:var(--border-glass)] [box-shadow:var(--shadow-glass)]">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      {children}
    </div>
  );
}

export default CareerMirrorWizard;
