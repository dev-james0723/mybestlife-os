"use client";

import { BookOpen, FileText, ImageIcon, Layers, ListTree, MessageCircle } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TAB_DEFS = [
  { id: "overview", short: "Overview", Icon: BookOpen },
  { id: "chat", short: "Chat", Icon: MessageCircle },
  { id: "pages", short: "Pages", Icon: Layers },
  { id: "sections", short: "Sections", Icon: ListTree },
  { id: "glossary", short: "Glossary", Icon: BookOpen },
  { id: "visuals", short: "Visuals", Icon: ImageIcon },
  { id: "source", short: "Source", Icon: FileText },
] as const;

export type DocOracleTabId = (typeof TAB_DEFS)[number]["id"];

const triggerClass = cn(
  "min-h-10 shrink-0 flex-col gap-0.5 rounded-xl px-1.5 py-1.5 text-[10px] font-medium leading-tight text-muted-foreground transition-colors duration-150 ease-out sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2 sm:text-[12px] md:text-[13px]",
  "hover:bg-muted/80 data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm",
  "max-md:flex-1 max-md:justify-center",
);

export function DocOracleTabBar() {
  return (
    <div className="w-full min-w-0 pb-[env(safe-area-inset-bottom)]">
      {/* Mobile: 2-row grid — all 7 tabs visible without horizontal-only scroll */}
      <TabsList
        className={cn(
          "lg-glass-panel-dark h-auto w-full min-w-0 gap-1 overflow-visible p-1.5",
          "grid max-md:grid-cols-4 max-md:grid-rows-2 max-md:gap-1",
          "md:flex md:flex-nowrap md:overflow-x-auto md:overflow-y-visible md:scroll-pb-1 md:pb-1 md:[scrollbar-width:thin]",
          "[-webkit-overflow-scrolling:touch]",
        )}
      >
        {TAB_DEFS.map(({ id, short, Icon }) => (
          <TabsTrigger key={id} value={id} className={triggerClass}>
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-85 sm:h-4 sm:w-4" aria-hidden />
            <span className="max-w-[4.5rem] text-center sm:max-w-none">{short}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <p
        className="mt-1 hidden text-center text-[10px] text-muted-foreground/70 md:block lg:hidden"
        aria-hidden
      >
        Swipe tabs horizontally →
      </p>
    </div>
  );
}
