"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Pencil,
  Star,
  Trash2,
  MoreHorizontal,
  Paperclip,
  Asterisk,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AnyPrompt } from "@/types/ai-coach";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";
import {
  getLocalizedDescription,
  getLocalizedTitle,
} from "@/lib/prompts/compiler";
import type { AppLocale } from "@/lib/i18n/app-locale";

interface PromptCardProps {
  prompt: AnyPrompt;
  locale: AppLocale;
  copy: AICoachCopy;
  isFavorite: boolean;
  usageCount?: number;
  useHref: string;
  onToggleFavorite: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PromptCard({
  prompt,
  locale,
  copy,
  isFavorite,
  usageCount,
  useHref,
  onToggleFavorite,
  onEdit,
  onDelete,
}: PromptCardProps) {
  const title = getLocalizedTitle(prompt, locale);
  const description = getLocalizedDescription(prompt, locale);

  const numVars =
    (prompt.required_variables?.length ?? 0) +
    (prompt.optional_variables?.length ?? 0);
  const numAttach = prompt.attachment_categories?.length ?? 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="group relative flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:ring-foreground/20"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 to-amber-500/15 text-lg">
          <span aria-hidden>{prompt.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {title}
          </h3>
          {prompt.kind === "custom" ? (
            <Badge variant="secondary" className="mt-1 font-normal">
              <Asterisk className="mr-1 h-3 w-3" />
              {copy.card.customBadge}
            </Badge>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              isFavorite ? copy.card.unfavorite : copy.card.favorite
            }
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
            className="h-8 w-8"
          >
            <Star
              className={cn(
                "h-4 w-4",
                isFavorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
              )}
            />
          </Button>

          {prompt.kind === "custom" ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-8 w-8" />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{copy.card.edit}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onSelect={() => onEdit()}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {copy.card.edit}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <DropdownMenuItem
                    onSelect={() => onDelete()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {copy.card.delete}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      {description ? (
        <p className="line-clamp-3 text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {numVars > 0 ? (
          <Badge variant="outline" className="gap-1 font-normal">
            {copy.card.requiresVars(numVars)}
          </Badge>
        ) : null}
        {numAttach > 0 ? (
          <Badge variant="outline" className="gap-1 font-normal">
            <Paperclip className="h-3 w-3" />
            {copy.card.attachesFiles(numAttach)}
          </Badge>
        ) : null}
        {usageCount && usageCount > 0 ? (
          <span className="ml-auto">{copy.card.usedCount(usageCount)}</span>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-end">
        <Button size="sm" render={<Link href={useHref} />}>
          {copy.card.use}
        </Button>
      </div>
    </motion.article>
  );
}
