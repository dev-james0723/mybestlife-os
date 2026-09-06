"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getAICoachCopy } from "@/lib/i18n/ai-coach-ui";
import {
  useAIPreferences,
  useUpsertAIPreferences,
} from "@/hooks/use-ai-preferences";
import type { AITool } from "@/types/ai-coach";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { AI_TOOLS } from "@/lib/ai/tool-registry";
import { APP_LOCALES, LOCALE_SELECT_LABELS } from "@/lib/i18n/app-locale";

export function AIPreferencesView() {
  const language = useAppStore((s) => s.language);
  const copy = getAICoachCopy(language);
  const localeSlug = useLocaleSlug();

  const q = useAIPreferences();
  const upsert = useUpsertAIPreferences();

  const [defaultAI, setDefaultAI] = useState<AITool>("chatgpt");
  const [customUrl, setCustomUrl] = useState("");
  const [customName, setCustomName] = useState("");
  const [promptLang, setPromptLang] = useState<AppLocale | "">("");
  const [autoCopy, setAutoCopy] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [allowAIAnalysis, setAllowAIAnalysis] = useState(true);
  const [versionRetention, setVersionRetention] = useState<string>("10");

  const dataKey = q.data?.updated_at ?? null;
  const [seededKey, setSeededKey] = useState<string | null>(null);
  if (q.data && dataKey !== seededKey) {
    setSeededKey(dataKey);
    setDefaultAI(q.data.default_ai);
    setCustomUrl(q.data.custom_ai_url ?? "");
    setCustomName(q.data.custom_ai_name ?? "");
    setPromptLang((q.data.prompt_language as AppLocale | null) ?? "");
    setAutoCopy(q.data.auto_copy_to_clipboard);
    setShowPreview(q.data.show_prompt_preview);
    setAllowAIAnalysis(q.data.allow_ai_analysis ?? true);
    setVersionRetention(String(q.data.version_retention_limit ?? 10));
  }

  if (q.isLoading) return <LoadingPage />;

  const coachHref = withLocalePrefix(localeSlug, "/career/coach");

  const handleSave = async () => {
    await upsert.mutateAsync({
      default_ai: defaultAI,
      custom_ai_url: customUrl.trim() || null,
      custom_ai_name: customName.trim() || null,
      prompt_language: (promptLang || null) as AppLocale | null,
      auto_copy_to_clipboard: autoCopy,
      show_prompt_preview: showPreview,
      allow_ai_analysis: allowAIAnalysis,
      version_retention_limit: Number.parseInt(versionRetention, 10) || 10,
    });
  };

  return (
    <PageShell
      title={copy.settings.title}
      description={copy.settings.description}
      actions={
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? copy.settings.saving : copy.settings.save}
        </Button>
      }
    >
      <nav className="text-xs text-muted-foreground">
        <Link href={coachHref} className="hover:underline">
          {copy.breadcrumb.coach}
        </Link>{" "}
        / <span className="text-foreground">{copy.settings.title}</span>
      </nav>

      <div data-slot="project-surface" className="grid gap-5 p-6">
        <div className="grid gap-1.5">
          <Label>{copy.settings.defaultAI.label}</Label>
          <p className="text-xs text-muted-foreground">
            {copy.settings.defaultAI.hint}
          </p>
          <Select
            value={defaultAI}
            onValueChange={(v) => setDefaultAI(v as AITool)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_TOOLS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {copy.tools[t.id] ?? t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {defaultAI === "custom" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ai-custom-url">
                {copy.settings.customAI.urlLabel}
              </Label>
              <Input
                id="ai-custom-url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder={copy.settings.customAI.urlPlaceholder}
                type="url"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ai-custom-name">
                {copy.settings.customAI.nameLabel}
              </Label>
              <Input
                id="ai-custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={copy.settings.customAI.namePlaceholder}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {copy.settings.customAI.hint}
            </p>
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <Label>{copy.settings.promptLanguage.label}</Label>
          <p className="text-xs text-muted-foreground">
            {copy.settings.promptLanguage.hint}
          </p>
          <Select
            value={promptLang || "__app"}
            onValueChange={(v) =>
              setPromptLang(v === "__app" ? "" : (v as AppLocale))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__app">
                {copy.settings.promptLanguage.followProfile}
              </SelectItem>
              {APP_LOCALES.map((l) => (
                <SelectItem key={l} value={l}>
                  {LOCALE_SELECT_LABELS[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-start gap-2">
          <Checkbox
            checked={autoCopy}
            onCheckedChange={(v) => setAutoCopy(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">{copy.settings.autoCopy.label}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {copy.settings.autoCopy.hint}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2">
          <Checkbox
            checked={showPreview}
            onCheckedChange={(v) => setShowPreview(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm">
            <span className="font-medium">
              {copy.settings.showPreview.label}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {copy.settings.showPreview.hint}
            </span>
          </span>
        </label>

        <div className="border-t pt-5">
          <label className="flex items-start gap-2">
            <Checkbox
              checked={allowAIAnalysis}
              onCheckedChange={(v) => setAllowAIAnalysis(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium">
                {copy.settings.allowAIAnalysis.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {copy.settings.allowAIAnalysis.hint}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {copy.settings.allowAIAnalysis.privacy}
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-1.5">
          <Label>{copy.settings.versionRetention.label}</Label>
          <p className="text-xs text-muted-foreground">
            {copy.settings.versionRetention.hint}
          </p>
          <Select
            value={versionRetention}
            onValueChange={(v) => v && setVersionRetention(v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">
                {copy.settings.versionRetention.options.ten}
              </SelectItem>
              <SelectItem value="25">
                {copy.settings.versionRetention.options.twentyFive}
              </SelectItem>
              <SelectItem value="100">
                {copy.settings.versionRetention.options.hundred}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </PageShell>
  );
}
