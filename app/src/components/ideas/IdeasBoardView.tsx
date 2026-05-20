"use client";

import { useMemo } from "react";
import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { useIdeasStore } from "@/stores/ideas-store";
import { displayCategory } from "@/lib/ideas/idea-helpers";
import { IdeaCard } from "./IdeaCard";

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
    for (const idea of items) {
      const k = groupKey(idea, boardGroupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(idea);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items, boardGroupBy]);

  const columnTitle = (key: string) => {
    if (boardGroupBy === "status") return ui.statusLabels[key as Idea["status"]] ?? key;
    if (boardGroupBy === "category")
      return ui.categoryLabels[key as keyof typeof ui.categoryLabels] ?? key;
    return ui.sourceLabels[key as Idea["source_type"]] ?? key;
  };

  return (
    <div className="flex min-w-0 gap-3 overflow-x-auto pb-1">
      {columns.map(([key, list]) => (
        <div
          key={key}
          className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-border/60 bg-muted/10"
        >
          <div className="border-b border-border/50 px-3 py-2">
            <p className="text-xs font-semibold tracking-tight">{columnTitle(key)}</p>
            <p className="text-[10px] text-muted-foreground">{list.length}</p>
          </div>
          <div className="flex max-h-[min(70vh,560px)] flex-col gap-3 overflow-y-auto p-3">
            {list.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} language={language} onOpen={onOpen} className="min-h-0" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
