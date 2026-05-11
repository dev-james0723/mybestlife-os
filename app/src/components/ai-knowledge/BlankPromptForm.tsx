"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [topCategory, setTopCategory] = useState<PromptTopCategory>(
    "life_personal_growth",
  );
  const [saving, setSaving] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const titleEditedRef = useRef(false);

  useEffect(() => {
    const text = body.trim();
    const ac = new AbortController();

    const clearLoad = () => {
      setMetadataLoading(false);
    };

    if (text.length < 40) {
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
          if (data.tags?.length) {
            setTagsRaw(data.tags.join(", "));
          }
          if (data.top_category && PROMPT_TOP_CATEGORIES.includes(data.top_category)) {
            setTopCategory(data.top_category);
          }
          if (typeof data.short_description === "string" && data.short_description.trim()) {
            setDescription(data.short_description.trim());
          }
          if (
            !titleEditedRef.current &&
            typeof data.suggested_title === "string" &&
            data.suggested_title.trim()
          ) {
            setTitle(data.suggested_title.trim());
          }
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
  }, [body, language]);

  const handleSave = async () => {
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
      await createUserPrompt({
        title: title.trim(),
        description: description.trim(),
        body,
        top_category: topCategory,
        tags: parseTags(tagsRaw),
        variables,
      });
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

  return (
    <div className="space-y-4">
      {backControl}

      <div
        className={cn(
          "space-y-4 rounded-xl border p-5 sm:p-6",
          variant === "embedded"
            ? "border-white/15 bg-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl backdrop-saturate-150 dark:bg-white/[0.07]"
            : "border-border bg-card",
        )}
      >
        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-80" />
          {ui.create.autoMetadataHint}
        </p>

        <div className="space-y-1.5">
          <Label>{w.blankBody}</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={variant === "embedded" ? 14 : 18}
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label>{w.blankTitle}</Label>
          <Input
            value={title}
            onChange={(e) => {
              titleEditedRef.current = true;
              setTitle(e.target.value);
            }}
          />
        </div>

        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between gap-2">
            <Label>{w.blankDescription}</Label>
            {metadataLoading ? (
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {ui.create.autoMetadataLoading}
              </span>
            ) : null}
          </div>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{w.categoryLabel}</Label>
          <Select
            value={topCategory}
            onValueChange={(v) => setTopCategory(v as PromptTopCategory)}
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
          <Label>{w.blankTags}</Label>
          <Input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
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
