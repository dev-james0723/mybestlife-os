"use client";

import { useKnowledgeStore, type KnowledgeSortKey } from "@/stores/knowledge-store";
import { typeColors, type KnowledgeItem } from "@/types/knowledge";
import { Badge } from "@/components/ui/badge";
import { KnowledgeCard } from "./KnowledgeCard";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { formatKnowledgeDate, getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { getCategoryLabel } from "@/lib/knowledge/labels";
import { collectionNamesForItem } from "@/lib/knowledge/knowledge-list-utils";
import { scoreKnowledgeItem } from "@/lib/knowledgeMatching";

interface KnowledgeTableViewProps {
  items: KnowledgeItem[];
}

export function KnowledgeTableView({ items }: KnowledgeTableViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const selectItem = useKnowledgeStore((s) => s.selectItem);
  const sortBy = useKnowledgeStore((s) => s.sortBy);
  const setSortBy = useKnowledgeStore((s) => s.setSortBy);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const searchQuery = useKnowledgeStore((s) => s.searchQuery);

  const SortHead = ({
    sk,
    children,
    className,
  }: {
    sk: KnowledgeSortKey;
    children: React.ReactNode;
    className?: string;
  }) => {
    const active = sortBy === sk;
    return (
      <th className={cn("pb-2 font-medium text-muted-foreground", className)}>
        <button
          type="button"
          className={cn(
            "flex max-w-full items-center gap-1 truncate text-left hover:text-foreground",
            active && "text-foreground",
          )}
          onClick={() => setSortBy(sk)}
        >
          <span className="truncate">{children}</span>
          {active ? <ArrowUpDown className="h-3 w-3 shrink-0 opacity-70" /> : null}
        </button>
      </th>
    );
  };

  return (
    <>
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-muted-foreground">
                <SortHead sk="contentType" className="w-[100px]">
                  {ui.tableType}
                </SortHead>
                <SortHead sk="titleAZ" className="min-w-[140px]">
                  {ui.tableTitle}
                </SortHead>
                <th className="hidden pb-2 font-medium lg:table-cell xl:w-[120px]">
                  {ui.tableCategory}
                </th>
                <th className="hidden pb-2 font-medium xl:table-cell xl:min-w-[100px]">
                  {ui.tableCollection}
                </th>
                <th className="hidden pb-2 font-medium lg:table-cell">{ui.tableTags}</th>
                <th className="hidden pb-2 font-medium 2xl:table-cell">{ui.tableSource}</th>
                <th className="hidden pb-2 font-medium lg:table-cell xl:max-w-[200px]">
                  {ui.tableAiSummary}
                </th>
                <SortHead sk="latest" className="w-[100px] whitespace-nowrap">
                  {ui.tableAdded}
                </SortHead>
                <SortHead sk="updated" className="w-[100px] whitespace-nowrap">
                  {ui.tableUpdated}
                </SortHead>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const colors = typeColors[item.contentType];
                const allTags = [...item.aiTags, ...item.manualTags];
                const collections = collectionNamesForItem(item, smartCollections);
                const relevance = searchQuery.trim()
                  ? scoreKnowledgeItem(item, searchQuery, smartCollections)
                  : null;
                return (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40"
                    onClick={() => selectItem(item.id)}
                  >
                    <td className="py-2 align-top">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] capitalize",
                          colors.bg,
                          colors.text,
                          colors.border,
                          colors.darkBg,
                          colors.darkText,
                        )}
                      >
                        {colors.icon} {ui.typeLabels[item.contentType]}
                      </Badge>
                    </td>
                    <td className="py-2 align-top font-medium">
                      <span className="line-clamp-2">{item.title}</span>
                      {relevance ? (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                          <span className="tabular-nums">{relevance.normalizedScore}% match</span>
                        </div>
                      ) : null}
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground lg:table-cell">
                      <span className="line-clamp-1" title={item.category ? getCategoryLabel(item.category) : ""}>
                        {item.category ? getCategoryLabel(item.category) : "—"}
                      </span>
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground xl:table-cell">
                      <span className="line-clamp-1" title={collections || undefined}>
                        {collections || "—"}
                      </span>
                    </td>
                    <td className="hidden py-2 align-top lg:table-cell">
                      <div className="flex max-w-[220px] flex-nowrap gap-1 overflow-hidden">
                        {allTags.slice(0, 4).map((t) => (
                          <Badge
                            key={t}
                            variant="secondary"
                            className="h-5 max-w-[100px] shrink-0 truncate text-[10px] font-normal"
                          >
                            {t}
                          </Badge>
                        ))}
                        {allTags.length > 4 ? (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            +{allTags.length - 4}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground 2xl:table-cell">
                      <span className="line-clamp-1">{item.sourceDomain || item.label || "—"}</span>
                    </td>
                    <td className="hidden py-2 align-top text-xs text-muted-foreground lg:table-cell xl:max-w-[220px]">
                      <span
                        className="line-clamp-2"
                        title={item.aiTldr || item.aiSummary}
                      >
                        {item.status === "processing"
                          ? `✦ ${ui.tableProcessing}`
                          : item.status === "error"
                            ? `⚠ ${ui.tableFailed}`
                            : item.aiTldr || item.aiSummary || "—"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2 align-top text-xs text-muted-foreground">
                      {formatKnowledgeDate(language, item.dateAdded)}
                    </td>
                    <td className="whitespace-nowrap py-2 align-top text-xs text-muted-foreground">
                      {formatKnowledgeDate(language, item.dateModified)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {items.map((item) => (
          <KnowledgeCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
