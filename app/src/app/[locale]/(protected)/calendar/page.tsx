"use client";

import { Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  CalendarRange,
  ListOrdered,
  Sparkles,
  Sun,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { cn } from "@/lib/utils";
import { TodayTab } from "@/components/calendar/tabs/today-tab";
import { AgendaTab } from "@/components/calendar/tabs/agenda-tab";
import { WeekTab } from "@/components/calendar/tabs/week-tab";
import { MonthTab } from "@/components/calendar/tabs/month-tab";
import { AIPlanTab } from "@/components/calendar/tabs/ai-plan-tab";

const TAB_IDS = ["today", "agenda", "week", "month", "ai-plan"] as const;
type TabId = (typeof TAB_IDS)[number];

function isTabId(v: string | null): v is TabId {
  return v !== null && (TAB_IDS as readonly string[]).includes(v);
}

function CalendarPageInner() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefersReduced = useReducedMotion();

  const activeTab: TabId = useMemo(() => {
    const param = searchParams?.get("tab") ?? null;
    return isTabId(param) ? param : "today";
  }, [searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const tabDefs = useMemo<
    Array<{ id: TabId; label: string; icon: typeof Sun }>
  >(
    () => [
      { id: "today", label: copy.tabToday, icon: Sun },
      { id: "agenda", label: copy.tabAgenda, icon: ListOrdered },
      { id: "week", label: copy.tabWeek, icon: CalendarRange },
      { id: "month", label: copy.tabMonth, icon: CalendarDays },
      { id: "ai-plan", label: copy.tabAIPlan, icon: Sparkles },
    ],
    [copy]
  );

  return (
    <PageShell title={copy.pageTitle} description={copy.pageDescription}>
      <div data-calendar-surface className="space-y-5">
        {/* Tab strip — lime underline + animated layoutId highlight */}
        <div
          className="relative flex flex-wrap items-center gap-1 rounded-full border border-border/60 bg-card/40 p-1 backdrop-blur-sm sm:w-fit"
          role="tablist"
          aria-label={copy.pageTitle}
        >
          {tabDefs.map((tab) => {
            const active = tab.id === activeTab;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`calendar-tabpanel-${tab.id}`}
                id={`calendar-tab-${tab.id}`}
                onClick={() => setTab(tab.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--calendar-lime)]/70",
                  active
                    ? "text-[#0d0d0d]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="calendar-tab-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-[var(--calendar-lime)] shadow-[0_0_20px_var(--calendar-lime-glow)]"
                    transition={{
                      duration: prefersReduced ? 0 : 0.22,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  />
                )}
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content — crossfade on change */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`calendar-tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`calendar-tab-${activeTab}`}
            initial={prefersReduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "today" && <TodayTab />}
            {activeTab === "agenda" && <AgendaTab />}
            {activeTab === "week" && <WeekTab />}
            {activeTab === "month" && <MonthTab />}
            {activeTab === "ai-plan" && <AIPlanTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageShell>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarPageInner />
    </Suspense>
  );
}
