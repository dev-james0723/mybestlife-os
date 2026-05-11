"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";
import { useAIPreferences, useUpsertAIPreferences } from "@/hooks/use-ai-preferences";
import { useCareerProfile } from "@/hooks/use-career-profile";
import {
  useCustomPrompt,
  useLogPromptUsage,
  useSystemPromptTemplate,
} from "@/hooks/use-ai-coach";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { compilePrompt } from "@/lib/prompts/compiler";
import { dispatchToAI } from "@/lib/ai/dispatcher";
import { getAITool } from "@/lib/ai/tool-registry";
import type {
  AITool,
  AnyPrompt,
  SystemPromptTemplate,
  UserCustomPrompt,
} from "@/types/ai-coach";
import { VariableInputStep } from "./VariableInputStep";
import { AttachmentStep } from "./AttachmentStep";
import { AIToolStep } from "./AIToolStep";
import { PreviewStep } from "./PreviewStep";

type Step = 0 | 1 | 2 | 3;

const TOTAL_STEPS_WITH_PREVIEW = 4;
const TOTAL_STEPS_NO_PREVIEW = 3;

function toSystemAny(t: SystemPromptTemplate): AnyPrompt {
  return {
    kind: "system",
    id: t.id,
    slug: t.slug,
    icon: t.icon,
    category: t.category,
    title_i18n: t.title_i18n,
    description_i18n: t.description_i18n,
    prompt_i18n: t.prompt_i18n,
    required_variables: t.required_variables,
    optional_variables: t.optional_variables,
    attachment_categories: t.attachment_categories,
    template: t,
  };
}

function toCustomAny(c: UserCustomPrompt): AnyPrompt {
  return {
    kind: "custom",
    id: c.id,
    icon: c.icon,
    title: c.title,
    prompt_body: c.prompt_body,
    tags: c.tags,
    required_variables: c.required_variables,
    optional_variables: c.optional_variables,
    attachment_categories: c.attachment_categories,
    is_favorite: c.is_favorite,
    usage_count: c.usage_count,
    custom: c,
  };
}

export function UseFlowView({ promptId }: { promptId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const kind = (sp.get("kind") ?? "system") as "system" | "custom";
  const preselectedFileId = sp.get("fileId");

  const language = useAppStore((s) => s.language);
  const copy = getAICoachCopy(language);
  const localeSlug = useLocaleSlug();

  const systemQ = useSystemPromptTemplate(kind === "system" ? promptId : null);
  const customQ = useCustomPrompt(kind === "custom" ? promptId : null);
  const prefsQ = useAIPreferences();
  const profileQ = useCareerProfile();
  const filesQ = useCareerVaultFiles();
  const prefsUpsert = useUpsertAIPreferences();
  const logUsage = useLogPromptUsage();

  const prompt: AnyPrompt | null = useMemo(() => {
    if (kind === "system" && systemQ.data) return toSystemAny(systemQ.data);
    if (kind === "custom" && customQ.data) return toCustomAny(customQ.data);
    return null;
  }, [kind, systemQ.data, customQ.data]);

  const showPreview = prefsQ.data?.show_prompt_preview ?? true;
  const totalSteps = showPreview
    ? TOTAL_STEPS_WITH_PREVIEW
    : TOTAL_STEPS_NO_PREVIEW;

  const [step, setStep] = useState<Step>(0);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(() =>
    preselectedFileId ? new Set([preselectedFileId]) : new Set(),
  );
  const [tool, setTool] = useState<AITool | null>(null);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [hidePreviewNextTime, setHidePreviewNextTime] = useState(false);

  useEffect(() => {
    if (!tool && prefsQ.data?.default_ai) {
      setTool(prefsQ.data.default_ai);
    } else if (!tool && !prefsQ.isLoading) {
      setTool("chatgpt");
    }
  }, [tool, prefsQ.data?.default_ai, prefsQ.isLoading]);

  if (!prompt || prefsQ.isLoading || profileQ.isLoading || filesQ.isLoading) {
    return <LoadingPage />;
  }

  const required = prompt.required_variables ?? [];
  const optional = prompt.optional_variables ?? [];

  const attachments =
    (filesQ.data ?? []).filter((f) => selectedFileIds.has(f.id));

  const compiled = compilePrompt({
    prompt,
    locale: language,
    profile: profileQ.data ?? null,
    variables,
    attachments,
    tool: tool ?? "chatgpt",
  });

  const compiledText = editedText ?? compiled.text;
  const promptTitle =
    prompt.kind === "system"
      ? prompt.title_i18n[language] || prompt.title_i18n.en || prompt.slug
      : prompt.title;

  const coachHref = withLocalePrefix(localeSlug, "/career/coach");
  const vaultHref = withLocalePrefix(localeSlug, "/career/vault");

  const validate = (): boolean => {
    const e: Record<string, boolean> = {};
    for (const v of required) {
      if (!(variables[v] && variables[v].trim())) e[v] = true;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const stepLabels: Record<number, string> = {
    0: copy.flow.steps.variables,
    1: copy.flow.steps.attachments,
    2: copy.flow.steps.aiTool,
    3: copy.flow.steps.preview,
  };

  const next = () => {
    if (step === 0 && !validate()) {
      toast.error(copy.flow.variables.requiredError);
      return;
    }
    setStep((s) => (Math.min(totalSteps - 1, s + 1) as Step));
  };

  const back = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => (Math.max(0, s - 1) as Step));
  };

  const handleDispatch = async () => {
    if (!tool) return;
    setDispatching(true);
    try {
      if (hidePreviewNextTime) {
        await prefsUpsert.mutateAsync({ show_prompt_preview: false });
      }

      const result = await dispatchToAI({
        prompt: compiledText,
        tool,
        customUrl: prefsQ.data?.custom_ai_url,
        autoCopy: prefsQ.data?.auto_copy_to_clipboard ?? true,
      });

      const toolName =
        tool === "custom"
          ? prefsQ.data?.custom_ai_name || copy.tools.custom
          : getAITool(tool).name;

      if (result.copied) {
        toast.success(copy.toast.promptCopied(toolName));
      } else {
        toast.warning(copy.toast.copyFailed);
      }
      if (result.opened && !result.urlPrefilled && tool !== "custom") {
        toast.info(copy.toast.opened(toolName));
      }
      if (!result.opened && result.url) {
        toast.error(copy.toast.openFailed);
      }
      if (
        tool !== "custom" &&
        !result.urlPrefilled &&
        getAITool(tool).supportsUrlPrefill
      ) {
        toast.info(copy.toast.urlTruncatedFallback);
      }
      if (attachments.length > 0) {
        toast.warning(copy.toast.attachReminder, { duration: 10_000 });
      }

      await logUsage
        .mutateAsync({
          templateId: prompt.kind === "system" ? prompt.id : null,
          customPromptId: prompt.kind === "custom" ? prompt.id : null,
          aiTool: tool,
          attachedFileIds: Array.from(selectedFileIds),
        })
        .catch(() => undefined);

      // After a short delay head back to the coach so the user can continue.
      router.push(coachHref);
    } finally {
      setDispatching(false);
    }
  };

  const isLastStep = step === totalSteps - 1;
  const isPreviewStep = showPreview && step === 3;
  const isAIToolStep = step === 2;

  return (
    <PageShell
      title={`${prompt.icon} ${promptTitle}`}
      description={copy.flow.stepIndicator(step + 1, totalSteps)}
    >
      <nav className="text-xs text-muted-foreground">
        <Link href={coachHref} className="hover:underline">
          {copy.breadcrumb.coach}
        </Link>{" "}
        / <span className="text-foreground">{copy.breadcrumb.use}</span>
      </nav>

      <ol className="flex items-center gap-2 text-xs" aria-label="Steps">
        {[0, 1, 2, ...(showPreview ? [3] : [])].map((i) => (
          <li
            key={i}
            aria-current={i === step ? "step" : undefined}
            className={`flex items-center gap-2 ${
              i === step
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }`}
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                i <= step
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{stepLabels[i]}</span>
            {i < (showPreview ? 3 : 2) ? (
              <span className="text-muted-foreground/50">→</span>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        {step === 0 ? (
          <VariableInputStep
            copy={copy}
            required={required}
            optional={optional}
            values={variables}
            onChange={(n, v) => {
              setVariables((prev) => ({ ...prev, [n]: v }));
              if (errors[n] && v.trim()) {
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next[n];
                  return next;
                });
              }
            }}
            errors={errors}
          />
        ) : step === 1 ? (
          <AttachmentStep
            copy={copy}
            filterCategories={prompt.attachment_categories}
            allFiles={filesQ.data ?? []}
            selectedIds={selectedFileIds}
            onToggle={(id) =>
              setSelectedFileIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            vaultHref={vaultHref}
          />
        ) : isAIToolStep ? (
          <AIToolStep
            copy={copy}
            value={tool ?? "chatgpt"}
            onChange={setTool}
            defaultAI={prefsQ.data?.default_ai ?? "chatgpt"}
            customConfigured={Boolean(prefsQ.data?.custom_ai_url)}
            meta={compiled.meta}
          />
        ) : isPreviewStep ? (
          <PreviewStep
            copy={copy}
            text={compiledText}
            meta={{
              chars: compiledText.length,
              approxTokens: Math.ceil(compiledText.length / 4),
              urlSupportsPrefill: compiled.meta.urlSupportsPrefill,
            }}
            missingVariables={compiled.missingVariables}
            onEditedText={setEditedText}
            hideNextTime={hidePreviewNextTime}
            onToggleHideNextTime={setHidePreviewNextTime}
          />
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={back} disabled={dispatching}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.flow.nav.back}
        </Button>

        <div className="flex items-center gap-2">
          {!isLastStep ? (
            <Button onClick={next}>
              {copy.flow.nav.next}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleDispatch} disabled={dispatching}>
              <Send className="mr-1 h-4 w-4" />
              {copy.flow.nav.dispatch}
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
