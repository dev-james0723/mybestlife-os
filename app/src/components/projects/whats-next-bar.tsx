"use client";

import { useState, useMemo } from "react";
import { OSControl, OSIconControl } from "@/components/ui/os-primitives";
import { Lightbulb, X } from "lucide-react";
import { isProjectStale, staleDays } from "@/lib/projects/health";
import { formatProjectDate } from "@/lib/projects/presentation";
import { useAppStore } from "@/stores/app-store";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

interface WhatsNextBarProps {
  projects: ProjectWithMeta[];
  ui: ProjectsUiCopy;
  onOpen: (project: Project) => void;
}

export function WhatsNextBar({ projects, ui, onOpen }: WhatsNextBarProps) {
  const language = useAppStore((s) => s.language);
  const [dismissed, setDismissed] = useState(false);

  const suggestion = useMemo(() => {
    if (dismissed) return null;

    const candidates = projects
      .filter(
        (p) =>
          p.project.status !== "completed" &&
          p.project.status !== "cancelled" &&
          isProjectStale(p.project),
      )
      .sort((a, b) => {
        const aUrgency =
          (a.project.priority === "urgent"
            ? 4
            : a.project.priority === "high"
              ? 3
              : a.project.priority === "medium"
                ? 2
                : 1) + staleDays(a.project) / 10;
        const bUrgency =
          (b.project.priority === "urgent"
            ? 4
            : b.project.priority === "high"
              ? 3
              : b.project.priority === "medium"
                ? 2
                : 1) + staleDays(b.project) / 10;
        return bUrgency - aUrgency;
      });

    return candidates[0] ?? null;
  }, [projects, dismissed]);

  if (!suggestion) return null;

  const days = staleDays(suggestion.project);
  const dueInfo = suggestion.project.end_date
    ? `, ${ui.tableDue.toLowerCase()} ${formatProjectDate(
        suggestion.project.end_date,
        language,
      )}`
    : "";

  return (
    <div className="flex flex-col gap-4 rounded-[1.1rem] border border-lime-300/25 bg-lime-300/8 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] supports-backdrop-filter:backdrop-blur-xl dark:border-lime-300/18 dark:bg-lime-300/7 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.9rem] border border-lime-300/25 bg-lime-300/14 text-lime-700 dark:text-lime-200">
          <Lightbulb className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-pretty text-sm leading-6 text-foreground">
          {ui.whatsNextPrefix} &quot;{suggestion.project.name}&quot; in {days}{" "}
          days{dueInfo}. {ui.whatsNextSuffix}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
        <OSControl
          className="min-w-0 flex-1 justify-center px-4 sm:flex-none"
          onClick={() => onOpen(suggestion.project)}
        >
          {ui.open}
        </OSControl>
        <OSIconControl
          aria-label="Dismiss suggestion"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </OSIconControl>
      </div>
    </div>
  );
}
