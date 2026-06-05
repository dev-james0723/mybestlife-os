"use client";

import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeChapterMapResponse } from "@/lib/life-agent/intelligence-types";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { cn } from "@/lib/utils";

type LifeChapterMapProps = {
  ui: LifeAgentUiCopy;
  data: LifeChapterMapResponse;
  className?: string;
};

export function LifeChapterMap({ ui, data, className }: LifeChapterMapProps) {
  return (
    <article className={cn("space-y-4", className)}>
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        role="list"
        aria-label={ui.lifeChapterMapTitle}
      >
        {data.chapters.map((chapter, index) => (
          <div
            key={chapter.id}
            role="listitem"
            className={cn(
              "relative rounded-2xl border border-border/60 bg-gradient-to-br from-card/80 to-muted/30 p-4 shadow-sm",
              index === 0 && "sm:col-span-2 xl:col-span-1 ring-1 ring-primary/20",
            )}
          >
            <h4 className="text-sm font-semibold">{chapter.title}</h4>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
              {chapter.description}
            </p>
            {chapter.activeProjects.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {ui.chapterProjectsLabel}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs">
                  {chapter.activeProjects.slice(0, 4).map((p) => (
                    <li key={p} className="truncate">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {chapter.relatedPeople.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {ui.chapterPeopleLabel}
                </p>
                <p className="text-xs">{chapter.relatedPeople.join(", ")}</p>
              </div>
            )}
            {chapter.openLoops.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">
                  {ui.chapterLoopsLabel}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {chapter.openLoops.join(" · ")}
                </p>
              </div>
            )}
            {chapter.nextAction && (
              <p className="mt-2 text-xs font-medium text-primary/90">
                {ui.chapterNextActionLabel}: {chapter.nextAction}
              </p>
            )}
            {chapter.emotionalTone && (
              <p className="mt-2 text-[11px] italic text-muted-foreground">
                {chapter.emotionalTone}
              </p>
            )}
          </div>
        ))}
      </div>
      {data.chapters.length === 0 && (
        <p className="text-sm text-muted-foreground">{ui.intelligenceEmpty}</p>
      )}
      <AgentMemoryUsedPanel ui={ui} items={data.memoryUsed} />
    </article>
  );
}
