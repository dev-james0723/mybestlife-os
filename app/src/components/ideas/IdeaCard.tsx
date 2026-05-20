"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { IdeaCategoryBadge } from "./IdeaCategoryBadge";
import { Badge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/utils/date";
import {
  ideaRelatedResourceCount,
  previewIdeaBody,
  previewIdeaTitle,
} from "@/lib/ideas/idea-helpers";

const TAG_CAP = 3;

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
  const body = previewIdeaBody(idea, 120);
  const manual = idea.manual_tags ?? [];
  const ai = idea.ai_tags ?? [];
  const topTags = [...manual.slice(0, 2), ...ai.slice(0, Math.max(0, TAG_CAP - Math.min(2, manual.length)))].slice(
    0,
    TAG_CAP,
  );
  const rel = ideaRelatedResourceCount(idea);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group flex min-h-[148px] cursor-pointer flex-col rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md",
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
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <IdeaCategoryBadge category={idea.category} language={language} />
        <Badge variant="outline" className="text-[10px] font-medium capitalize">
          {ui.statusLabels[idea.status]}
        </Badge>
        <Badge variant="secondary" className="text-[10px] font-medium">
          {ui.sourceLabels[idea.source_type]}
        </Badge>
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground">
        {title}
      </h3>
      {body ? (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{body}</p>
      ) : null}
      {topTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
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
      <div className="mt-auto flex items-center justify-between pt-3 text-[10px] text-muted-foreground">
        <span>{ui.relatedCount(rel)}</span>
        <span className="tabular-nums">{formatDateShort(idea.updated_at)}</span>
      </div>
    </motion.div>
  );
}
