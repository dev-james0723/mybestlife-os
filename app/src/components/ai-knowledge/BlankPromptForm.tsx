"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  extractVariableNames,
  type PromptTopCategory,
} from "@/types/prompt";
import { cn } from "@/lib/utils";
import { blankPromptDraftSchema } from "@/lib/form-draft-schemas";
import { useAccountDraft } from "@/hooks/use-account-draft";
import { LocalDraftStatus } from "@/components/shared/local-draft-status";
import { z } from "zod";
const initialDraft: z.infer<typeof blankPromptDraftSchema> = { operationId: null, title: "", description: "", body: "", tagsRaw: "", topCategory: "life_personal_growth" };

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 24);
}

export type BlankPromptFormProps = {
  /** Full-page mode: wrap actions with library link back */
  variant?: "page" | "embedded";
  /** Embedded / modal: return to prior step */
  onBack?: () => void;
  /** After successful save */
  onSuccess?: () => void;
};

export function BlankPromptForm({
  variant = "page",
  onBack,
  onSuccess,
}: BlankPromptFormProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const w = ui.createWizard;
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";
  const backHref = `/${locale}/ai-knowledge`;

  const createUserPrompt = usePromptStore((s) => s.createUserPrompt);

  const { draft, setDraft, clearDraft, ready, storageError } = useAccountDraft("prompt:manual", initialDraft, blankPromptDraftSchema);
  const { title, description, body, tagsRaw, topCategory } = draft;
  const fieldId = useId();
  const operationId = useRef<string | null>(null);
  const setField = useCallback(<K extends keyof typeof draft>(key: K, value: typeof draft[K]) => setDraft((previous) => ({ ...previous, [key]: value })), [setDraft]);
  const [allowMetadata, setAllowMetadata] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);


  useEffect(() => {
    const text = body.trim();
    const ac = new AbortController();

    const clearLoad = () => {
      setMetadataLoading(false);
    };

    if (!ready || !allowMetadata || text.length < 40) {
      return () => {
        ac.abort();
        clearLoad();
      };
    }

    const t = window.setTimeout(() => {
      setMetadataLoading(true);
      void (async () => {
        try {
          const res = await fetch("/api/ai/knowledge/prompt-metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text, locale: language }),
            signal: ac.signal,
          });
          if (ac.signal.aborted) return;
          if (!res.ok) {
            return;
          }
          const data = (await res.json()) as {
            tags?: string[];
            top_category?: PromptTopCategory;
            short_description?: string;
            suggested_title?: string;
          };
          setDraft((previous) => ({
            ...previous,
            tagsRaw: previous.tagsRaw || data.tags?.join(", ") || "",
            description: previous.description || data.short_description?.trim() || "",
            title: previous.title || data.suggested_title?.trim() || "",
            topCategory: previous.topCategory === initialDraft.topCategory && data.top_category && PROMPT_TOP_CATEGORIES.includes(data.top_category) ? data.top_category : previous.topCategory,
          }));
        } catch (e) {
          if ((e as Error).name === "AbortError" || ac.signal.aborted) return;
        } finally {
          if (!ac.signal.aborted) {
            clearLoad();
          }
        }
      })();
    }, 650);

    return () => {
      clearTimeout(t);
      ac.abort();
      clearLoad();
    };
  }, [body, language, allowMetadata, ready, setDraft]);

  const handleSave = async () => {
    if (saving || !ready) return;
    if (!title.trim() || !body.trim()) {
      toast.error(ui.toast.createFailed);
      return;
    }
    setSaving(true);
    try {
      const names = extractVariableNames(body);
      const variables = names.map((name) => ({
        name,
        label: null,
        description: null,
        required: true,
        example: null,
      }));
      operationId.current ??= draft.operationId ?? crypto.randomUUID();
      setField("operationId", operationId.current);
      await createUserPrompt({
        id: operationId.current,
        title: title.trim(),
        description: description.trim(),
        body,
        top_category: topCategory,
        tags: parseTags(tagsRaw),
        variables,
      });
      clearDraft();
      toast.success(ui.toast.created);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(backHref);
      }
    } catch {
      toast.error(ui.toast.createFailed);
    } finally {
      setSaving(false);
    }
  };

  const backControl =
    variant === "embedded" && onBack ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2 text-muted-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        {ui.create.modalBackToChoice}
      </Button>
    ) : variant === "page" ? (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        render={<Link href={backHref} />}
      >
        <ArrowLeft className="h-4 w-4" />
        {ui.create.backToLibrary}
      </Button>
    ) : null;

  if (!ready) return <p role="status">{language.startsWith("zh") ? "載入草稿…" : "Loading draft…"}</p>;
  return (
    <div className="space-y-4">
      <LocalDraftStatus unavailable={storageError} />
      {backControl}

      <div
        className={cn(
          "space-y-4 rounded-xl border p-5 sm:p-6",
          variant === "embedded"
            ? "border-white/15 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl backdrop-saturate-150 dark:bg-white/[0.07]"
            : "border-border bg-card",
        )}
      >
        <label className="flex items-start gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={allowMetadata} onChange={(event) => setAllowMetadata(event.target.checked)} className="mt-1" /><span>{language.startsWith("zh") ? "選用 AI 標題與分類：會把這段提示詞傳送到 AI 服務。不選亦可直接儲存。" : "Optional AI title and categories: sends this prompt to the AI service. You can save with this off."}</span></label>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-body`}>{w.blankBody}</Label>
          <Textarea
            id={`${fieldId}-body`}
            value={body}
            onChange={(e) => setField("body", e.target.value)}
            rows={variant === "embedded" ? 14 : 18}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-title`}>{w.blankTitle}</Label>
          <Input
            id={`${fieldId}-title`}
            value={title}
            onChange={(e) => {
              setField("title", e.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${fieldId}-description`}>{w.blankDescription}</Label>
            {metadataLoading ? (
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {ui.create.autoMetadataLoading}
              </span>
            ) : null}
          </div>
          <Input
            id={`${fieldId}-description`}
            value={description}
            onChange={(e) => setField("description", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{w.categoryLabel}</Label>
          <Select
            value={topCategory}
            itemToStringLabel={(value) => ui.topCategoryLabels[value as PromptTopCategory] ?? String(value)}
            onValueChange={(v) => setField("topCategory", v as PromptTopCategory)}
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
          <Label htmlFor={`${fieldId}-tags`}>{w.blankTags}</Label>
          <Input
            id={`${fieldId}-tags`}
            value={tagsRaw}
            onChange={(e) => setField("tagsRaw", e.target.value)}
            placeholder={w.tagsPlaceholder}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {w.blankSaving}
            </>
          ) : (
            w.blankSave
          )}
        </Button>
      </div>
    </div>
  );
}
