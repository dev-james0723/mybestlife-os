"use client";

import { memo, useMemo } from "react";
import {
  Copy,
  Edit3,
  GitFork,
  Play,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { pickLocalizedText, type CustomPrompt, type LibraryPrompt } from "@/types/prompt";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface PromptCardProps {
  prompt: AnyPrompt;
  isFavorite: boolean;
  onOpen: (prompt: AnyPrompt) => void;
  onRun: (prompt: AnyPrompt) => void;
  onToggleFavorite: (prompt: AnyPrompt) => void;
  onFork?: (prompt: LibraryPrompt) => void;
  onEdit?: (prompt: CustomPrompt) => void;
  onDelete?: (prompt: CustomPrompt) => void;
  /** When true, the card is in multi-select mode: clicking toggles selection. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (prompt: AnyPrompt) => void;
}

const MAX_TAG_CHIPS = 3;

function PromptCardImpl({
  prompt,
  isFavorite,
  onOpen,
  onRun,
  onToggleFavorite,
  onFork,
  onEdit,
  onDelete,
  selectable = false,
  selected = false,
  onToggleSelect,
}: PromptCardProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const title = pickLocalizedText(prompt.title_i18n, language);
  const description = pickLocalizedText(prompt.description_i18n, language);
  const categoryLabel = ui.topCategoryLabels[prompt.top_category];

  const visibleTags = prompt.tags.slice(0, MAX_TAG_CHIPS);
  const overflowTags = prompt.tags.length - visibleTags.length;

  const variableLabel = useMemo(
    () => ui.promptCard.variablesCount(prompt.variables.length),
    [ui, prompt.variables.length],
  );

  const usedLabel =
    prompt.source === "custom"
      ? ui.promptCard.usedCount(prompt.usage_count)
      : null;

  const handleCardClick = () => {
    if (selectable) onToggleSelect?.(prompt);
    else onOpen(prompt);
  };

  return (
    <article
      onClick={handleCardClick}
      data-selected={selectable && selected ? "" : undefined}
      className={cn(
        "group/card relative flex flex-col rounded-xl bg-card p-5 text-sm ring-1 ring-foreground/10",
        "transition-all cursor-pointer hover:ring-foreground/20 hover:shadow-sm",
        selectable && selected && "ring-2 ring-primary bg-primary/[0.04]",
      )}
    >
      {selectable && (
        <div className="absolute right-2.5 top-2.5 z-10">
          <Checkbox
            checked={selected}
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={() => onToggleSelect?.(prompt)}
          />
        </div>
      )}

      {/* Source + featured badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant={prompt.source === "library" ? "secondary" : "outline"}
            className="text-[10px] uppercase tracking-wide"
          >
            {prompt.source === "library"
              ? ui.promptCard.libraryBadge
              : ui.promptCard.customBadge}
          </Badge>
          {prompt.source === "library" && prompt.is_featured && (
            <Badge variant="default" className="text-[10px] gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {ui.promptCard.featuredBadge}
            </Badge>
          )}
          {prompt.source === "custom" && prompt.forked_from_prompt_slug && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
              {ui.promptCard.forkedFromBadge(prompt.forked_from_prompt_slug)}
            </span>
          )}
        </div>
        {!selectable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(prompt);
            }}
            aria-label={
              isFavorite ? ui.promptCard.unfavorite : ui.promptCard.favorite
            }
            aria-pressed={isFavorite}
            className={cn(
              "shrink-0 rounded-md p-1 transition-colors",
              "hover:bg-muted",
              isFavorite ? "text-amber-500" : "text-muted-foreground",
            )}
          >
            <Star
              className={cn("h-4 w-4", isFavorite && "fill-current")}
            />
          </button>
        )}
      </div>

      <h3 className="font-medium leading-snug line-clamp-2 mb-1">{title}</h3>
      <p className="text-muted-foreground text-[13px] line-clamp-3">
        {description}
      </p>

      {visibleTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
          {overflowTags > 0 && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              +{overflowTags}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">{categoryLabel}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span>{variableLabel}</span>
          {usedLabel && (
            <>
              <span aria-hidden>•</span>
              <span>{usedLabel}</span>
            </>
          )}
        </span>
      </div>

      <div
        className={cn(
          "mt-4 flex items-center justify-end gap-1 opacity-0 group-hover/card:opacity-100 focus-within:opacity-100 transition-opacity",
          selectable && "hidden",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {prompt.source === "library" && onFork && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onFork(prompt)}
            aria-label={ui.promptCard.fork}
          >
            <GitFork className="h-3 w-3" />
            <span className="hidden sm:inline">{ui.promptCard.fork}</span>
          </Button>
        )}
        {prompt.source === "custom" && onEdit && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onEdit(prompt)}
            aria-label={ui.promptCard.edit}
          >
            <Edit3 className="h-3 w-3" />
            <span className="hidden sm:inline">{ui.promptCard.edit}</span>
          </Button>
        )}
        {prompt.source === "custom" && onDelete && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onDelete(prompt)}
            aria-label={ui.promptCard.delete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="xs"
          onClick={() => onRun(prompt)}
          aria-label={ui.promptCard.run}
        >
          <Play className="h-3 w-3" />
          {ui.promptCard.run}
        </Button>
      </div>
    </article>
  );
}

export const PromptCard = memo(PromptCardImpl);

// ---------------------------------------------------------------------------
// Compact list row variant for the "list" layout.
// ---------------------------------------------------------------------------

type PromptListRowProps = PromptCardProps;

function PromptListRowImpl({
  prompt,
  isFavorite,
  onOpen,
  onRun,
  onToggleFavorite,
  onFork,
  selectable = false,
  selected = false,
  onToggleSelect,
}: PromptListRowProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const title = pickLocalizedText(prompt.title_i18n, language);
  const description = pickLocalizedText(prompt.description_i18n, language);
  const categoryLabel = ui.topCategoryLabels[prompt.top_category];

  const handleRowClick = () => {
    if (selectable) onToggleSelect?.(prompt);
    else onOpen(prompt);
  };

  return (
    <li
      onClick={handleRowClick}
      data-selected={selectable && selected ? "" : undefined}
      className={cn(
        "group/row flex items-center gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
        "transition-all cursor-pointer hover:ring-foreground/20",
        selectable && selected && "ring-2 ring-primary bg-primary/[0.04]",
      )}
    >
      {selectable ? (
        <Checkbox
          checked={selected}
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => onToggleSelect?.(prompt)}
        />
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(prompt);
          }}
          aria-label={isFavorite ? ui.promptCard.unfavorite : ui.promptCard.favorite}
          className={cn(
            "shrink-0 rounded-md p-1 transition-colors hover:bg-muted",
            isFavorite ? "text-amber-500" : "text-muted-foreground",
          )}
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge
            variant={prompt.source === "library" ? "secondary" : "outline"}
            className="text-[10px] uppercase shrink-0"
          >
            {prompt.source === "library"
              ? ui.promptCard.libraryBadge
              : ui.promptCard.customBadge}
          </Badge>
          <h3 className="font-medium truncate">{title}</h3>
        </div>
        <p className="text-muted-foreground text-xs line-clamp-1 mt-0.5">
          {description}
        </p>
      </div>

      <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
        <span className="truncate max-w-[140px]">{categoryLabel}</span>
        <span>{ui.promptCard.variablesCount(prompt.variables.length)}</span>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 shrink-0 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity",
          selectable && "hidden",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {prompt.source === "library" && onFork && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onFork(prompt)}
            aria-label={ui.promptCard.fork}
          >
            <GitFork className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onOpen(prompt)}
          aria-label={ui.detail.copyBody}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button size="xs" onClick={() => onRun(prompt)}>
          <Play className="h-3 w-3" />
          {ui.promptCard.run}
        </Button>
      </div>
    </li>
  );
}

export const PromptListRow = memo(PromptListRowImpl);
