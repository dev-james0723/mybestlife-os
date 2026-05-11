"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import {
  getAiKnowledgeUiCopy,
  type AiKnowledgeUiCopy,
} from "@/lib/i18n/ai-knowledge-ui";
import { usePromptStore } from "@/stores/prompt-store";
import {
  PROMPT_TOP_CATEGORIES,
  type PromptCreatorWizardState,
  type PromptTopCategory,
  type PromptVariable,
  type PromptWizardStepId,
} from "@/types/prompt";

import { cn } from "@/lib/utils";

const WIZARD_STEPS: PromptWizardStepId[] = [
  "goal",
  "expert_role",
  "context",
  "output_format",
  "tone_style",
  "variables",
  "guardrails",
  "examples",
];

const REVIEW_INDEX = WIZARD_STEPS.length;

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

function splitTones(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 16);
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

  const [stepIndex, setStepIndex] = useState(0);
  const [wizard, setWizard] = useState<PromptCreatorWizardState>(() =>
    createInitialWizardState(),
  );

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editCategory, setEditCategory] = useState<PromptTopCategory>(
    "life_personal_growth",
  );
  const [synthesisVariables, setSynthesisVariables] = useState<
    PromptVariable[] | null
  >(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentStepId = WIZARD_STEPS[stepIndex] ?? "goal";
  const displayStep = Math.min(stepIndex + 1, REVIEW_INDEX + 1);
  const displayTotal = REVIEW_INDEX + 1;

  const setField = useCallback(
    <K extends keyof PromptCreatorWizardState>(key: K, value: PromptCreatorWizardState[K]) => {
      setWizard((prev) => ({
        ...prev,
        [key]: value,
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const canAdvance = useMemo(() => {
    if (stepIndex >= REVIEW_INDEX) return true;
    const id = WIZARD_STEPS[stepIndex];
    if (id === "goal") return wizard.goal.trim().length >= 3;
    return true;
  }, [stepIndex, wizard.goal]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const payload: PromptCreatorWizardState = {
        ...wizard,
        stepId: currentStepId,
        toneStyle: wizard.toneStyle,
        variables: wizard.variables.filter((v) => v.name.trim().length > 0),
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
      setEditTitle(data.result.title);
      setEditDescription(data.result.description);
      setEditBody(data.result.body);
      setEditTags(data.result.tags.join(", "));
      setEditCategory(data.result.top_category);
      setSynthesisVariables(data.result.variables);
      setField("synthesizedBody", data.result.body);
      toast.success(ui.toast.wizardDraftReady);
    } catch {
      toast.error(ui.toast.wizardSynthesisFailed);
    } finally {
      setIsGenerating(false);
    }
  }, [wizard, currentStepId, language, ui.toast, setField]);

  const handleSave = useCallback(async () => {
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error(ui.toast.createFailed);
      return;
    }
    setIsSaving(true);
    try {
      const tags = parseTags(editTags);
      const variables =
        synthesisVariables ??
        wizard.variables.filter((v) => v.name.trim().length > 0);
      await createUserPrompt({
        title: editTitle.trim(),
        description: editDescription.trim(),
        body: editBody,
        top_category: editCategory,
        tags,
        variables: variables.map((v) => ({
          name: v.name.trim(),
          label: v.label?.trim() || null,
          description: v.description?.trim() || null,
          required: v.required,
          example: v.example?.trim() || null,
        })),
      });
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
    editTitle,
    editDescription,
    editBody,
    editTags,
    editCategory,
    synthesisVariables,
    wizard.variables,
    createUserPrompt,
    router,
    locale,
    ui.toast,
    onSuccess,
  ]);

  const stepCopy = w.steps[currentStepId];

  const wizardMain = (
    <div
      className={cn(
        "max-w-2xl space-y-6",
        variant === "embedded" && "max-w-none",
      )}
    >
      <p className="text-sm text-muted-foreground">
        {w.stepOf(displayStep, displayTotal)}
      </p>

      {stepIndex < REVIEW_INDEX ? (
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold">{stepCopy.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{stepCopy.hint}</p>
          </div>

          {currentStepId === "goal" && (
            <Textarea
              value={wizard.goal}
              onChange={(e) => setField("goal", e.target.value)}
              rows={5}
              className="font-medium"
            />
          )}
          {currentStepId === "expert_role" && (
            <Input
              value={wizard.expertRole}
              onChange={(e) => setField("expertRole", e.target.value)}
              placeholder="e.g. Staff engineer"
            />
          )}
          {currentStepId === "context" && (
            <Textarea
              value={wizard.context}
              onChange={(e) => setField("context", e.target.value)}
              rows={6}
            />
          )}
          {currentStepId === "output_format" && (
            <Textarea
              value={wizard.outputFormat}
              onChange={(e) => setField("outputFormat", e.target.value)}
              rows={5}
            />
          )}
          {currentStepId === "tone_style" && (
            <div className="space-y-2">
              <Input
                value={wizard.toneStyle.join(", ")}
                onChange={(e) =>
                  setField("toneStyle", splitTones(e.target.value))
                }
                placeholder={w.toneCommaHint}
              />
            </div>
          )}
          {currentStepId === "variables" && (
            <VariableEditor
              variables={wizard.variables}
              onChange={(vars) => setField("variables", vars)}
              labels={w}
            />
          )}
          {currentStepId === "guardrails" && (
            <Textarea
              value={wizard.guardrails}
              onChange={(e) => setField("guardrails", e.target.value)}
              rows={5}
            />
          )}
          {currentStepId === "examples" && (
            <ExamplesEditor
              examples={wizard.examples}
              onChange={(ex) => setField("examples", ex)}
              labels={w}
            />
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button
              variant="outline"
              disabled={stepIndex === 0}
              onClick={() =>
                setStepIndex((i) => {
                  const next = Math.max(0, i - 1);
                  setWizard((prev) => ({
                    ...prev,
                    stepId: WIZARD_STEPS[next] ?? "goal",
                  }));
                  return next;
                })
              }
            >
              {w.back}
            </Button>
            <Button
              disabled={!canAdvance}
              onClick={() =>
                setStepIndex((i) => {
                  const next = Math.min(REVIEW_INDEX, i + 1);
                  setWizard((prev) => ({
                    ...prev,
                    stepId: WIZARD_STEPS[next] ?? prev.stepId,
                  }));
                  return next;
                })
              }
            >
              {w.next}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            className="px-0 text-muted-foreground"
            onClick={() =>
              setStepIndex((i) => {
                const next = Math.max(0, i - 1);
                setWizard((prev) => ({
                  ...prev,
                  stepId: WIZARD_STEPS[next] ?? "goal",
                }));
                return next;
              })
            }
          >
            ← {w.backToSteps}
          </Button>
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">{w.reviewTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {w.reviewHint}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {w.generating}
                  </>
                ) : editBody ? (
                  w.regenerate
                ) : (
                  w.generateDraft
                )}
              </Button>
            </div>
          </div>

          {(editTitle || editBody) && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>{w.titleLabel}</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{w.descriptionLabel}</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{w.categoryLabel}</Label>
                <Select
                  value={editCategory}
                  onValueChange={(v) => setEditCategory(v as PromptTopCategory)}
                >
                  <SelectTrigger>
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
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={w.tagsPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{w.bodyLabel}</Label>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={variant === "embedded" ? 12 : 16}
                  className="font-mono text-xs"
                />
              </div>
              <Button
                className="w-full sm:w-auto"
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
        <div className="max-h-[min(58vh,560px)] overflow-y-auto overflow-x-hidden pr-0.5">
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

function VariableEditor({
  variables,
  onChange,
  labels,
}: {
  variables: PromptVariable[];
  onChange: (v: PromptVariable[]) => void;
  labels: AiKnowledgeUiCopy["createWizard"];
}) {
  const update = (i: number, patch: Partial<PromptVariable>) => {
    const next = variables.map((row, j) =>
      j === i ? { ...row, ...patch } : row,
    );
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {variables.map((row, i) => (
        <div
          key={i}
          className="rounded-lg border p-3 space-y-2 relative"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2"
            onClick={() => onChange(variables.filter((_, j) => j !== i))}
            aria-label={labels.removeVariable}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="grid gap-2 sm:grid-cols-2 pr-8">
            <div className="space-y-1">
              <Label className="text-xs">{labels.varName}</Label>
              <Input
                value={row.name}
                onChange={(e) =>
                  update(i, {
                    name: e.target.value.replace(/[^A-Za-z0-9_]/g, ""),
                  })
                }
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{labels.varLabel}</Label>
              <Input
                value={row.label ?? ""}
                onChange={(e) => update(i, { label: e.target.value || null })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={row.required}
              onCheckedChange={(v) => update(i, { required: v === true })}
            />
            <span className="text-xs text-muted-foreground">
              {labels.varRequired}
            </span>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{labels.varDescription}</Label>
            <Input
              value={row.description ?? ""}
              onChange={(e) =>
                update(i, { description: e.target.value || null })
              }
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          onChange([
            ...variables,
            {
              name: "",
              label: null,
              description: null,
              required: true,
              example: null,
            },
          ])
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {labels.addVariable}
      </Button>
    </div>
  );
}

function ExamplesEditor({
  examples,
  onChange,
  labels,
}: {
  examples: Array<{ input: string; expectedOutput: string }>;
  onChange: (e: Array<{ input: string; expectedOutput: string }>) => void;
  labels: AiKnowledgeUiCopy["createWizard"];
}) {
  return (
    <div className="space-y-4">
      {examples.map((row, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2"
            onClick={() => onChange(examples.filter((_, j) => j !== i))}
            aria-label={labels.removeExample}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="space-y-1 pr-8">
            <Label className="text-xs">{labels.exampleUser}</Label>
            <Textarea
              rows={2}
              value={row.input}
              onChange={(e) => {
                const next = [...examples];
                next[i] = { ...next[i]!, input: e.target.value };
                onChange(next);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{labels.exampleExpected}</Label>
            <Textarea
              rows={2}
              value={row.expectedOutput}
              onChange={(e) => {
                const next = [...examples];
                next[i] = { ...next[i]!, expectedOutput: e.target.value };
                onChange(next);
              }}
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          onChange([...examples, { input: "", expectedOutput: "" }])
        }
      >
        <Plus className="h-3.5 w-3.5" />
        {labels.addExample}
      </Button>
    </div>
  );
}
