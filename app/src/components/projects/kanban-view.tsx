"use client";

import { useMemo } from "react";
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { getProjectOneSentenceSummary } from "@/lib/projects/card-format";
import {
  Star,
  CloudFog,
  AlertTriangle,
  Flame,
  FileText,
  Lightbulb,
  GripVertical,
} from "lucide-react";
import { isProjectStale, isAtRisk } from "@/lib/projects/health";
import {
  getProjectDateRangeLabelLocalized,
  getProjectPriorityLabel,
  getProjectStatusLabel,
} from "@/lib/projects/presentation";
import { useAppStore } from "@/stores/app-store";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

interface KanbanViewProps {
  projects: ProjectWithMeta[];
  statusOptions: { value: string; label: string }[];
  onSelectProject: (project: Project) => void;
  onStatusChange: (projectId: string, status: Project["status"]) => void;
  onTogglePin: (id: string) => void;
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

export function ProjectKanbanView({
  projects,
  statusOptions,
  onSelectProject,
  onStatusChange,
  onTogglePin,
  ui,
}: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columns = useMemo(() => {
    const map: Record<string, ProjectWithMeta[]> = {};
    for (const opt of statusOptions) {
      map[opt.value] = [];
    }
    for (const p of projects) {
      const status = p.project.status;
      if (!map[status]) map[status] = [];
      map[status].push(p);
    }
    return statusOptions.map((opt) => ({
      status: opt.value as Project["status"],
      label: opt.label,
      projects: map[opt.value] ?? [],
    }));
  }, [projects, statusOptions]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const projectId = String(active.id);

    const columnPrefix = "column:";
    if (overId.startsWith(columnPrefix)) {
      const status = overId.slice(columnPrefix.length) as Project["status"];
      if (statusOptions.some((s) => s.value === status)) {
        onStatusChange(projectId, status);
      }
      return;
    }

    const targetStatus = statusOptions.find((s) => s.value === overId)?.value;
    if (targetStatus) {
      onStatusChange(projectId, targetStatus as Project["status"]);
      return;
    }

    const targetProject = projects.find((p) => p.project.id === overId);
    if (targetProject) {
      onStatusChange(projectId, targetProject.project.status);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragEnd={handleDragEnd}
    >
      <div className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-5 pt-1 sm:snap-none">
        {columns.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            projects={col.projects}
            onSelectProject={onSelectProject}
            onTogglePin={onTogglePin}
            ui={ui}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  label,
  projects,
  onSelectProject,
  onTogglePin,
  ui,
}: {
  status: Project["status"];
  label: string;
  projects: ProjectWithMeta[];
  onSelectProject: (project: Project) => void;
  onTogglePin: (id: string) => void;
  ui: ProjectsUiCopy;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });

  return (
    <section className="flex min-w-[min(82vw,20rem)] max-w-[20rem] shrink-0 snap-center flex-col rounded-[1.25rem] border border-slate-200/70 bg-white/42 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:border-white/8 dark:bg-white/[0.025] sm:min-w-[20rem]">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-[-0.01em]">{label}</h3>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs tabular-nums">
            {projects.length}
          </Badge>
        </div>
      </div>

      {/* Droppable column body — empty columns still accept drops */}
      <div
        ref={setNodeRef}
        className={cn(
          "mx-2 mb-2 flex min-h-[132px] flex-1 flex-col rounded-[1rem] transition-colors",
          isOver && "bg-primary/5 ring-1 ring-primary/20",
        )}
      >
        <SortableContext
          id={status}
          items={projects.map((p) => p.project.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-1 flex-col gap-3 px-1 pb-1">
            {projects.map((p) => (
              <KanbanCard
                key={p.project.id}
                item={p}
                onSelect={() => onSelectProject(p.project)}
                onTogglePin={() => onTogglePin(p.project.id)}
                ui={ui}
              />
            ))}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}

function KanbanCard({
  item,
  onSelect,
  onTogglePin,
  ui,
}: {
  item: ProjectWithMeta;
  onSelect: () => void;
  onTogglePin: () => void;
  ui: ProjectsUiCopy;
}) {
  const language = useAppStore((s) => s.language);
  const { project, tasks, health, momentum, isPinned, noteCount, ideaCount } =
    item;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const completionPct =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const summary = getProjectOneSentenceSummary(project.description);
  const dateRange = getProjectDateRangeLabelLocalized(project, language);
  const gradient = project.color
    ? `linear-gradient(135deg, ${project.color}, ${project.color}cc)`
    : hashColor(project.id);

  const stale = isProjectStale(project);
  const atRisk = isAtRisk(project, tasks);
  const onFire = momentum.score > 60;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={cn(
          "cursor-pointer overflow-hidden border-slate-200/75 bg-card/92 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300/80 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/9",
          isDragging && "opacity-50 shadow-lg",
          stale && "opacity-75",
          atRisk && "border-l-2 border-l-red-400",
          onFire && "ring-1 ring-orange-300/50",
        )}
        onClick={onSelect}
      >
        <CardContent className="space-y-3 p-3.5">
          <div
            className="relative h-28 w-full overflow-hidden rounded-[0.85rem]"
            style={{ background: gradient }}
          >
            {project.thumbnail_url && (
              <img
                src={project.thumbnail_url}
                alt={project.name}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            )}
            <div className="absolute left-2 top-2">
              <StatusBadge
                variant="status"
                value={project.status}
                label={getProjectStatusLabel(project.status, ui)}
              />
            </div>
          </div>

          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 text-sm font-semibold leading-5">
              {project.name}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={isPinned ? ui.unpin : ui.pin}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin();
                }}
              >
                <Star
                  className={cn(
                    "h-3.5 w-3.5",
                    isPinned && "fill-amber-500 text-amber-500",
                  )}
                />
              </button>
              {/* Drag handle */}
              <div
                {...listeners}
                className="cursor-grab touch-manipulation p-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              </div>
            </div>
          </div>

          {/* One-line summary */}
          {summary && (
            <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
              {summary}
            </p>
          )}

          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="mt-2">
              <Progress value={completionPct} className="h-1.5" />
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs leading-5 text-muted-foreground">
            <StatusBadge
              variant="priority"
              value={project.priority}
              label={getProjectPriorityLabel(project.priority, ui)}
            />
            {dateRange && (
              <span className="tabular-nums">
                📅 {dateRange}
              </span>
            )}
            {tasks.length > 0 && (
              <span className="tabular-nums">
                ✓ {completedTasks}/{tasks.length}
              </span>
            )}
          </div>

          {/* Linked entities */}
          {(noteCount > 0 || ideaCount > 0) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs leading-5 text-muted-foreground/70">
              {noteCount > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {noteCount} {ui.notes}
                </span>
              )}
              {ideaCount > 0 && (
                <span className="flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  {ideaCount} {ui.ideas}
                </span>
              )}
            </div>
          )}

          {/* State indicators */}
          {(stale || atRisk || onFire) && (
            <div className="flex flex-wrap items-center gap-2">
              {stale && (
                <Badge
                  variant="secondary"
                  className="h-5 gap-1 text-[10px] text-amber-600 dark:text-amber-400"
                >
                  <CloudFog className="h-3 w-3" />
                  {ui.staleLabel}
                </Badge>
              )}
              {atRisk && (
                <Badge
                  variant="secondary"
                  className="h-5 gap-1 text-[10px] text-red-600 dark:text-red-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {ui.atRiskLabel}
                </Badge>
              )}
              {onFire && !stale && (
                <Badge
                  variant="secondary"
                  className="h-5 gap-1 text-[10px] text-orange-600 dark:text-orange-400"
                >
                  <Flame className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}

          {/* Health dot */}
          <div className="flex items-center gap-1.5" title={health.reasons.join(" · ")}>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                health.level === "good" && "bg-green-500",
                health.level === "warning" && "bg-amber-500",
                health.level === "critical" && "bg-red-500",
              )}
            />
            <span className="text-[10px] text-muted-foreground">
              {health.score}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
