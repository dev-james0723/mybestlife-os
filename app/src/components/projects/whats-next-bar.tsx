"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
      <p className="flex-1 text-sm text-foreground">
        {ui.whatsNextPrefix} &quot;{suggestion.project.name}&quot; in {days}{" "}
        days{dueInfo}. {ui.whatsNextSuffix}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onOpen(suggestion.project)}
        >
          {ui.open}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setDismissed(true)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
