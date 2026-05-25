"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderPlus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { usePromptStore } from "@/stores/prompt-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  pickLocalizedText,
  type CustomPrompt,
  type LibraryPrompt,
  type PromptFolderItemRef,
} from "@/types/prompt";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface AddToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The prompts that will be placed into the chosen / created folder. */
  prompts: AnyPrompt[];
  /** "new_folder" jumps straight to the create form and auto-names with AI. */
  startInCreate: boolean;
  /** Called after a successful add/create so the caller can clear selection. */
  onDone: () => void;
}

export function AddToFolderDialog({
  open,
  onOpenChange,
  prompts,
  startInCreate,
  onDone,
}: AddToFolderDialogProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const folders = usePromptStore((s) => s.folders);
  const createFolder = usePromptStore((s) => s.createFolder);
  const addPromptsToFolder = usePromptStore((s) => s.addPromptsToFolder);

  const [view, setView] = useState<"pick" | "form">("pick");
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [icon, setIcon] = useState("📁");
  const [autofilling, setAutofilling] = useState(false);
  const [saving, setSaving] = useState(false);

  const refs: PromptFolderItemRef[] = prompts.map((p) => ({
    source: p.source,
    prompt_id: p.id,
  }));

  const runAutofill = useCallback(async () => {
    if (prompts.length === 0) return;
    setAutofilling(true);
    try {
      const res = await fetch("/api/ai/knowledge/folder-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: language,
          prompts: prompts.slice(0, 50).map((p) => ({
            title: pickLocalizedText(p.title_i18n, language),
            description: pickLocalizedText(p.description_i18n, language),
            top_category: p.top_category,
            tags: p.tags,
          })),
        }),
      });
      if (!res.ok) throw new Error(`autofill_${res.status}`);
      const data = (await res.json()) as {
        name?: string;
        summary?: string;
        icon?: string;
      };
      if (data.name) setName(data.name);
      if (data.summary) setSummary(data.summary);
      if (data.icon) setIcon(data.icon);
    } catch {
      toast.error(ui.toast.folderAutofillFailed);
    } finally {
      setAutofilling(false);
    }
  }, [prompts, language, ui.toast.folderAutofillFailed]);

  // Reset + (optionally) auto-name whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setName("");
    setSummary("");
    setIcon("📁");
    if (startInCreate) {
      setView("form");
      void runAutofill();
    } else {
      setView("pick");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startInCreate]);

  const handleAddToExisting = async (folderId: string, folderName: string) => {
    try {
      await addPromptsToFolder(folderId, refs);
      toast.success(ui.toast.addedToFolder(folderName));
      onDone();
      onOpenChange(false);
    } catch {
      toast.error(ui.toast.addToFolderFailed);
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const folder = await createFolder(
        { name: trimmed, summary: summary.trim() || null, icon: icon.trim() || null },
        refs,
      );
      toast.success(ui.toast.folderCreated(folder.name));
      onDone();
      onOpenChange(false);
    } catch {
      toast.error(ui.toast.folderCreateFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-3">
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {view === "form" ? ui.folders.formCreateTitle : ui.folders.pickTitle}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {view === "form"
              ? ui.selection.selectedCount(prompts.length)
              : ui.folders.pickDescription}
          </p>
        </DialogHeader>

        {view === "pick" ? (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                setView("form");
                void runAutofill();
              }}
            >
              <FolderPlus className="h-4 w-4" />
              {ui.folders.pickCreateNew}
            </Button>

            {folders.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {ui.folders.pickExisting}
                </p>
                <ul className="max-h-[320px] space-y-1.5 overflow-y-auto">
                  {folders.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => handleAddToExisting(f.id, f.name)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg p-2.5 text-left ring-1 ring-foreground/10",
                          "transition-colors hover:bg-muted",
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
                          {f.icon || "📁"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {f.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {ui.folders.itemCount(f.items.length)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-muted-foreground">
                {ui.folders.pickNoFolders}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {ui.selection.selectedCount(prompts.length)}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => void runAutofill()}
                disabled={autofilling}
              >
                {autofilling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {autofilling ? ui.folders.autoFilling : ui.folders.autoFill}
              </Button>
            </div>

            <div className="flex gap-2">
              <div className="w-16 shrink-0 space-y-1">
                <Label className="text-xs">{ui.folders.iconLabel}</Label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="text-center text-lg"
                  maxLength={8}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">{ui.folders.nameLabel}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={ui.folders.namePlaceholder}
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{ui.folders.summaryLabel}</Label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={ui.folders.summaryPlaceholder}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {!startInCreate && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView("pick")}
                >
                  {ui.create.modalBackToChoice}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleCreate}
                disabled={saving || !name.trim()}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {saving ? ui.folders.creating : ui.folders.create}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
