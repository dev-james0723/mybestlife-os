"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SlideOverPanel } from "@/components/shared/slide-over-panel";
import { useAppStore } from "@/stores/app-store";
import { usePromptStore } from "@/stores/prompt-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  pickLocalizedText,
  type CustomPrompt,
  type LibraryPrompt,
  type PromptFolder,
  type PromptFolderItemRef,
} from "@/types/prompt";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface FolderDetailDrawerProps {
  folder: PromptFolder | null;
  open: boolean;
  onClose: () => void;
  onOpenPrompt: (prompt: AnyPrompt) => void;
  onRunPrompt: (prompt: AnyPrompt) => void;
  onAddPrompts: (folder: PromptFolder) => void;
  onDeleteFolder: (folder: PromptFolder) => void;
}

export function FolderDetailDrawer({
  folder,
  open,
  onClose,
  onOpenPrompt,
  onRunPrompt,
  onAddPrompts,
  onDeleteFolder,
}: FolderDetailDrawerProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const library = usePromptStore((s) => s.library);
  const userPrompts = usePromptStore((s) => s.userPrompts);
  const updateFolder = usePromptStore((s) => s.updateFolder);
  const removePromptFromFolder = usePromptStore((s) => s.removePromptFromFolder);

  // Initialised from the folder at mount; the parent remounts this drawer per
  // folder (via `key`), so no effect is needed to keep these in sync.
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(folder?.name ?? "");
  const [summary, setSummary] = useState(folder?.summary ?? "");
  const [icon, setIcon] = useState(folder?.icon ?? "📁");

  const startEditing = () => {
    if (!folder) return;
    setName(folder.name);
    setSummary(folder.summary ?? "");
    setIcon(folder.icon ?? "📁");
    setEditing(true);
  };

  const members = useMemo<AnyPrompt[]>(() => {
    if (!folder) return [];
    const out: AnyPrompt[] = [];
    for (const ref of folder.items) {
      const p =
        ref.source === "library"
          ? library.find((lp) => lp.id === ref.prompt_id)
          : userPrompts.find((up) => up.id === ref.prompt_id);
      if (p) out.push(p);
    }
    return out;
  }, [folder, library, userPrompts]);

  if (!folder) {
    return <SlideOverPanel open={open} onClose={onClose} title="" width="lg">{null}</SlideOverPanel>;
  }

  const saveEdit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await updateFolder(folder.id, {
        name: trimmed,
        summary: summary.trim() || null,
        icon: icon.trim() || null,
      });
      toast.success(ui.toast.folderUpdated);
      setEditing(false);
    } catch {
      toast.error(ui.toast.folderUpdateFailed);
    }
  };

  const handleRemove = async (prompt: AnyPrompt) => {
    const ref: PromptFolderItemRef = {
      source: prompt.source,
      prompt_id: prompt.id,
    };
    try {
      await removePromptFromFolder(folder.id, ref);
      toast.success(ui.toast.removedFromFolder);
    } catch {
      toast.error(ui.toast.addToFolderFailed);
    }
  };

  return (
    <SlideOverPanel
      open={open}
      onClose={onClose}
      title={`${folder.icon || "📁"}  ${folder.name}`}
      description={folder.summary ?? undefined}
      width="lg"
      actions={
        !editing ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={startEditing}
              aria-label={ui.folders.editFolder}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteFolder(folder)}
              aria-label={ui.folders.deleteFolder}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        ) : undefined
      }
      footer={
        <Button
          className="w-full gap-1.5"
          onClick={() => onAddPrompts(folder)}
        >
          <Plus className="h-4 w-4" />
          {ui.folders.addPrompts}
        </Button>
      }
    >
      <div className="space-y-4">
        {editing && (
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex gap-2">
              <div className="w-16 shrink-0 space-y-1">
                <label className="text-xs text-muted-foreground">
                  {ui.folders.iconLabel}
                </label>
                <Input
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="text-center text-lg"
                  maxLength={8}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">
                  {ui.folders.nameLabel}
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {ui.folders.summaryLabel}
              </label>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                {ui.selection.cancel}
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={!name.trim()}
                className="gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {ui.folders.save}
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-muted-foreground">
          {ui.folders.itemCount(members.length)}
        </p>

        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {ui.folders.detailEmpty}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {members.map((p) => (
              <li
                key={p.id}
                className="group/item flex items-center gap-3 rounded-lg p-2.5 ring-1 ring-foreground/10"
              >
                <span className="text-lg">{p.icon || "📝"}</span>
                <button
                  type="button"
                  onClick={() => onOpenPrompt(p)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <Badge
                      variant={p.source === "library" ? "secondary" : "outline"}
                      className="text-[9px] uppercase shrink-0"
                    >
                      {p.source === "library"
                        ? ui.promptCard.libraryBadge
                        : ui.promptCard.customBadge}
                    </Badge>
                    <span className="truncate text-sm font-medium">
                      {pickLocalizedText(p.title_i18n, language)}
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRunPrompt(p)}
                  aria-label={ui.promptCard.run}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(p)}
                  aria-label={ui.folders.removeFromFolder}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SlideOverPanel>
  );
}
