"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
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
  pickLocalizedText,
  type CustomPrompt,
  type PromptTopCategory,
} from "@/types/prompt";

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 24);
}

interface CustomPromptEditDrawerProps {
  prompt: CustomPrompt | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Phase 5 — edit saved custom prompts in place (no copy-to-blank round trip).
 */
export function CustomPromptEditDrawer({
  prompt,
  open,
  onClose,
}: CustomPromptEditDrawerProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const w = ui.createWizard;
  const updateUserPrompt = usePromptStore((s) => s.updateUserPrompt);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [body, setBody] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [topCategory, setTopCategory] = useState<PromptTopCategory>(
    "life_personal_growth",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prompt) return;
    setTitle(pickLocalizedText(prompt.title_i18n, language));
    setDescription(pickLocalizedText(prompt.description_i18n, language));
    setBody(prompt.body);
    setTagsRaw(prompt.tags.join(", "));
    setTopCategory(prompt.top_category);
  }, [prompt, language]);

  const panelTitle = useMemo(
    () => (prompt ? ui.editDrawer.title : ""),
    [prompt, ui.editDrawer.title],
  );

  const handleSave = async () => {
    if (!prompt) return;
    if (!title.trim() || !body.trim()) {
      toast.error(ui.toast.updateFailed);
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
      await updateUserPrompt(prompt.id, {
        title: title.trim(),
        description: description.trim(),
        body,
        top_category: topCategory,
        tags: parseTags(tagsRaw),
        variables,
      });
      toast.success(ui.toast.updated);
      onClose();
    } catch {
      toast.error(ui.toast.updateFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title={panelTitle}
      description={ui.editDrawer.description}
      width="2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {ui.run.close}
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !prompt}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {ui.editDrawer.saving}
              </>
            ) : (
              ui.editDrawer.save
            )}
          </Button>
        </div>
      }
    >
      {prompt && (
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{w.blankTitle}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{w.blankDescription}</Label>
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
                {PROMPT_TOP_CATEGORIES.map((top) => (
                  <SelectItem key={top} value={top}>
                    {ui.topCategoryLabels[top]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{w.blankTags}</Label>
            <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{w.blankBody}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[220px] font-mono text-sm"
            />
          </div>
        </div>
      )}
    </SlideOverPanel>
  );
}
