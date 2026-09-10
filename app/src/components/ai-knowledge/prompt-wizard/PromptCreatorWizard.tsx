"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { usePromptStore } from "@/stores/prompt-store";
import {
  PROMPT_TOP_CATEGORIES,
  type PromptCreatorWizardState,
  type PromptTopCategory,
  type PromptVariable,
  type PromptWizardStepId,
} from "@/types/prompt";
import { cn } from "@/lib/utils";
import { useAccountDraft } from "@/hooks/use-account-draft";
import { promptWizardDraftSchema } from "@/lib/form-draft-schemas";
import { LocalDraftStatus } from "@/components/shared/local-draft-status";
import { z } from "zod";
import {
  reconcilePromptVariables,
  type PromptWizardSynthesisInput,
} from "@/lib/ai/prompt-wizard-synthesize";

const QUESTION_STEPS = [
  "goal",
  "context",
  "output_format",
] as const satisfies readonly PromptWizardStepId[];

const REVIEW_INDEX = QUESTION_STEPS.length;

const TONE_VALUES = ["clear", "concise", "warm", "expert"] as const;

function createInitialWizardState(): PromptCreatorWizardState {
  return {
    stepId: "goal",
    goal: "",
    expertRole: "",
    context: "",
    outputFormat: "",
    toneStyle: [],
    variables: [],
    guardrails: "",
    examples: [],
    draftId: null,
    synthesizedBody: null,
    updatedAt: new Date().toISOString(),
  };
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 24);
}

export type PromptCreatorWizardProps = {
  variant?: "page" | "embedded";
  onCancel?: () => void;
  onSuccess?: () => void;
};

export function PromptCreatorWizard({
  variant = "page",
  onCancel,
  onSuccess,
}: PromptCreatorWizardProps = {}) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const w = ui.createWizard;
  const pathname = usePathname();
  const router = useRouter();
  const locale = useMemo(() => pathname.split("/")[1] || "en", [pathname]);
  const backHref = `/${locale}/ai-knowledge`;

  const createUserPrompt = usePromptStore((s) => s.createUserPrompt);

  const initialDraft: z.infer<typeof promptWizardDraftSchema> = {
    operationId: null,
    stepIndex: 0,
    wizard: createInitialWizardState(),
    editTitle: "",
    editDescription: "",
    editBody: "",
    editTags: "",
    editCategory: "life_personal_growth",
    synthesisVariables: null,
  };
  const { draft, setDraft, clearDraft, ready, storageError } = useAccountDraft(
    "prompt:wizard:v2",
    initialDraft,
    promptWizardDraftSchema,
  );
  const {
    stepIndex: storedStepIndex,
    wizard,
    editTitle,
    editDescription,
    editBody,
    editTags,
    editCategory,
    synthesisVariables,
  } = draft;
  const operationId = useRef<string | null>(null);
  const embeddedScrollRef = useRef<HTMLDivElement | null>(null);
  const setDraftField = useCallback(
    <K extends keyof typeof draft>(
      key: K,
      value: SetStateAction<(typeof draft)[K]>,
    ) =>
      setDraft((previous) => ({
        ...previous,
        [key]:
          typeof value === "function"
            ? (value as (current: (typeof draft)[K]) => (typeof draft)[K])(
                previous[key],
              )
            : value,
      })),
    [setDraft],
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stepIndex = Math.min(storedStepIndex, REVIEW_INDEX);
  const currentStepId =
    QUESTION_STEPS[Math.min(stepIndex, REVIEW_INDEX - 1)] ?? "goal";
  const displayStep = Math.min(stepIndex + 1, REVIEW_INDEX);
  const displayTotal = REVIEW_INDEX;

  const setField = useCallback(
    <K extends keyof PromptCreatorWizardState>(
      key: K,
      value: PromptCreatorWizardState[K],
    ) => {
      setDraftField("wizard", (prev) => ({
        ...prev,
        [key]: value,
        updatedAt: new Date().toISOString(),
      }));
    },
    [setDraftField],
  );

  const goStep = (stepIndex: number) =>
    setDraft((previous) => ({
      ...previous,
      stepIndex,
      wizard: {
        ...previous.wizard,
        stepId: QUESTION_STEPS[stepIndex] ?? previous.wizard.stepId,
      },
    }));

  const canAdvance = useMemo(() => {
    if (stepIndex >= REVIEW_INDEX) return true;
    const id = QUESTION_STEPS[stepIndex];
    if (id === "goal") return wizard.goal.trim().length >= 3;
    return true;
  }, [stepIndex, wizard.goal]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const payload: PromptWizardSynthesisInput = {
        goalOrRoughPrompt: wizard.goal,
        context: wizard.context,
        outputFormat: wizard.outputFormat,
        toneStyle: [...wizard.toneStyle],
      };
      const res = await fetch("/api/ai/knowledge/prompt-wizard/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: language, wizard: payload }),
      });
      const data = (await res.json()) as {
        result?: {
          title: string;
          description: string;
          body: string;
          variables: PromptVariable[];
          tags: string[];
          top_category: PromptTopCategory;
        };
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        toast.error(data.message ?? ui.toast.wizardSynthesisFailed);
        return;
      }
      if (!data.result) {
        toast.error(ui.toast.wizardSynthesisFailed);
        return;
      }
      setDraft((previous) => ({
        ...previous,
        stepIndex: REVIEW_INDEX,
        wizard: {
          ...previous.wizard,
          stepId: "output_format",
          synthesizedBody: data.result!.body,
          updatedAt: new Date().toISOString(),
        },
        editTitle: data.result!.title,
        editDescription: data.result!.description,
        editBody: data.result!.body,
        editTags: data.result!.tags.join(", "),
        editCategory: data.result!.top_category,
        synthesisVariables: data.result!.variables,
      }));
      window.requestAnimationFrame(() => {
        embeddedScrollRef.current?.scrollTo({ top: 0 });
      });
      toast.success(ui.toast.wizardDraftReady);
    } catch {
      toast.error(ui.toast.wizardSynthesisFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (isSaving || !ready) return;
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error(ui.toast.createFailed);
      return;
    }
    setIsSaving(true);
    try {
      const tags = parseTags(editTags);
      const variables = reconcilePromptVariables(
        editBody,
        synthesisVariables ?? [],
      );
      operationId.current ??= draft.operationId ?? crypto.randomUUID();
      setDraftField("operationId", operationId.current);
      await createUserPrompt({
        id: operationId.current,
        title: editTitle.trim(),
        description: editDescription.trim(),
        body: editBody,
        top_category: editCategory,
        tags,
        variables,
      });
      clearDraft();
      toast.success(ui.toast.created);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/${locale}/ai-knowledge`);
      }
    } catch {
      toast.error(ui.toast.createFailed);
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving, ready, draft.operationId, clearDraft, setDraftField,
    editTitle,
    editDescription,
    editBody,
    editTags,
    editCategory,
    synthesisVariables,
    createUserPrompt,
    router,
    locale,
    ui.toast,
    onSuccess,
  ]);

  if (!ready) {
    return (
      <p role="status">
        {language.startsWith("zh") ? "載入草稿…" : "Loading draft…"}
      </p>
    );
  }
  const stepCopy = w.steps[currentStepId];
  const outputChoices = [
    { value: "", label: w.outputChoices.choose },
    { value: w.outputChoices.bullets, label: w.outputChoices.bullets },
    { value: w.outputChoices.steps, label: w.outputChoices.steps },
    { value: w.outputChoices.table, label: w.outputChoices.table },
    {
      value: w.outputChoices.polishedDraft,
      label: w.outputChoices.polishedDraft,
    },
  ];
  const toneLabels = {
    clear: w.toneChoices.clear,
    concise: w.toneChoices.concise,
    warm: w.toneChoices.warm,
    expert: w.toneChoices.expert,
  };
  const toggleTone = (tone: (typeof TONE_VALUES)[number]) => {
    setField(
      "toneStyle",
      wizard.toneStyle.includes(tone)
        ? wizard.toneStyle.filter((item) => item !== tone)
        : [...wizard.toneStyle, tone],
    );
  };

  const wizardMain = (
    <div
      className={cn(
        "max-w-2xl space-y-6",
        variant === "embedded" && "max-w-none",
      )}
    >
      <LocalDraftStatus unavailable={storageError} />
      {stepIndex < REVIEW_INDEX ? (
        <div className="overflow-hidden rounded-[24px] border border-border/80 bg-card/85 shadow-[0_20px_60px_rgba(0,0,0,0.16)] backdrop-blur-xl">
          <div className="flex items-start gap-3 border-b border-border/70 bg-muted/20 p-4 sm:p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-semibold tracking-tight sm:text-base">
                {w.conversationTitle}
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {w.conversationDescription}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium text-muted-foreground">
                {w.stepOf(displayStep, displayTotal)}
              </p>
              <div className="flex gap-1.5" aria-hidden="true">
                {QUESTION_STEPS.map((question, index) => (
                  <span
                    key={question}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === stepIndex
                        ? "w-7 bg-primary"
                        : index < stepIndex
                          ? "w-3 bg-primary/45"
                          : "w-3 bg-muted-foreground/20",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-muted/35 p-4 ring-1 ring-border/60 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold leading-snug sm:text-lg">
                  {stepCopy.title}
                </h3>
                {currentStepId !== "goal" ? (
                  <span className="rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {w.optional}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {stepCopy.hint}
              </p>
            </div>

            {currentStepId === "goal" ? (
              <Textarea
                aria-label={stepCopy.title}
                value={wizard.goal}
                onChange={(event) => setField("goal", event.target.value)}
                placeholder={w.answerPlaceholder.goal}
                rows={5}
                autoFocus
                className="min-h-32 resize-y text-base font-medium leading-relaxed"
              />
            ) : null}

            {currentStepId === "context" ? (
              <Textarea
                aria-label={stepCopy.title}
                value={wizard.context}
                onChange={(event) => setField("context", event.target.value)}
                placeholder={w.answerPlaceholder.context}
                rows={5}
                autoFocus
                className="min-h-28 resize-y leading-relaxed"
              />
            ) : null}

            {currentStepId === "output_format" ? (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {outputChoices.map((choice) => {
                    const active = wizard.outputFormat === choice.value;
                    return (
                      <button
                        key={choice.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setField("outputFormat", choice.value)}
                        className={cn(
                          "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-primary/50 bg-primary/12 text-foreground"
                            : "border-border/75 bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                        )}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>

                <Textarea
                  aria-label={w.answerPlaceholder.output}
                  value={wizard.outputFormat}
                  onChange={(event) =>
                    setField("outputFormat", event.target.value)
                  }
                  placeholder={w.answerPlaceholder.output}
                  rows={3}
                  className="resize-y leading-relaxed"
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    {w.toneQuestion} · {w.optional}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_VALUES.map((tone) => {
                      const active = wizard.toneStyle.includes(tone);
                      return (
                        <button
                          key={tone}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleTone(tone)}
                          className={cn(
                            "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-primary/50 bg-primary/12 text-foreground"
                              : "border-border/75 bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                          )}
                        >
                          {toneLabels[tone]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {currentStepId === "output_format" ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {language.startsWith("zh")
                  ? "只有按下「建立我的提示詞」後，以上回答才會傳送到 AI 服務。"
                  : "Your answers are sent to the AI service only when you choose Build my prompt."}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex === 0 || isGenerating}
                onClick={() => goStep(Math.max(0, stepIndex - 1))}
              >
                {w.back}
              </Button>
              {stepIndex < REVIEW_INDEX - 1 ? (
                <Button
                  type="button"
                  disabled={!canAdvance}
                  onClick={() => goStep(stepIndex + 1)}
                >
                  {currentStepId === "context" && !wizard.context.trim()
                    ? w.skip
                    : w.next}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={isGenerating || wizard.goal.trim().length < 3}
                  onClick={handleGenerate}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {w.generating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      {w.buildPrompt}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-0 text-muted-foreground"
            onClick={() => goStep(REVIEW_INDEX - 1)}
          >
            ← {w.backToSteps}
          </Button>

          <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/[0.045] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 ring-1 ring-primary/20">
                <Sparkles className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{w.reviewTitle}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {w.reviewHint}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerate}
              disabled={isGenerating || wizard.goal.trim().length < 3}
              className="shrink-0 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {w.generating}
                </>
              ) : editBody ? (
                w.regenerate
              ) : (
                w.generateDraft
              )}
            </Button>
          </div>

          {(editTitle || editBody) && (
            <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="space-y-1.5">
                <Label>{w.titleLabel}</Label>
                <Input
                  aria-label={w.titleLabel}
                  value={editTitle}
                  onChange={(e) => setDraftField("editTitle", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{w.descriptionLabel}</Label>
                <Input
                  aria-label={w.descriptionLabel}
                  value={editDescription}
                  onChange={(e) =>
                    setDraftField("editDescription", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{w.categoryLabel}</Label>
                <Select
                  value={editCategory}
                  itemToStringLabel={(value) =>
                    ui.topCategoryLabels[value as PromptTopCategory] ??
                    String(value)
                  }
                  onValueChange={(value) =>
                    setDraftField(
                      "editCategory",
                      value as PromptTopCategory,
                    )
                  }
                >
                  <SelectTrigger aria-label={w.categoryLabel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_TOP_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ui.topCategoryLabels[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{w.tagsLabel}</Label>
                <Input
                  aria-label={w.tagsLabel}
                  value={editTags}
                  onChange={(e) => setDraftField("editTags", e.target.value)}
                  placeholder={w.tagsPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{w.bodyLabel}</Label>
                <Textarea
                  aria-label={w.bodyLabel}
                  value={editBody}
                  onChange={(e) => setDraftField("editBody", e.target.value)}
                  rows={variant === "embedded" ? 12 : 16}
                  className="font-mono text-xs"
                />
              </div>
              <Button
                type="button"
                className="w-full gap-2 sm:w-auto"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {w.saving}
                  </>
                ) : (
                  w.savePrompt
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "embedded") {
    return (
      <div className="space-y-2">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 text-muted-foreground"
            onClick={onCancel}
          >
            <ArrowLeft className="h-4 w-4" />
            {ui.create.modalBackToChoice}
          </Button>
        ) : null}
        <div
          ref={embeddedScrollRef}
          className="max-h-[min(58vh,560px)] overflow-y-auto overflow-x-hidden pr-0.5"
        >
          {wizardMain}
        </div>
      </div>
    );
  }

  return (
    <PageShell
      title={w.pageTitle}
      description={w.pageDescription}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="h-4 w-4" />
          {ui.create.backToLibrary}
        </Button>
      }
    >
      {wizardMain}
    </PageShell>
  );
}
