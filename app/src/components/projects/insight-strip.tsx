"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Flame, Clock, CloudFog, BarChart3 } from "lucide-react";
import { isProjectStale, isDueThisWeek } from "@/lib/projects/health";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

interface InsightStripProps {
  projects: ProjectWithMeta[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
  ui: ProjectsUiCopy;
}

export function InsightStrip({
  projects,
  activeFilter,
  onFilterChange,
  ui,
}: InsightStripProps) {
  const stats = useMemo(() => {
    const activeCount = projects.filter(
      (p) => p.project.status === "active",
    ).length;
    const dueThisWeek = projects.filter((p) =>
      isDueThisWeek(p.project),
    ).length;
    const staleCount = projects.filter((p) =>
      isProjectStale(p.project),
    ).length;

    const statusDistribution: Record<string, number> = {};
    for (const p of projects) {
      statusDistribution[p.project.status] =
        (statusDistribution[p.project.status] ?? 0) + 1;
    }

    return { activeCount, dueThisWeek, staleCount, statusDistribution };
  }, [projects]);

  const tiles = [
    {
      key: "active",
      label: ui.insightActiveNow,
      value: stats.activeCount,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      key: "dueThisWeek",
      label: ui.insightDueThisWeek,
      value: stats.dueThisWeek,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      key: "stale",
      label: ui.insightStale,
      value: stats.staleCount,
      icon: CloudFog,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      key: "portfolio",
      label: ui.insightPortfolio,
      value: projects.length,
      icon: BarChart3,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
      isPortfolio: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const isActive = activeFilter === tile.key;
        const tileContent = (
          <div className="flex items-center gap-3.5">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem]",
                tile.bgColor,
              )}
            >
              <Icon className={cn("h-4 w-4", tile.color)} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs leading-5 text-muted-foreground">
                {tile.label}
              </p>
              {tile.isPortfolio ? (
                <div className="mt-1.5 flex h-2 w-full min-w-16 overflow-hidden rounded-full bg-muted">
                  {Object.entries(stats.statusDistribution).map(
                    ([status, count]) => (
                      <div
                        key={status}
                        className={cn(
                          "h-full transition-all",
                          status === "active" && "bg-green-500",
                          status === "planning" && "bg-blue-400",
                          status === "paused" && "bg-amber-400",
                          status === "completed" && "bg-emerald-500",
                          status === "cancelled" && "bg-gray-400",
                        )}
                        style={{
                          width: `${(count / Math.max(1, projects.length)) * 100}%`,
                        }}
                      />
                    ),
                  )}
                </div>
              ) : (
                <p className="mt-0.5 text-lg font-semibold leading-6 tabular-nums">
                  {tile.value}
                </p>
              )}
            </div>
          </div>
        );

        if (tile.isPortfolio) {
          return (
            <div
              key={tile.key}
              className="min-h-[5.25rem] rounded-[1.05rem] border border-slate-200/70 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] dark:border-white/10 dark:bg-white/[0.05]"
            >
              {tileContent}
            </div>
          );
        }

        return (
          <button
            key={tile.key}
            type="button"
            className={cn(
              "min-h-[5.25rem] rounded-[1.05rem] border border-slate-200/70 bg-white/72 p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] transition-[border-color,background,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-lime-300/40 hover:bg-lime-300/8 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:translate-y-0 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-lime-300/7",
              isActive &&
                "border-lime-300/55 bg-lime-300/14 shadow-[0_12px_28px_rgba(190,242,100,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] dark:bg-lime-300/12",
            )}
            aria-pressed={isActive}
            onClick={() => onFilterChange(isActive ? null : tile.key)}
          >
            {tileContent}
          </button>
        );
      })}
    </div>
  );
}
