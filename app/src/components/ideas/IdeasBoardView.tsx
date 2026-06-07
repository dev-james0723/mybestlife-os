"use client";

import { useMemo } from "react";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { useIdeasStore } from "@/stores/ideas-store";
import { displayCategory } from "@/lib/ideas/idea-helpers";
import { IDEA_CATEGORIES } from "@/lib/ideas/constants";
import { IdeaCard } from "./IdeaCard";

const STATUS_COLUMNS = ["captured", "reviewed", "archived"] satisfies Idea["status"][];
const SOURCE_COLUMNS = ["text", "voice", "share"] satisfies Idea["source_type"][];

function groupKey(idea: Idea, groupBy: "status" | "category" | "source_type"): string {
  if (groupBy === "status") return idea.status;
  if (groupBy === "category") return displayCategory(idea.category);
  return idea.source_type;
}

export function IdeasBoardView({
  items,
  language,
  onOpen,
}: {
  items: Idea[];
  language: AppLocale;
  onOpen: (idea: Idea) => void;
}) {
  const ui = getIdeasUiCopy(language);
  const boardGroupBy = useIdeasStore((s) => s.boardGroupBy);

  const columns = useMemo(() => {
    const map = new Map<string, Idea[]>();
    const seededKeys =
      boardGroupBy === "status"
        ? STATUS_COLUMNS
        : boardGroupBy === "source_type"
          ? SOURCE_COLUMNS
          : [];

    for (const key of seededKeys) map.set(key, []);
    for (const idea of items) {
      const k = groupKey(idea, boardGroupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(idea);
    }
    const entries = [...map.entries()];

    if (seededKeys.length > 0) {
      const order = new Map<string, number>(
        seededKeys.map((key, index) => [key, index]),
      );
      return entries.sort(([a], [b]) => {
        const ai = order.get(a) ?? Number.MAX_SAFE_INTEGER;
        const bi = order.get(b) ?? Number.MAX_SAFE_INTEGER;
        return ai === bi ? a.localeCompare(b) : ai - bi;
      });
    }

    const categoryOrder = new Map(IDEA_CATEGORIES.map((key, index) => [key, index]));
    return entries.sort(([a], [b]) => {
      const ai = categoryOrder.get(a as (typeof IDEA_CATEGORIES)[number]) ?? Number.MAX_SAFE_INTEGER;
      const bi = categoryOrder.get(b as (typeof IDEA_CATEGORIES)[number]) ?? Number.MAX_SAFE_INTEGER;
      return ai === bi ? a.localeCompare(b) : ai - bi;
    });
  }, [items, boardGroupBy]);

  const columnTitle = (key: string) => {
    if (boardGroupBy === "status") return ui.statusLabels[key as Idea["status"]] ?? key;
    if (boardGroupBy === "category")
      return ui.categoryLabels[key as keyof typeof ui.categoryLabels] ?? key;
    return ui.sourceLabels[key as Idea["source_type"]] ?? key;
  };

  return (
    <div className="flex min-w-0 gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
      {columns.map(([key, list]) => (
        <div
          key={key}
          className="flex h-[min(72vh,620px)] w-[min(84vw,320px)] shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/45 shadow-sm sm:w-[320px]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/50 bg-muted/15 px-3.5 py-3">
            <p className="min-w-0 truncate text-sm font-semibold tracking-tight">
              {columnTitle(key)}
            </p>
            <span className="rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
              {list.length}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
            {list.length === 0 ? (
              <div className="min-h-[112px] rounded-lg border border-dashed border-border/55 bg-muted/10" />
            ) : (
              list.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  language={language}
                  onOpen={onOpen}
                  variant="board"
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
