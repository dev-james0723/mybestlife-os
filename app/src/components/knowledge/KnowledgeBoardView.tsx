"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { CONTENT_TYPES, typeColors, type KnowledgeItem } from "@/types/knowledge";
import { KnowledgeCard } from "./KnowledgeCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pin, PinOff, Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { cn } from "@/lib/utils";
import { getKnowledgeDisplayContentType } from "@/lib/knowledge/display-content-type";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface KnowledgeBoardViewProps {
  items: KnowledgeItem[];
  isLandscapeMode?: boolean;
}

type BoardColumn = {
  key: string;
  label: string;
  items: KnowledgeItem[];
  color?: string;
};

type FrozenColumnsState = {
  groupBy: "type" | "collection" | "tag";
  keys: string[];
};

const BOARD_COLUMN_WIDTH = "280px";
const LANDSCAPE_BOARD_COLUMN_WIDTH = "clamp(288px, 36vw, 360px)";
const BOARD_COLUMN_GAP = "0.75rem";

function getFrozenColumnLeft(index: number) {
  if (index <= 0) return "0px";

  return `calc(${Array.from(
    { length: index },
    () => "(var(--kb-board-column-width) + var(--kb-board-column-gap))",
  ).join(" + ")})`;
}

export function KnowledgeBoardView({
  items,
  isLandscapeMode = false,
}: KnowledgeBoardViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const boardGroupBy = useKnowledgeStore((s) => s.boardGroupBy);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);
  const [frozenColumns, setFrozenColumns] = useState<FrozenColumnsState>({
    groupBy: boardGroupBy,
    keys: [],
  });

  const columns = useMemo((): BoardColumn[] => {
    switch (boardGroupBy) {
      case "type": {
        return CONTENT_TYPES.map((type) => ({
          key: type,
          label: ui.typeLabels[type],
          items: items.filter((i) => getKnowledgeDisplayContentType(i) === type),
          color: typeColors[type].text,
        }));
      }
      case "collection": {
        const cols: BoardColumn[] = smartCollections.map((col) => ({
          key: col.id,
          label: col.name,
          items: items.filter((i) => col.itemIds.includes(i.id)),
        }));
        const assignedIds = new Set(smartCollections.flatMap((c) => c.itemIds));
        const uncategorized = items.filter((i) => !assignedIds.has(i.id));
        if (uncategorized.length > 0) {
          cols.push({ key: "uncategorized", label: ui.uncategorized, items: uncategorized });
        }
        return cols;
      }
      case "tag": {
        const tagMap = new Map<string, KnowledgeItem[]>();
        const untagged: KnowledgeItem[] = [];
        for (const item of items) {
          const allTags = [...item.aiTags, ...item.manualTags];
          if (allTags.length === 0) {
            untagged.push(item);
          } else {
            for (const tag of allTags) {
              if (!tagMap.has(tag)) tagMap.set(tag, []);
              tagMap.get(tag)!.push(item);
            }
          }
        }
        const cols: BoardColumn[] = [...tagMap.entries()]
          .sort(([, a], [, b]) => b.length - a.length)
          .slice(0, 10)
          .map(([tag, tagItems]) => ({ key: tag, label: tag, items: tagItems }));
        if (untagged.length > 0) {
          cols.push({ key: "untagged", label: ui.untagged, items: untagged });
        }
        return cols;
      }
    }
  }, [boardGroupBy, items, smartCollections, ui.typeLabels, ui.uncategorized, ui.untagged]);

  const columnKeys = useMemo(() => columns.map((col) => col.key), [columns]);
  const frozenColumnKeys = useMemo(() => {
    if (frozenColumns.groupBy !== boardGroupBy) return [];
    const availableKeys = new Set(columnKeys);
    return frozenColumns.keys.filter((key) => availableKeys.has(key));
  }, [boardGroupBy, columnKeys, frozenColumns]);

  const frozenColumnIndexByKey = useMemo(() => {
    const frozenSet = new Set(frozenColumnKeys);
    const indexByKey = new Map<string, number>();

    for (const col of columns) {
      if (frozenSet.has(col.key)) {
        indexByKey.set(col.key, indexByKey.size);
      }
    }

    return indexByKey;
  }, [columns, frozenColumnKeys]);

  const toggleFrozenColumn = (key: string) => {
    setFrozenColumns((previous) => {
      const previousKeys = previous.groupBy === boardGroupBy ? previous.keys : [];

      return {
        groupBy: boardGroupBy,
        keys: previousKeys.includes(key)
          ? previousKeys.filter((existingKey) => existingKey !== key)
          : [...previousKeys, key],
      };
    });
  };

  return (
    <div
      style={
        {
          "--kb-board-column-width": isLandscapeMode
            ? LANDSCAPE_BOARD_COLUMN_WIDTH
            : BOARD_COLUMN_WIDTH,
          "--kb-board-column-gap": BOARD_COLUMN_GAP,
        } as CSSProperties
      }
      className={cn(
        "flex min-h-0 gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none",
        isLandscapeMode && "h-full snap-none pb-1 [scrollbar-width:thin]",
      )}
    >
      {columns.map((col) => {
        const frozenIndex = frozenColumnIndexByKey.get(col.key);
        const isFrozen = frozenIndex !== undefined;
        const freezeLabel = isFrozen
          ? ui.formatUnfreezeColumn(col.label)
          : ui.formatFreezeColumn(col.label);

        return (
          <div
            key={col.key}
            style={isFrozen ? { left: getFrozenColumnLeft(frozenIndex) } : undefined}
            data-frozen={isFrozen ? "true" : undefined}
            className={cn(
              "flex min-w-[var(--kb-board-column-width)] w-[var(--kb-board-column-width)] shrink-0 snap-center flex-col overflow-visible md:snap-align-none",
              isLandscapeMode && "h-full snap-none",
              isFrozen &&
                "sticky z-20 rounded-xl border-r border-border/70 bg-background/95 pr-2 shadow-[10px_0_24px_rgba(15,23,42,0.10)] backdrop-blur dark:shadow-[10px_0_26px_rgba(0,0,0,0.26)]",
            )}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium capitalize">{col.label}</h3>
                <Badge variant="secondary" className="text-xs h-5">
                  {col.items.length}
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-6 w-6 p-0",
                          isFrozen &&
                            "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                        )}
                        onClick={() => toggleFrozenColumn(col.key)}
                        aria-label={freezeLabel}
                        aria-pressed={isFrozen}
                      >
                        {isFrozen ? (
                          <PinOff className="h-3.5 w-3.5" />
                        ) : (
                          <Pin className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    }
                  />
                  <TooltipContent side="top" sideOffset={6}>
                    {freezeLabel}
                  </TooltipContent>
                </Tooltip>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => openAddModal()}
                  aria-label={ui.formatAddToColumn(col.label)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Column cards */}
            <ScrollArea className="min-h-0 flex-1 overflow-visible">
              <div className="space-y-2 overflow-visible pb-3 pr-2">
                {col.items.map((item) => (
                  <KnowledgeCard key={item.id} item={item} />
                ))}
                {col.items.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                    {ui.noItems}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
