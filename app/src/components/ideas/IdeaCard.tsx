"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { IdeaCategoryBadge } from "./IdeaCategoryBadge";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/utils/date";
import {
  ideaCardVisual,
  ideaRelatedResources,
  ideaRelatedResourceCount,
  previewIdeaBody,
  previewIdeaTitle,
} from "@/lib/ideas/idea-helpers";
import { resolveIdeaRelatedCategory } from "@/lib/ideas/idea-related-display";

const TAG_CAP = 3;

function IdeaVisual({ idea, pendingLabel }: { idea: Idea; pendingLabel: string }) {
  const visual = ideaCardVisual(idea);

  if (visual?.imageUrl) {
    return (
      <div className="relative h-36 w-full overflow-hidden bg-muted/20 sm:h-full sm:min-h-[168px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- Gemini/Supabase public icon URL */}
        <img
          src={visual.imageUrl}
          alt=""
          className="h-full w-full object-cover object-center"
          loading="lazy"
        />
      </div>
    );
  }

  // Deterministic "visual pending" placeholder — never random line art. Tuned
  // to the warm ivory paper of the real generated illustrations.
  return (
    <div className="relative flex h-36 w-full flex-col items-center justify-center gap-2 overflow-hidden bg-[#f5efe3] text-[#8a7857] sm:h-full sm:min-h-[168px] dark:bg-[#1b1915] dark:text-[#a9986f]">
      <Sparkles className="h-6 w-6 opacity-70" aria-hidden />
      <span className="px-3 text-center text-[10px] font-medium leading-tight opacity-80">
        {pendingLabel}
      </span>
    </div>
  );
}

export function IdeaCard({
  idea,
  language,
  className,
  onOpen,
}: {
  idea: Idea;
  language: AppLocale;
  className?: string;
  onOpen: (idea: Idea) => void;
}) {
  const ui = getIdeasUiCopy(language);
  const title = previewIdeaTitle(idea);
  const body = previewIdeaBody(idea, 220);
  const ai = idea.ai_tags ?? [];
  const topTags = ai.slice(0, TAG_CAP);
  const rel = ideaRelatedResourceCount(idea);
  const topRelated = ideaRelatedResources(idea)[0];
  const visualStatus = ideaCardVisual(idea)?.status;
  const visualPendingLabel =
    visualStatus === "generating"
      ? ui.visualGenerating
      : visualStatus === "failed"
        ? ui.visualFailed
        : visualStatus === "queued"
          ? ui.visualQueued
          : ui.visualPending;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group grid cursor-pointer grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md sm:min-h-[176px] sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
        className,
      )}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(idea)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(idea);
        }
      }}
    >
      <IdeaVisual idea={idea} pendingLabel={visualPendingLabel} />
      <div className="flex min-w-0 flex-col p-3.5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <IdeaCategoryBadge category={idea.category} language={language} />
          <Badge variant="outline" className="text-[10px] font-medium capitalize">
            {ui.statusLabels[idea.status]}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-medium">
            {ui.sourceLabels[idea.source_type]}
          </Badge>
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {title}
        </h3>
        {body ? (
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{body}</p>
        ) : null}
        {topTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {topTags.map((t) => (
              <span
                key={t}
                className="rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[10px] text-muted-foreground">
          <span className="min-w-0 truncate">
            {topRelated
              ? `${ui.relatedCategoryLabels[resolveIdeaRelatedCategory(topRelated)]} · ${topRelated.percentage}%`
              : ui.relatedCount(rel)}
          </span>
          <span className="shrink-0 tabular-nums">{formatDateShort(idea.updated_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}
