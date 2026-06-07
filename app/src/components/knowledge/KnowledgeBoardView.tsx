"use client";

import { useMemo } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { CONTENT_TYPES, typeColors, type KnowledgeItem, type ContentType } from "@/types/knowledge";
import { KnowledgeCard } from "./KnowledgeCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";

interface KnowledgeBoardViewProps {
  items: KnowledgeItem[];
}

type BoardColumn = {
  key: string;
  label: string;
  items: KnowledgeItem[];
  color?: string;
};

export function KnowledgeBoardView({ items }: KnowledgeBoardViewProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const boardGroupBy = useKnowledgeStore((s) => s.boardGroupBy);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const openAddModal = useKnowledgeStore((s) => s.openAddModal);

  const columns = useMemo((): BoardColumn[] => {
    switch (boardGroupBy) {
      case "type": {
        return CONTENT_TYPES.map((type) => ({
          key: type,
          label: ui.typeLabels[type],
          items: items.filter((i) => i.contentType === type),
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

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
      {columns.map((col) => (
        <div
          key={col.key}
          className="flex flex-col min-w-[280px] w-[280px] shrink-0 snap-center md:snap-align-none"
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium capitalize">{col.label}</h3>
              <Badge variant="secondary" className="text-xs h-5">
                {col.items.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => openAddModal()}
              aria-label={ui.formatAddToColumn(col.label)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Column cards */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-2">
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
      ))}
    </div>
  );
}
