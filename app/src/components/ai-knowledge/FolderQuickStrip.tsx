"use client";

import { ChevronRight } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { cn } from "@/lib/utils";
import type { PromptFolder } from "@/types/prompt";

interface FolderQuickStripProps {
  folders: PromptFolder[];
  onOpenFolder: (folder: PromptFolder) => void;
  onSeeAll: () => void;
}

/**
 * Compact, horizontally-scrolling row of folder chips shown above the prompt
 * grid on the Library / My prompts / Favorites tabs — quick access to open a
 * folder without leaving the current tab.
 */
export function FolderQuickStrip({
  folders,
  onOpenFolder,
  onSeeAll,
}: FolderQuickStripProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  if (folders.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {ui.folders.quickStripTitle}
        </span>
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {ui.folders.open}
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => onOpenFolder(folder)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10",
              "transition-colors hover:ring-foreground/20 hover:bg-muted/40",
            )}
          >
            <span className="text-base">{folder.icon || "📁"}</span>
            <span className="max-w-[160px] truncate text-sm font-medium">
              {folder.name}
            </span>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
              {folder.items.length}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
