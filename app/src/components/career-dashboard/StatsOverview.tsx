"use client";

import { useMemo } from "react";
import {
  FileText,
  Briefcase,
  Trophy,
  Users,
  CalendarHeart,
  NotebookPen,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerVaultFiles } from "@/hooks/use-career-vault";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";
import { useCareerEvents } from "@/hooks/use-career-events";
import { useCareerDecisions } from "@/hooks/use-career-decisions";
import { useCareerNetworkNodes } from "@/hooks/use-career-network";
import {
  countActiveApplications,
  countOffers,
} from "@/lib/dashboard/aggregators";

type Tile = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
};

export function StatsOverviewWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard;

  const filesQ = useCareerVaultFiles();
  const oppsQ = useCareerOpportunities();
  const eventsQ = useCareerEvents();
  const decisionsQ = useCareerDecisions();
  const nodesQ = useCareerNetworkNodes();

  const tiles: Tile[] = useMemo(() => {
    const opps = oppsQ.data ?? [];
    return [
      {
        label: copy.stats.files,
        value: (filesQ.data ?? []).length,
        icon: <FileText className="h-4 w-4" />,
        accent: "text-amber-600 dark:text-amber-300",
      },
      {
        label: copy.stats.activeApps,
        value: countActiveApplications(opps),
        icon: <Briefcase className="h-4 w-4" />,
        accent: "text-sky-600 dark:text-sky-300",
      },
      {
        label: copy.stats.offers,
        value: countOffers(opps),
        icon: <Trophy className="h-4 w-4" />,
        accent: "text-emerald-600 dark:text-emerald-300",
      },
      {
        label: copy.stats.contacts,
        value: (nodesQ.data ?? []).filter((n) => n.node_type === "person")
          .length,
        icon: <Users className="h-4 w-4" />,
        accent: "text-violet-600 dark:text-violet-300",
      },
      {
        label: copy.stats.events,
        value: (eventsQ.data ?? []).length,
        icon: <CalendarHeart className="h-4 w-4" />,
        accent: "text-rose-600 dark:text-rose-300",
      },
      {
        label: copy.stats.decisions,
        value: (decisionsQ.data ?? []).length,
        icon: <NotebookPen className="h-4 w-4" />,
        accent: "text-indigo-600 dark:text-indigo-300",
      },
    ];
  }, [
    copy,
    filesQ.data,
    oppsQ.data,
    eventsQ.data,
    decisionsQ.data,
    nodesQ.data,
  ]);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {copy.sections.atAGlance}
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {tiles.map((t) => (
          <li
            key={t.label}
            className="rounded-lg border bg-background/60 p-3 text-center"
          >
            <div className={`mx-auto mb-1 grid h-6 w-6 place-items-center ${t.accent}`} aria-hidden>
              {t.icon}
            </div>
            <div className="text-xl font-bold tabular-nums">{t.value}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.label}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
