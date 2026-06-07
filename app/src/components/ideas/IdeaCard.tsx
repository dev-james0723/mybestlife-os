"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { IdeaCategoryBadge } from "./IdeaCategoryBadge";
import { Badge } from "@/components/ui/badge";
import { OptimizedThumbnailImage } from "@/components/shared/OptimizedThumbnailImage";
import { formatDateShort } from "@/lib/utils/date";
import {
  ideaCardVisual,
  ideaRelatedResources,
  ideaRelatedResourceCount,
  ideaTags,
  previewIdeaBody,
  previewIdeaTitle,
} from "@/lib/ideas/idea-helpers";
import { resolveIdeaRelatedCategory } from "@/lib/ideas/idea-related-display";

const TAG_CAP = 3;

function IdeaVisual({ pendingLabel }: { pendingLabel: string }) {
  // Deterministic "visual pending" placeholder — never random line art. Tuned
  // to the warm ivory paper of the real generated illustrations.
  return (
    <div className="relative flex h-full min-h-[168px] flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-b from-sky-200/80 via-rose-100/60 to-blue-300/70 text-sky-900/70 dark:from-slate-800 dark:via-violet-950/40 dark:to-slate-900 dark:text-slate-300/80">
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
  const topTags = ideaTags(idea).slice(0, TAG_CAP);
  const rel = ideaRelatedResourceCount(idea);
  const topRelated = ideaRelatedResources(idea)[0];
  const visual = ideaCardVisual(idea);
  const hasVisualBackground = Boolean(visual?.imageUrl);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      className={cn(
        hasVisualBackground
          ? "group relative flex min-h-[176px] cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-neutral-950 shadow-sm transition-[border-color,box-shadow] hover:border-white/30 hover:shadow-md"
          : "group grid min-h-[176px] cursor-pointer grid-cols-1 overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
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
      {hasVisualBackground && visual?.imageUrl ? (
        <>
          <div className="absolute inset-0" aria-hidden>
            <OptimizedThumbnailImage
              src={visual.imageUrl}
              alt=""
              className="h-full w-full object-cover object-center"
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 520px"
              variant="card"
            />
          </div>
          <div className="absolute inset-0 bg-black/45" aria-hidden />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70"
            aria-hidden
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10" aria-hidden />
        </>
      ) : (
        <IdeaVisual pendingLabel={ui.visualPending} />
      )}
      <div
        className={cn(
          "flex min-w-0 flex-col p-3.5",
          hasVisualBackground && "relative z-10 min-h-[176px] w-full text-white",
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <IdeaCategoryBadge
            category={idea.category}
            language={language}
            className={cn(hasVisualBackground && "border-white/25 bg-white/15 text-white backdrop-blur")}
          />
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-medium capitalize",
              hasVisualBackground && "border-white/25 bg-white/10 text-white backdrop-blur",
            )}
          >
            {ui.statusLabels[idea.status]}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] font-medium",
              hasVisualBackground && "border border-white/20 bg-white/15 text-white backdrop-blur",
            )}
          >
            {ui.sourceLabels[idea.source_type]}
          </Badge>
        </div>
        <h3
          className={cn(
            "line-clamp-2 text-sm font-semibold leading-snug text-foreground",
            hasVisualBackground && "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
          )}
        >
          {title}
        </h3>
        {body ? (
          <p
            className={cn(
              "mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground",
              hasVisualBackground && "text-white/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
            )}
          >
            {body}
          </p>
        ) : null}
        {topTags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {topTags.map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground",
                  hasVisualBackground && "border-white/20 bg-white/12 text-white/85 backdrop-blur",
                )}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
        <div
          className={cn(
            "mt-auto flex items-center justify-between gap-2 pt-3 text-[10px] text-muted-foreground",
            hasVisualBackground && "text-white/75",
          )}
        >
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
