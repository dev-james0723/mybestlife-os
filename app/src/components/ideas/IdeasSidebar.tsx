"use client";

import { useMemo, useState } from "react";
import { useIdeasStore, type IdeasRelatedScopeFilter } from "@/stores/ideas-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getIdeasUiCopy } from "@/lib/i18n/ideas-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IdeasTagTaxonomyPanel } from "./IdeasTagTaxonomyPanel";
import { IDEA_CATEGORIES } from "@/lib/ideas/constants";
import { displayCategory } from "@/lib/ideas/idea-helpers";

const DIRECTORY_WIDTH = 220;
const dirTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

function SidebarBody({ showTitle = true }: { showTitle?: boolean }) {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const items = useIdeasStore((s) => s.items);
  const ideaStatusScope = useIdeasStore((s) => s.ideaStatusScope);
  const setIdeaStatusScope = useIdeasStore((s) => s.setIdeaStatusScope);
  const activeCategoryFilters = useIdeasStore((s) => s.activeCategoryFilters);
  const toggleCategoryFilter = useIdeasStore((s) => s.toggleCategoryFilter);
  const relatedScopeFilter = useIdeasStore((s) => s.relatedScopeFilter);
  const setRelatedScopeFilter = useIdeasStore((s) => s.setRelatedScopeFilter);
  const closeMobileSidebar = useIdeasStore((s) => s.closeMobileSidebar);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) {
      const c = displayCategory(it.category);
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [items]);

  const categoriesWithIdeas = useMemo(
    () => IDEA_CATEGORIES.filter((c) => (categoryCounts.get(c) ?? 0) > 0),
    [categoryCounts],
  );

  const scopeRows: { scope: typeof ideaStatusScope; label: string }[] = [
    { scope: "all", label: ui.allIdeas },
    { scope: "captured", label: ui.captured },
    { scope: "reviewed", label: ui.reviewed },
    { scope: "archived", label: ui.archived },
  ];

  const setRelated = (next: IdeasRelatedScopeFilter) => {
    setRelatedScopeFilter(relatedScopeFilter === next ? "none" : next);
    closeMobileSidebar();
  };

  return (
    <div className="space-y-4 p-4">
      {showTitle ? <h2 className="text-sm font-medium">{ui.sidebarTitle}</h2> : null}

      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{ui.library}</p>
        {scopeRows.map(({ scope, label }) => {
          const active = ideaStatusScope === scope;
          const count =
            scope === "all"
              ? items.length
              : items.filter((i) => i.status === scope).length;
          return (
            <button
              key={scope}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                active && "bg-accent font-medium text-primary",
              )}
              onClick={() => {
                setIdeaStatusScope(scope);
                closeMobileSidebar();
              }}
            >
              <span>{label}</span>
              <span className="tabular-nums text-[10px] text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      {categoriesWithIdeas.length > 0 ? (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {ui.categories}
            </p>
            {categoriesWithIdeas.map((c) => {
              const active = activeCategoryFilters.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                    active && "bg-accent font-medium",
                  )}
                  onClick={() => {
                    toggleCategoryFilter(c);
                    closeMobileSidebar();
                  }}
                >
                  <span className="truncate">{ui.categoryLabels[c]}</span>
                  <span className="tabular-nums text-[10px] text-muted-foreground">
                    {categoryCounts.get(c) ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <Separator />

      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {ui.relatedFilters}
        </p>
        <button
          type="button"
          className={cn(
            "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
            relatedScopeFilter === "hasProject" && "bg-accent font-medium",
          )}
          onClick={() => setRelated("hasProject")}
        >
          {ui.linkedProject}
        </button>
        <button
          type="button"
          className={cn(
            "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
            relatedScopeFilter === "hasTask" && "bg-accent font-medium",
          )}
          onClick={() => setRelated("hasTask")}
        >
          {ui.linkedTask}
        </button>
        <button
          type="button"
          className={cn(
            "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
            relatedScopeFilter === "hasKnowledge" && "bg-accent font-medium",
          )}
          onClick={() => setRelated("hasKnowledge")}
        >
          {ui.linkedKnowledge}
        </button>
        <button
          type="button"
          className={cn(
            "flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
            relatedScopeFilter === "noRelated" && "bg-accent font-medium",
          )}
          onClick={() => setRelated("noRelated")}
        >
          {ui.noRelatedResource}
        </button>
      </div>

      <Separator />

      <div className="space-y-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{ui.tags}</p>
        <IdeasTagTaxonomyPanel onAfterSelect={closeMobileSidebar} />
      </div>
    </div>
  );
}

export function IdeasSidebar() {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const isMobileSidebarOpen = useIdeasStore((s) => s.isMobileSidebarOpen);
  const closeMobileSidebar = useIdeasStore((s) => s.closeMobileSidebar);
  const [collapsedDesktop, setCollapsedDesktop] = useState(false);
  const isOpen = !collapsedDesktop;
  const reduceMotion = useReducedMotion();
  const directoryTransition = reduceMotion ? { duration: 0 } : dirTransition;
  const expandBtnTransition = reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

  return (
    <>
      <div className="hidden min-h-0 shrink-0 self-stretch flex-row items-stretch gap-1 lg:flex">
        <AnimatePresence initial={false} mode="popLayout">
          {collapsedDesktop && (
            <motion.div
              key="ideas-dir-expand"
              className="flex min-h-0 items-start pt-0.5"
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
              transition={expandBtnTransition}
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
                onClick={() => setCollapsedDesktop(false)}
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
          aria-hidden={!isOpen}
          animate={{ width: isOpen ? DIRECTORY_WIDTH : 0 }}
          transition={directoryTransition}
        >
          <motion.aside
            className={cn(
              "box-border flex h-full min-h-0 w-[220px] max-w-[220px] flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/25 shadow-sm",
              !isOpen && "pointer-events-none",
            )}
            style={{ willChange: "transform" }}
            initial={false}
            animate={{ x: isOpen ? 0 : "-100%" }}
            transition={directoryTransition}
          >
            <div className="flex shrink-0 items-center gap-1 border-b border-border/50 px-2 py-2.5 pl-3 pr-1.5">
              <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{ui.sidebarTitle}</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsedDesktop(true)}
                aria-label={ui.collapseDirectory}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="min-h-0 min-w-0 flex-1">
              <SidebarBody showTitle={false} />
            </ScrollArea>
          </motion.aside>
        </motion.div>
      </div>

      <Sheet open={isMobileSidebarOpen} onOpenChange={(open) => !open && closeMobileSidebar()}>
        <SheetContent side="left" showCloseButton={false} className="flex w-[260px] flex-col gap-0 overflow-hidden p-0">
          <div className="flex shrink-0 items-center justify-between border-b p-4">
            <h2 className="text-sm font-medium">{ui.sidebarTitle}</h2>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={closeMobileSidebar}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <SidebarBody showTitle={false} />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function IdeasSidebarMobileMenuButton() {
  const language = useAppStore((s) => s.language);
  const ui = getIdeasUiCopy(language);
  const toggleMobileSidebar = useIdeasStore((s) => s.toggleMobileSidebar);
  return (
    <Button variant="outline" size="icon-sm" className="lg:hidden shrink-0" onClick={toggleMobileSidebar} aria-label={ui.openMenu}>
      <Menu className="h-4 w-4" />
    </Button>
  );
}
