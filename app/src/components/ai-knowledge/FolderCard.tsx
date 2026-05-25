"use client";

import { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import type { PromptFolder } from "@/types/prompt";

/**
 * Soft, illustrated folder accents. A deterministic hash keeps each folder's
 * tint stable across renders while giving the grid varied ambience. `color`
 * on the folder row (if set) overrides the palette pick.
 */
const FOLDER_PALETTE = [
  { from: "#fef3c7", to: "#fcd34d", tab: "#f59e0b" },
  { from: "#dbeafe", to: "#93c5fd", tab: "#3b82f6" },
  { from: "#dcfce7", to: "#86efac", tab: "#22c55e" },
  { from: "#f3e8ff", to: "#d8b4fe", tab: "#a855f7" },
  { from: "#fee2e2", to: "#fca5a5", tab: "#ef4444" },
  { from: "#cffafe", to: "#67e8f9", tab: "#06b6d4" },
  { from: "#fce7f3", to: "#f9a8d4", tab: "#ec4899" },
  { from: "#ffedd5", to: "#fdba74", tab: "#f97316" },
] as const;

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function accentFor(folder: PromptFolder) {
  if (folder.color) {
    return { from: folder.color, to: folder.color, tab: folder.color };
  }
  return FOLDER_PALETTE[hashString(folder.id || folder.name) % FOLDER_PALETTE.length]!;
}

interface FolderCardProps {
  folder: PromptFolder;
  onOpen: (folder: PromptFolder) => void;
  onEdit?: (folder: PromptFolder) => void;
  onDelete?: (folder: PromptFolder) => void;
}

function FolderCardImpl({ folder, onOpen, onEdit, onDelete }: FolderCardProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const accent = accentFor(folder);
  const icon = folder.icon || "📁";

  return (
    <article
      onClick={() => onOpen(folder)}
      className={cn(
        "group/folder relative cursor-pointer pt-3 transition-transform duration-200",
        "hover:-translate-y-0.5",
      )}
    >
      {/* Stacked sheets peeking out behind the folder for depth/ambience. */}
      <div className="absolute inset-x-4 top-1 h-6 rounded-t-xl bg-foreground/[0.06] ring-1 ring-foreground/5" />
      <div className="absolute inset-x-2.5 top-2 h-6 rounded-t-xl bg-foreground/[0.04]" />

      {/* Folder tab. */}
      <div
        className="absolute left-5 top-0 h-4 w-[44%] rounded-t-lg"
        style={{
          background: `linear-gradient(180deg, ${accent.tab}, ${accent.to})`,
        }}
      />

      {/* Folder body. */}
      <div
        className={cn(
          "relative flex min-h-[150px] flex-col overflow-hidden rounded-2xl rounded-tl-md p-4",
          "ring-1 ring-foreground/10 shadow-sm transition-shadow group-hover/folder:shadow-md",
        )}
        style={{
          backgroundImage: `linear-gradient(150deg, ${accent.from}33, ${accent.to}1f 60%, transparent), var(--folder-card-bg, none)`,
          backgroundColor: "var(--card)",
        }}
      >
        {/* Watermark emoji for illustrated ambience. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 -bottom-4 text-[88px] leading-none opacity-[0.07] select-none"
        >
          {icon}
        </span>

        <div className="flex items-start justify-between gap-2">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ring-1 ring-foreground/10"
            style={{ background: `${accent.tab}26` }}
          >
            {icon}
          </span>
          <span className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/10 backdrop-blur">
            {ui.folders.itemCount(folder.items.length)}
          </span>
        </div>

        <h3 className="mt-3 line-clamp-1 font-medium leading-snug">
          {folder.name}
        </h3>
        {folder.summary ? (
          <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
            {folder.summary}
          </p>
        ) : null}

        {(onEdit || onDelete) && (
          <div
            className="mt-auto flex items-center justify-end gap-1 pt-3 opacity-0 transition-opacity group-hover/folder:opacity-100 focus-within:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            {onEdit && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onEdit(folder)}
                aria-label={ui.folders.editFolder}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onDelete(folder)}
                aria-label={ui.folders.deleteFolder}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export const FolderCard = memo(FolderCardImpl);
