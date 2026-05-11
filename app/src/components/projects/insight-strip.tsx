"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const isActive = activeFilter === tile.key;
        return (
          <Card
            key={tile.key}
            className={cn(
              "cursor-pointer p-3 transition-all hover:shadow-sm",
              isActive && "ring-2 ring-primary/30",
            )}
            onClick={() =>
              tile.key === "portfolio"
                ? undefined
                : onFilterChange(isActive ? null : tile.key)
            }
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  tile.bgColor,
                )}
              >
                <Icon className={cn("h-4 w-4", tile.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  {tile.label}
                </p>
                {tile.isPortfolio ? (
                  <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-muted">
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
                  <p className="text-lg font-semibold tabular-nums">
                    {tile.value}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
