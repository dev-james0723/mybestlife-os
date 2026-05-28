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
  ideaCardVisual,
  ideaRelatedResources,
  ideaRelatedResourceCount,
  previewIdeaBody,
  previewIdeaTitle,
} from "@/lib/ideas/idea-helpers";

const TAG_CAP = 3;

const DEFAULT_PALETTES = [
  ["#22c55e", "#38bdf8", "#f97316", "#e879f9"],
  ["#06b6d4", "#facc15", "#fb7185", "#a3e635"],
  ["#60a5fa", "#34d399", "#f59e0b", "#f472b6"],
  ["#14b8a6", "#f43f5e", "#c084fc", "#fde047"],
];

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function visualPalette(seed: string, palette?: string[]): string[] {
  if (palette && palette.length >= 3) return palette;
  return DEFAULT_PALETTES[hashString(seed) % DEFAULT_PALETTES.length] ?? DEFAULT_PALETTES[0]!;
}

function IdeaVisual({ idea, title }: { idea: Idea; title: string }) {
  const visual = ideaCardVisual(idea);
  const seed = visual?.fallbackSeed ?? `${idea.id}:${title}`;
  const palette = visualPalette(seed, visual?.palette);
  const h = hashString(seed);
  const p = (i: number, min: number, span: number) => min + ((h >> (i * 3)) % span);

  if (visual?.imageUrl) {
    return (
      <div className="relative h-full min-h-[168px] overflow-hidden bg-muted/20">
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

  return (
    <div className="relative h-full min-h-[168px] overflow-hidden bg-muted/20">
      <svg viewBox="0 0 120 180" aria-hidden className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <rect width="120" height="180" fill="rgba(255,255,255,0.02)" />
        <path
          d={`M${p(1, 18, 28)} ${p(2, 28, 24)} C ${p(3, 48, 30)} ${p(4, 8, 36)}, ${p(5, 86, 28)} ${p(6, 50, 36)}, ${p(7, 118, 20)} ${p(8, 22, 28)}`}
          fill="none"
          stroke={palette[0]}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d={`M${p(9, 20, 22)} ${p(10, 92, 24)} Q ${p(11, 74, 28)} ${p(12, 114, 18)}, ${p(13, 132, 14)} ${p(14, 82, 30)}`}
          fill="none"
          stroke={palette[1]}
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx={p(15, 42, 72)} cy={p(16, 40, 60)} r={p(17, 14, 22)} fill="none" stroke={palette[2]} strokeWidth="6" />
        <path
          d={`M${p(18, 28, 24)} ${p(19, 132, 10)} L ${p(20, 78, 26)} ${p(21, 106, 20)} L ${p(22, 128, 16)} ${p(23, 132, 12)}`}
          fill="none"
          stroke={palette[3] ?? palette[0]}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group grid min-h-[176px] cursor-pointer grid-cols-[minmax(0,1fr)_minmax(0,2fr)] overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-[border-color,box-shadow] hover:border-border hover:shadow-md",
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
      <IdeaVisual idea={idea} title={title} />
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
            {topRelated ? `${topRelated.percentage}% ${ui.relatedScopeLabels[topRelated.scope]}` : ui.relatedCount(rel)}
          </span>
          <span className="shrink-0 tabular-nums">{formatDateShort(idea.updated_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}
