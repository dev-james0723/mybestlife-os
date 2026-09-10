"use client";

import { useMemo } from "react";
import {
  ArrowUpRight,
  Copy,
  Edit3,
  ExternalLink,
  GitFork,
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
import { AIProviderIcon } from "@/components/ai-knowledge/AIProviderIcon";
import { useAppStore } from "@/stores/app-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import {
  AI_KNOWLEDGE_CHAT_TOOLS,
  type AIKnowledgeChatTool,
} from "@/lib/ai/tool-registry";
import {
  pickLocalizedText,
  type CustomPrompt,
  type LibraryPrompt,
} from "@/types/prompt";
import { cn } from "@/lib/utils";

type AnyPrompt = LibraryPrompt | CustomPrompt;

interface PromptDetailDrawerProps {
  prompt: AnyPrompt | null;
  open: boolean;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (prompt: AnyPrompt) => void;
  onOpenInAi: (prompt: AnyPrompt, tool: AIKnowledgeChatTool) => void;
  onCopyBody: (prompt: AnyPrompt) => void;
  onFork?: (prompt: LibraryPrompt) => void;
  onEdit?: (prompt: CustomPrompt) => void;
  onDelete?: (prompt: CustomPrompt) => void;
}

/**
 * Prompt detail dialog. Renders the full prompt body, variable list, tags, and
 * provenance metadata for library prompts. The action area can copy the body
 * or hand it off to the user's chosen external AI chat in a new tab.
 */
export function PromptDetailDrawer({
  prompt,
  open,
  onClose,
  isFavorite,
  onToggleFavorite,
  onOpenInAi,
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
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.detail.promptBody}
            </h3>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 font-mono text-sm leading-relaxed">
              {prompt.body}
            </pre>
          </section>

          {prompt.variables.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ui.detail.variables}
              </h3>
              <ul className="divide-y overflow-hidden rounded-lg border">
                {prompt.variables.map((v) => (
                  <li
                    key={v.name}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {`{${v.name}}`}
                    </code>
                    <span className="truncate text-right text-xs text-muted-foreground">
                      {v.label ?? v.description ?? v.name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {prompt.tags.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            <section className="space-y-1.5 rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground">
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

          <section
            aria-labelledby="prompt-ai-chat-actions"
            className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4"
          >
            <div className="mb-3 space-y-1">
              <h3 id="prompt-ai-chat-actions" className="text-sm font-semibold">
                {ui.detail.openInAi}
              </h3>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {ui.detail.openInAiHint}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AI_KNOWLEDGE_CHAT_TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenInAi(prompt, tool.id)}
                  aria-label={ui.detail.openInProvider(tool.name)}
                  className="h-10 min-w-0 justify-between gap-1.5 bg-background/55 px-2.5 hover:border-primary/35 hover:bg-background"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border/70 bg-background/80 shadow-sm">
                      <AIProviderIcon provider={tool.id} />
                    </span>
                    <span className="truncate text-xs font-medium">
                      {tool.name}
                    </span>
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="items-stretch gap-2 sm:items-center sm:justify-start">
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
        </DialogFooter>
      </OSDialogSurface>
    </Dialog>
  );
}
