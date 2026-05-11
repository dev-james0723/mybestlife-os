"use client";

import { format, parseISO } from "date-fns";
import type { Locale } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JapaneseStudySession } from "@/types/database";
import { studySessionDisplay } from "@/lib/utils/japanese-study-display";

type DashboardStudyRowProps = {
  session: JapaneseStudySession;
  locale: Locale;
};

export function DashboardStudyRow({ session, locale }: DashboardStudyRowProps) {
  const meta = studySessionDisplay(session);
  const label = session.study_type?.trim() || "Session";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3",
        "shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.06]"
      )}
    >
      <span className="w-14 shrink-0 text-sm tabular-nums text-muted-foreground">
        {format(parseISO(session.session_date), "MMM d", { locale })}
      </span>
      <Badge
        variant="secondary"
        className="border-0 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
      >
        {label}
      </Badge>
      <span className="text-sm font-semibold text-foreground">{session.duration_minutes} min</span>
      <span className="ml-auto flex items-center gap-2 text-sm">
        <span aria-hidden>{meta.emoji}</span>
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            meta.labelClass
          )}
        >
          {meta.label}
        </span>
      </span>
    </div>
  );
}
