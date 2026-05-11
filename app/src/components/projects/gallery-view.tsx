"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { getProjectOneSentenceSummary } from "@/lib/projects/card-format";
import {
  getProjectDateRangeLabelLocalized,
  getProjectStatusLabel,
} from "@/lib/projects/presentation";
import { useAppStore } from "@/stores/app-store";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

interface GalleryViewProps {
  projects: ProjectWithMeta[];
  onSelectProject: (project: Project) => void;
  ui: ProjectsUiCopy;
}

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 60%, 65%), hsl(${(hue + 40) % 360}, 50%, 55%))`;
}

export function ProjectGalleryView({
  projects,
  onSelectProject,
  ui,
}: GalleryViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {projects.map((item) => (
        <GalleryCard
          key={item.project.id}
          item={item}
          onSelect={() => onSelectProject(item.project)}
          ui={ui}
        />
      ))}
    </div>
  );
}

function GalleryCard({
  item,
  onSelect,
  ui,
}: {
  item: ProjectWithMeta;
  onSelect: () => void;
  ui: ProjectsUiCopy;
}) {
  const language = useAppStore((s) => s.language);
  const { project, tasks, health } = item;
  const summary = getProjectOneSentenceSummary(project.description);
  const dateRange = getProjectDateRangeLabelLocalized(project, language);

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const completionPct =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const gradient = project.color
    ? `linear-gradient(135deg, ${project.color}, ${project.color}cc)`
    : hashColor(project.id);

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-md"
      onClick={onSelect}
    >
      {/* Thumbnail area */}
      <div
        className="relative h-32 w-full overflow-hidden"
        style={{ background: gradient }}
      >
        {project.thumbnail_url && (
          <img
            src={project.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
        {/* Status pill */}
        <div className="absolute left-2 top-2">
          <StatusBadge
            variant="status"
            value={project.status}
            label={getProjectStatusLabel(project.status, ui)}
          />
        </div>

        {/* Priority dot */}
        <div className="absolute right-2 top-2">
          <span
            className={cn(
              "inline-block h-3 w-3 rounded-full ring-2 ring-white/30",
              project.priority === "urgent" && "bg-red-500",
              project.priority === "high" && "bg-orange-500",
              project.priority === "medium" && "bg-blue-500",
              project.priority === "low" && "bg-gray-400",
            )}
          />
        </div>

        {/* Health dot */}
        <div className="absolute bottom-2 right-2">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              health.level === "good" && "bg-green-400",
              health.level === "warning" && "bg-amber-400",
              health.level === "critical" && "bg-red-400",
            )}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 hidden flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
          <p className="text-sm font-medium text-white line-clamp-2">
            {project.name}
          </p>
          {summary && (
            <p className="mt-0.5 text-xs text-white/80 line-clamp-1">
              {summary}
            </p>
          )}
        </div>

        {/* Mobile: always show title */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-3 sm:hidden">
          <p className="text-sm font-medium text-white line-clamp-2">
            {project.name}
          </p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        <h4 className="text-sm font-medium leading-snug line-clamp-1 hidden sm:block">
          {project.name}
        </h4>
        {summary && (
          <p className="hidden text-xs text-muted-foreground line-clamp-1 sm:block">
            {summary}
          </p>
        )}
        {dateRange && (
          <p className="text-xs text-muted-foreground tabular-nums">{dateRange}</p>
        )}

        {tasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {completedTasks}/{tasks.length} {ui.tasks}
              </span>
              <span className="tabular-nums">{completionPct}%</span>
            </div>
            <Progress value={completionPct} className="h-1" />
          </div>
        )}
      </div>
    </Card>
  );
}
