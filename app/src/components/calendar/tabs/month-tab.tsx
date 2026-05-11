"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAppStore } from "@/stores/app-store";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { useCalendarItems } from "@/hooks/use-calendar";
import { useMonthViewMode } from "@/hooks/use-month-view-mode";
import { MonthViewToggle } from "@/components/calendar/month/month-view-toggle";
import { MonthViewComplete } from "@/components/calendar/month/month-view-complete";
import { MonthViewMinimal } from "@/components/calendar/month/month-view-minimal";
import { MonthViewOrbital } from "@/components/calendar/month/month-view-orbital";

export function MonthTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const { data: items, isLoading } = useCalendarItems();
  const [mode, setMode] = useMonthViewMode();
  const prefersReduced = useReducedMotion();
  const rows = items ?? [];

  const labels = useMemo(
    () => ({
      complete: copy.monthToggleComplete,
      minimal: copy.monthToggleMinimal,
      orbital: copy.monthToggleOrbital,
    }),
    [copy]
  );

  return (
    <div data-calendar-surface className="space-y-4">
      <div className="flex items-center justify-end">
        <MonthViewToggle value={mode} onChange={setMode} labels={labels} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={prefersReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {mode === "complete" && (
            <MonthViewComplete items={rows} isLoading={isLoading} />
          )}
          {mode === "minimal" && (
            <MonthViewMinimal items={rows} isLoading={isLoading} />
          )}
          {mode === "orbital" && (
            <MonthViewOrbital items={rows} isLoading={isLoading} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
