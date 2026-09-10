"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { useCalendarItems } from "@/hooks/use-calendar";
import {
  CalendarDays,
  CalendarRange,
  ListOrdered,
  Sparkles,
  Sun,
} from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { OSSegmentedControl } from "@/components/ui/os-primitives";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
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
  const [showMore, setShowMore] = useState(false);
  const calendar = useCalendarItems();
  const plannerHref = useLocalizedPath("/daily-planner");
  const chinese = language.startsWith("zh");

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
      { id: "week", label: copy.tabWeek, icon: CalendarRange },
      { id: "month", label: copy.tabMonth, icon: CalendarDays },
      { id: "agenda", label: copy.tabAgenda, icon: ListOrdered },
      { id: "ai-plan", label: copy.tabAIPlan, icon: Sparkles },
    ],
    [copy]
  );

  return (
    <PageShell title={copy.pageTitle} description={chinese ? "日曆查看時間安排；到每日計劃選擇下一步。" : "Calendar shows when things happen. Use Daily Planner to choose what to do next."} actions={<Button variant="outline" render={<Link href={plannerHref} />}>{chinese ? "安排今日" : "Plan today"}</Button>}>
      <Tabs value={activeTab} onValueChange={(value) => { if (isTabId(value)) setTab(value); }} data-calendar-surface className="space-y-5">
        <OSSegmentedControl
          items={tabDefs.filter((tab) => showMore || ["today", "week", "month", activeTab].includes(tab.id))}
          value={activeTab}
          onValueChange={setTab}
          ariaLabel={copy.pageTitle}
          getPanelId={(tab) => `calendar-tabpanel-${tab}`}
          getTabId={(tab) => `calendar-tab-${tab}`}
          layoutId="calendar-tab-pill"
        />

        <Button variant="ghost" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}>{chinese ? (showMore ? "較少檢視" : "更多檢視") : (showMore ? "Fewer views" : "More views")}</Button>
        {calendar.isError ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm"><p>{chinese ? "部分日程未能載入；下方只顯示已取得的資料。" : "Some schedule sources could not load. The entries below may be incomplete."}</p><Button variant="outline" onClick={() => void calendar.refetch()}>{chinese ? "重試" : "Retry"}</Button></div> : calendar.isFetching ? <p role="status" className="text-sm text-muted-foreground">{chinese ? "正在更新日程，其他項目仍可查看…" : "Updating schedule sources; available entries remain usable…"}</p> : null}
        <TabsContent value="today" id="calendar-tabpanel-today" aria-labelledby="calendar-tab-today"><TodayTab /></TabsContent>
        <TabsContent value="week" id="calendar-tabpanel-week" aria-labelledby="calendar-tab-week"><WeekTab /></TabsContent>
        <TabsContent value="month" id="calendar-tabpanel-month" aria-labelledby="calendar-tab-month"><MonthTab /></TabsContent>
        <TabsContent value="agenda" id="calendar-tabpanel-agenda" aria-labelledby="calendar-tab-agenda"><AgendaTab /></TabsContent>
        <TabsContent value="ai-plan" id="calendar-tabpanel-ai-plan" aria-labelledby="calendar-tab-ai-plan"><AIPlanTab /></TabsContent>
      </Tabs>
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
