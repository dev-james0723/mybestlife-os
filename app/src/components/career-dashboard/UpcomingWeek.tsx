"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { OSFrostedPanel } from "@/components/ui/os-primitives";
import { osSolidPanelClassName } from "@/components/ui/os-glass";
import { cn } from "@/lib/utils";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { upcomingOpportunities } from "@/lib/dashboard/aggregators";

export function UpcomingWeekWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;
  const localeSlug = useLocaleSlug();

  const oppsQ = useCareerOpportunities();
  const upcoming = useMemo(
    () => upcomingOpportunities(oppsQ.data ?? []),
    [oppsQ.data],
  );

  return (
    <OSFrostedPanel as="section" className="p-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.upcoming.title}
        </h2>
      </div>
      {upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {copy.upcoming.empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {upcoming.slice(0, 5).map((o) => {
            const href = withLocalePrefix(
              localeSlug,
              `/career/pipeline/${o.id}`,
            );
            const tag =
              o.stage === "interviewing"
                ? copy.upcoming.interviewSoon
                : o.stage === "applied"
                  ? copy.upcoming.followUp
                  : copy.upcoming.dueToday;
            return (
              <li key={o.id}>
                <Link
                  href={href}
                  className={cn(
                    osSolidPanelClassName,
                    "flex items-center justify-between gap-3 px-3 py-2 text-sm transition-[background,border-color,color,transform] duration-150 hover:border-slate-300 hover:bg-white/95 hover:text-foreground active:translate-y-px motion-reduce:transition-none dark:hover:border-white/16 dark:hover:bg-white/[0.08]",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {o.role_title} — {o.company_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {tag}
                      {o.next_action_date ? ` · ${o.next_action_date}` : ""}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </OSFrostedPanel>
  );
}
