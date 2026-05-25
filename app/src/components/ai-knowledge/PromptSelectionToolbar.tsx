"use client";

import { FolderPlus, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import type { SelectionIntent } from "@/stores/prompt-store";

interface PromptSelectionToolbarProps {
  count: number;
  /** Number of selected custom prompts (the only ones that can be deleted). */
  deletableCount: number;
  intent: SelectionIntent;
  onAddToFolder: () => void;
  onAddFavorites: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function PromptSelectionToolbar({
  count,
  deletableCount,
  intent,
  onAddToFolder,
  onAddFavorites,
  onDelete,
  onCancel,
}: PromptSelectionToolbarProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        className={cn(
          "glass-modal-surface pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5",
          "shadow-lg ring-1 ring-foreground/10",
        )}
      >
        <span className="px-1.5 text-sm font-medium tabular-nums">
          {count > 0 ? ui.selection.selectedCount(count) : ui.selection.emptyHint}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {intent === "new_folder" ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={onAddToFolder}
              disabled={count === 0}
            >
              <FolderPlus className="h-4 w-4" />
              {ui.selection.createFolderFromSelection(count)}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={onAddToFolder}
                disabled={count === 0}
              >
                <FolderPlus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {ui.selection.addToFolder}
                </span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={onAddFavorites}
                disabled={count === 0}
              >
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {ui.selection.addToFavorites}
                </span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={deletableCount === 0}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{ui.selection.delete}</span>
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5"
            onClick={onCancel}
            aria-label={ui.selection.cancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
