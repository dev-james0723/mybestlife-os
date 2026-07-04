"use client";

import { useMemo } from "react";
import {
  Copy,
  Edit3,
  ExternalLink,
  GitFork,
  Play,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OSDialogSurface } from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { pickLocalizedText, type CustomPrompt, type LibraryPrompt } from "@/types/prompt";
import { cn } from "@/lib/utils";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface PromptDetailDrawerProps {
  prompt: AnyPrompt | null;
  open: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (prompt: AnyPrompt) => void;
  onRun: (prompt: AnyPrompt) => void;
  onCopyBody: (prompt: AnyPrompt) => void;
  onFork?: (prompt: LibraryPrompt) => void;
  onEdit?: (prompt: CustomPrompt) => void;
  onDelete?: (prompt: CustomPrompt) => void;
}

/**
 * Prompt detail dialog. Renders the full prompt body, variable list, tags, and
 * provenance metadata for library prompts. Action bar exposes run, copy,
 * favorite, fork/edit/delete depending on the prompt source.
 */
export function PromptDetailDrawer({
  prompt,
  open,
  onClose,
  isFavorite,
  onToggleFavorite,
  onRun,
  onCopyBody,
  onFork,
  onEdit,
  onDelete,
}: PromptDetailDrawerProps) {
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);

  const title = useMemo(
    () => (prompt ? pickLocalizedText(prompt.title_i18n, language) : ""),
    [prompt, language],
  );
  const description = useMemo(
    () =>
      prompt ? pickLocalizedText(prompt.description_i18n, language) : undefined,
    [prompt, language],
  );

  if (!prompt) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <OSDialogSurface size="2xl">
          <p className="py-8 text-center text-sm text-muted-foreground">
            {ui.states.loading}
          </p>
        </OSDialogSurface>
      </Dialog>
    );
  }

  const categoryLabel = ui.topCategoryLabels[prompt.top_category];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <OSDialogSurface
        size="2xl"
        className="max-h-[min(90vh,860px)] overflow-y-auto"
      >
        <DialogHeader className="pr-12">
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="leading-snug">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="mt-1">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(prompt)}
              aria-label={
                isFavorite ? ui.promptCard.unfavorite : ui.promptCard.favorite
              }
              aria-pressed={isFavorite}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted",
                isFavorite ? "text-amber-500" : "text-muted-foreground",
              )}
            >
              <Star className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={prompt.source === "library" ? "secondary" : "outline"}
            className="text-[10px] uppercase"
          >
            {prompt.source === "library"
              ? ui.promptCard.libraryBadge
              : ui.promptCard.customBadge}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {categoryLabel}
          </Badge>
          {prompt.source === "library" && prompt.is_featured && (
            <Badge variant="default" className="text-[10px]">
              {ui.promptCard.featuredBadge}
            </Badge>
          )}
          {prompt.source === "custom" && prompt.forked_from_prompt_slug && (
            <Badge variant="ghost" className="text-[10px]">
              {ui.promptCard.forkedFromBadge(prompt.forked_from_prompt_slug)}
            </Badge>
          )}
        </div>

        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {ui.detail.promptBody}
          </h3>
          <pre className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
            {prompt.body}
          </pre>
        </section>

        {prompt.variables.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {ui.detail.variables}
            </h3>
            <ul className="divide-y rounded-lg border overflow-hidden">
              {prompt.variables.map((v) => (
                <li
                  key={v.name}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                    {`{${v.name}}`}
                  </code>
                  <span className="text-xs text-muted-foreground text-right truncate">
                    {v.label ?? v.description ?? v.name}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {prompt.tags.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {ui.detail.tags}
            </h3>
            <div className="flex flex-wrap gap-1">
              {prompt.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          </section>
        )}

        {prompt.source === "library" && prompt.provenance && (
          <section className="rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {ui.detail.source}
            </h3>
            {prompt.provenance.source_url && (
              <a
                href={prompt.provenance.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                {ui.detail.sourceLink}
              </a>
            )}
            {prompt.provenance.license && (
              <p>{ui.detail.license(prompt.provenance.license)}</p>
            )}
            {prompt.provenance.attribution && (
              <p>{ui.detail.attribution(prompt.provenance.attribution)}</p>
            )}
          </section>
        )}
        </div>

        <DialogFooter className="items-stretch justify-between gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopyBody(prompt)}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              {ui.detail.copyBody}
            </Button>
            {prompt.source === "library" && onFork && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFork(prompt)}
                className="gap-1.5"
              >
                <GitFork className="h-3.5 w-3.5" />
                {ui.promptCard.fork}
              </Button>
            )}
            {prompt.source === "custom" && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(prompt)}
                className="gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {ui.promptCard.edit}
              </Button>
            )}
            {prompt.source === "custom" && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(prompt)}
                aria-label={ui.promptCard.delete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Button size="sm" onClick={() => onRun(prompt)} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            {ui.detail.runWithAi}
          </Button>
        </DialogFooter>
      </OSDialogSurface>
    </Dialog>
  );
}
