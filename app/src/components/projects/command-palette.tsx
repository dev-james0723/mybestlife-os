"use client";

import { useState } from "react";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
      <DialogContent className="p-0 overflow-hidden max-w-lg" showCloseButton={false}>
        <Command className="border-0" shouldFilter>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Type a command or search projects..."
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Actions group */}
            <Command.Group heading="Actions">
              <Command.Item
                onSelect={() => runAndClose(onNewProject)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
              >
                <Plus className="h-4 w-4" />
                {ui.newProject}
              </Command.Item>
              <Command.Item
                onSelect={() => runAndClose(onNavigatePlanner)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
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
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
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
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
              >
                <CloudFog className="h-4 w-4" />
                Show stale projects
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runAndClose(() => onSetInsightFilter("dueThisWeek"))
                }
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
              >
                <CalendarDays className="h-4 w-4" />
                Show this week
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runAndClose(() => onSetInsightFilter("active"))
                }
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
              >
                <Flame className="h-4 w-4" />
                Show active projects
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
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer aria-selected:bg-muted"
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
      </DialogContent>
    </Dialog>
  );
}
