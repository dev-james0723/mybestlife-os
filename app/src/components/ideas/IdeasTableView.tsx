"use client";

import type { Idea } from "@/types/database";
import type { AppLocale } from "@/lib/i18n/app-locale";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { formatDateShort } from "@/lib/utils/date";
import { displayCategory, ideaRelatedResourceCount, previewIdeaTitle } from "@/lib/ideas/idea-helpers";
import { cn } from "@/lib/utils";

export function IdeasTableView({
  items,
  language,
  onOpen,
}: {
  items: Idea[];
  language: AppLocale;
  onOpen: (idea: Idea) => void;
}) {
  const ui = getIdeasUiCopy(language);

  return (
    <div className="min-w-0 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead className="border-b border-border/60 bg-muted/20 text-xs font-medium text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{ui.tableTitle}</th>
            <th className="px-3 py-2">{ui.tableCategory}</th>
            <th className="px-3 py-2">{ui.tableStatus}</th>
            <th className="px-3 py-2">{ui.tableSource}</th>
            <th className="px-3 py-2">{ui.tableTags}</th>
            <th className="px-3 py-2 text-right">{ui.tableRelated}</th>
            <th className="px-3 py-2">{ui.tableCreated}</th>
            <th className="px-3 py-2">{ui.tableUpdated}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((idea) => {
            const tags = (idea.ai_tags ?? []).slice(0, 4).join(", ");
            const rel = ideaRelatedResourceCount(idea);
            return (
              <tr
                key={idea.id}
                className={cn(
                  "cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-muted/30",
                )}
                onClick={() => onOpen(idea)}
              >
                <td className="max-w-[220px] px-3 py-2 font-medium">
                  <span className="line-clamp-2">{previewIdeaTitle(idea, 120)}</span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {ui.categoryLabels[displayCategory(idea.category)] ?? displayCategory(idea.category)}
                </td>
                <td className="px-3 py-2 text-xs capitalize">{ui.statusLabels[idea.status]}</td>
                <td className="px-3 py-2 text-xs">{ui.sourceLabels[idea.source_type]}</td>
                <td className="max-w-[200px] px-3 py-2 text-xs text-muted-foreground">
                  <span className="line-clamp-2">{tags || "—"}</span>
                </td>
                <td className="px-3 py-2 text-right text-xs tabular-nums">{rel}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                  {formatDateShort(idea.created_at)}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                  {formatDateShort(idea.updated_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
