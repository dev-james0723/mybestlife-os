"use client";

import { useMemo, useState } from "react";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { CONTENT_TYPES, typeColors, type ContentType } from "@/types/knowledge";
import type { KnowledgeCategory } from "@/types/knowledge-source";
import {
  getCategoryLabel,
  KNOWLEDGE_CATEGORY_ORDER,
} from "@/lib/knowledge/labels";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Sparkles, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { TagTaxonomyPanel } from "./tags/TagTaxonomyPanel";

const KB_DIRECTORY_WIDTH = 220;
const kbDirectoryTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

function SidebarDirectoryContent({ showTitle = true }: { showTitle?: boolean }) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const items = useKnowledgeStore((s) => s.items);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const activeTypeFilters = useKnowledgeStore((s) => s.activeTypeFilters);
  const toggleTypeFilter = useKnowledgeStore((s) => s.toggleTypeFilter);
  const activeCategoryFilters = useKnowledgeStore((s) => s.activeCategoryFilters);
  const toggleCategoryFilter = useKnowledgeStore((s) => s.toggleCategoryFilter);
  const openAIPanel = useKnowledgeStore((s) => s.openAIPanel);
  const closeMobileSidebar = useKnowledgeStore((s) => s.closeMobileSidebar);
  const activeSmartCollectionId = useKnowledgeStore((s) => s.activeSmartCollectionId);
  const setActiveSmartCollectionId = useKnowledgeStore((s) => s.setActiveSmartCollectionId);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.contentType] = (counts[item.contentType] || 0) + 1;
    }
    return counts;
  }, [items]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<KnowledgeCategory, number>> = {};
    for (const item of items) {
      if (!item.category) continue;
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const activeCategoryList = useMemo(
    () => KNOWLEDGE_CATEGORY_ORDER.filter((c) => (categoryCounts[c] ?? 0) > 0),
    [categoryCounts],
  );

  const handleTypeClick = (type: ContentType) => {
    toggleTypeFilter(type);
    closeMobileSidebar();
  };

  return (
    <div className="p-4 space-y-4">
      {showTitle && (
        <h2 className="text-sm font-medium">{ui.sidebarTitle}</h2>
      )}

      <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            {ui.library}
          </p>
          <button
            type="button"
            className={cn(
              "flex items-center justify-between w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
              activeTypeFilters.length === 0 &&
                !activeSmartCollectionId &&
                "bg-accent text-primary font-medium",
            )}
            onClick={() => {
              if (activeTypeFilters.length > 0) {
                for (const f of activeTypeFilters) toggleTypeFilter(f);
              }
              setActiveSmartCollectionId(null);
              closeMobileSidebar();
            }}
          >
            <span>{ui.allItems}</span>
            <span className="tabular-nums text-[10px] text-muted-foreground">{items.length}</span>
          </button>

          {CONTENT_TYPES.map((type) => {
            const colors = typeColors[type];
            const isActive = activeTypeFilters.includes(type);
            return (
              <button
                type="button"
                key={type}
                className={cn(
                  "flex items-center justify-between w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors capitalize",
                  isActive && "bg-accent font-medium",
                )}
                onClick={() => handleTypeClick(type)}
              >
                <span className="flex items-center gap-2">
                  <span>{colors.icon}</span>
                  <span>{ui.typeLabels[type]}</span>
                </span>
                {(typeCounts[type] || 0) > 0 && (
                  <span className="tabular-nums text-[10px] text-muted-foreground">
                    {typeCounts[type]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Separator />

        {activeCategoryList.length > 0 && (
          <>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {ui.categories}
              </p>
              {activeCategoryList.map((category) => {
                const isActive = activeCategoryFilters.includes(category);
                return (
                  <button
                    type="button"
                    key={category}
                    className={cn(
                      "flex items-center justify-between w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors",
                      isActive && "bg-accent font-medium",
                    )}
                    onClick={() => {
                      toggleCategoryFilter(category);
                      closeMobileSidebar();
                    }}
                  >
                    <span className="truncate">{getCategoryLabel(category)}</span>
                    <span className="tabular-nums text-[10px] text-muted-foreground">
                      {categoryCounts[category] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
            <Separator />
          </>
        )}

        {smartCollections.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {ui.aiCollections}
            </p>
            {smartCollections.map((col) => {
              const isColActive = activeSmartCollectionId === col.id;
              return (
                <button
                  type="button"
                  key={col.id}
                  aria-pressed={isColActive}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                    isColActive && "bg-accent font-medium",
                  )}
                  onClick={() => {
                    setActiveSmartCollectionId(isColActive ? null : col.id);
                    closeMobileSidebar();
                  }}
                >
                  <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                  <span className="truncate">{col.name}</span>
                </button>
              );
            })}
            <Separator />
          </div>
        )}

        <Separator />

        <TagTaxonomyPanel onAfterSelect={closeMobileSidebar} />

        <div className="mt-auto pt-4">
          <button
            type="button"
            className="w-full rounded-lg border border-border/70 bg-background/80 p-3 text-left shadow-sm transition-colors hover:bg-muted/50 dark:bg-background/40"
            onClick={() => {
              openAIPanel();
              closeMobileSidebar();
            }}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              {ui.askKnowledgeBase}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ui.chatWithKnowledgeBase}
            </p>
          </button>
        </div>
      </div>
  );
}

export function KnowledgeSidebar() {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const isMobileSidebarOpen = useKnowledgeStore((s) => s.isMobileSidebarOpen);
  const closeMobileSidebar = useKnowledgeStore((s) => s.closeMobileSidebar);
  const [isDesktopDirectoryCollapsed, setIsDesktopDirectoryCollapsed] = useState(false);
  const isDirectoryOpen = !isDesktopDirectoryCollapsed;
  const reduceMotion = useReducedMotion();
  const directoryTransition = reduceMotion ? { duration: 0 } : kbDirectoryTransition;
  const directoryExpandButtonTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <>
      {/* Desktop (lg+): one flex child so the page row gap-6 is not doubled */}
      <div className="hidden min-h-0 shrink-0 self-stretch flex-row items-stretch gap-1 lg:flex">
        <AnimatePresence initial={false} mode="popLayout">
          {isDesktopDirectoryCollapsed && (
            <motion.div
              key="kb-dir-expand"
              className="flex min-h-0 items-start pt-0.5"
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={directoryExpandButtonTransition}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : { opacity: 0, x: -8, transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] } }
              }
            >
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-border/70 bg-muted/25 shadow-sm"
                onClick={() => setIsDesktopDirectoryCollapsed(false)}
                aria-label={ui.expandDirectory}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          className="min-h-0 self-stretch overflow-hidden"
          initial={false}
          aria-hidden={!isDirectoryOpen}
          animate={{ width: isDirectoryOpen ? KB_DIRECTORY_WIDTH : 0 }}
          transition={directoryTransition}
        >
          <motion.aside
            className={cn(
              "box-border flex h-full min-h-0 w-[220px] max-w-[220px] flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/25 shadow-sm",
              !isDirectoryOpen && "pointer-events-none",
            )}
            style={{ willChange: "transform" }}
            initial={false}
            animate={{ x: isDirectoryOpen ? 0 : "-100%" }}
            transition={directoryTransition}
          >
            <div className="flex shrink-0 items-center gap-1 border-b border-border/50 px-2 py-2.5 pl-3 pr-1.5">
              <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{ui.sidebarTitle}</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsDesktopDirectoryCollapsed(true)}
                aria-label={ui.collapseDirectory}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="min-h-0 min-w-0 flex-1">
              <SidebarDirectoryContent showTitle={false} />
            </ScrollArea>
          </motion.aside>
        </motion.div>
      </div>

      {/* Mobile drawer */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={(open) => !open && closeMobileSidebar()}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="flex w-[260px] flex-col gap-0 overflow-hidden p-0"
        >
          <div className="flex shrink-0 items-center justify-between border-b p-4">
            <h2 className="text-sm font-medium">{ui.sidebarTitle}</h2>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={closeMobileSidebar}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <SidebarDirectoryContent showTitle={false} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
