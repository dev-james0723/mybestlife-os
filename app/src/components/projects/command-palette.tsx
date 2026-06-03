"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { Dialog } from "@/components/ui/dialog";
import { OSDialogSurface } from "@/components/ui/os-primitives";
import {
  Plus,
  Columns3,
  LayoutGrid,
  List,
  Network,
  GanttChart,
  Search,
  CloudFog,
  CalendarDays,
  Flame,
  Pin,
  FolderKanban,
} from "lucide-react";
import type { ProjectViewMode, ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectWithMeta[];
  onSelectProject: (project: Project) => void;
  onSetView: (view: ProjectViewMode) => void;
  onNewProject: () => void;
  onNavigatePlanner: () => void;
  onSetInsightFilter: (filter: string | null) => void;
  ui: ProjectsUiCopy;
}

export function ProjectCommandPalette({
  open,
  onOpenChange,
  projects,
  onSelectProject,
  onSetView,
  onNewProject,
  onNavigatePlanner,
  onSetInsightFilter,
  ui,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const commandItemClassName =
    "flex min-h-11 items-center gap-2 rounded-[0.95rem] px-3 text-sm font-medium text-foreground/90 cursor-pointer transition-colors duration-150 aria-selected:bg-lime-300/18 aria-selected:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 motion-reduce:transition-none";

  const runAndClose = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setQuery("");
        onOpenChange(v);
      }}
    >
      <OSDialogSurface className="max-w-lg overflow-hidden p-0" showCloseButton={false}>
        <Command
          className="border-0 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[0.68rem] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground/80"
          shouldFilter
        >
          <div className="flex items-center border-b border-slate-200/65 bg-white/58 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-white/[0.04]">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={`${ui.searchPlaceholder.replace(/\.\.\.$/, "")} or command`}
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-[min(70dvh,460px)] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {ui.noResultsTitle}
            </Command.Empty>

            {/* Actions group */}
            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() => runAndClose(onNewProject)}
                className={commandItemClassName}
              >
                <Plus className="h-4 w-4" />
                {ui.newProject}
              </Command.Item>
              <Command.Item
                onSelect={() => runAndClose(onNavigatePlanner)}
                className={commandItemClassName}
              >
                <CalendarDays className="h-4 w-4" />
                {ui.dailyPlanner}
              </Command.Item>
            </Command.Group>

            {/* View group */}
            <Command.Group heading="Switch View">
              {(
                [
                  { key: "kanban", icon: Columns3, label: ui.viewKanban },
                  { key: "gallery", icon: LayoutGrid, label: ui.viewGallery },
                  { key: "list", icon: List, label: ui.viewList },
                  { key: "map", icon: Network, label: ui.viewMap },
                  { key: "timeline", icon: GanttChart, label: ui.viewTimeline },
                ] as const
              ).map((v) => {
                const Icon = v.icon;
                return (
                  <Command.Item
                    key={v.key}
                    onSelect={() =>
                      runAndClose(() => onSetView(v.key as ProjectViewMode))
                    }
                    className={commandItemClassName}
                  >
                    <Icon className="h-4 w-4" />
                    {v.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {/* Filters group */}
            <Command.Group heading="Quick Filters">
              <Command.Item
                onSelect={() =>
                  runAndClose(() => onSetInsightFilter("stale"))
                }
                className={commandItemClassName}
              >
                <CloudFog className="h-4 w-4" />
                {ui.insightStale}
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runAndClose(() => onSetInsightFilter("dueThisWeek"))
                }
                className={commandItemClassName}
              >
                <CalendarDays className="h-4 w-4" />
                {ui.insightDueThisWeek}
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runAndClose(() => onSetInsightFilter("active"))
                }
                className={commandItemClassName}
              >
                <Flame className="h-4 w-4" />
                {ui.insightActiveNow}
              </Command.Item>
            </Command.Group>

            {/* Projects group */}
            {projects.length > 0 && (
              <Command.Group heading="Go to Project">
                {projects.slice(0, 20).map((p) => (
                  <Command.Item
                    key={p.project.id}
                    value={p.project.name}
                    onSelect={() =>
                      runAndClose(() => onSelectProject(p.project))
                    }
                    className={commandItemClassName}
                  >
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{p.project.name}</span>
                    {p.isPinned && (
                      <Pin className="ml-auto h-3 w-3 text-amber-500" />
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </OSDialogSurface>
    </Dialog>
  );
}
