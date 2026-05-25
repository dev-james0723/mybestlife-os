"use client";

import { FolderPlus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderCard } from "@/components/ai-knowledge/FolderCard";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { cn } from "@/lib/utils";
import type { PromptFolder } from "@/types/prompt";

interface FoldersTabProps {
  folders: PromptFolder[];
  isLoading: boolean;
  onOpenFolder: (folder: PromptFolder) => void;
  onNewFolder: () => void;
  onDeleteFolder: (folder: PromptFolder) => void;
}

export function FoldersTab({
  folders,
  isLoading,
  onOpenFolder,
  onNewFolder,
  onDeleteFolder,
}: FoldersTabProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[170px] animate-pulse rounded-2xl bg-muted/40 ring-1 ring-foreground/5"
          />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <EmptyState
        icon={FolderPlus}
        title={ui.states.emptyFoldersTitle}
        description={ui.states.emptyFoldersDescription}
        action={{ label: ui.folders.newFolder, onClick: onNewFolder }}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <button
        type="button"
        onClick={onNewFolder}
        className={cn(
          "group/new flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-2xl mt-3",
          "border-2 border-dashed border-foreground/15 text-muted-foreground",
          "transition-colors hover:border-primary/40 hover:text-foreground hover:bg-primary/[0.03]",
        )}
      >
        <FolderPlus className="h-7 w-7" />
        <span className="text-sm font-medium">{ui.folders.newFolder}</span>
      </button>

      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onOpen={onOpenFolder}
          onDelete={onDeleteFolder}
        />
      ))}
    </div>
  );
}
