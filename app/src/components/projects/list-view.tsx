"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Star, Archive, ArrowRightLeft, X } from "lucide-react";
import { getProjectOneSentenceSummary } from "@/lib/projects/card-format";
import {
  getProjectDateRangeLabelLocalized,
  getProjectStatusOptions,
  getProjectPriorityLabel,
  getProjectStatusLabel,
} from "@/lib/projects/presentation";
import { useAppStore } from "@/stores/app-store";
import type { ProjectWithMeta } from "@/app/[locale]/(protected)/projects/page";
import type { Project } from "@/types/database";
import type { ProjectsUiCopy } from "@/lib/i18n/projects-ui";

interface ListViewProps {
  projects: ProjectWithMeta[];
  onSelectProject: (project: Project) => void;
  onTogglePin: (id: string) => void;
  onStatusChange: (projectId: string, status: Project["status"]) => void;
  ui: ProjectsUiCopy;
}

export function ProjectListView({
  projects,
  onSelectProject,
  onTogglePin,
  onStatusChange,
  ui,
}: ListViewProps) {
  const language = useAppStore((s) => s.language);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const localizedStatusOptions = getProjectStatusOptions(ui);

  const toggleSelect = useCallback(
    (id: string, e: React.MouseEvent) => {
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      }
    },
    [],
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkChangeStatus = useCallback(
    (status: Project["status"]) => {
      for (const id of selectedIds) {
        onStatusChange(id, status);
      }
      clearSelection();
    },
    [selectedIds, onStatusChange, clearSelection],
  );

  return (
    <div className="space-y-1.5">
      {/* Table header (desktop) */}
      <div className="hidden sm:grid sm:grid-cols-[auto_1fr_100px_80px_120px_80px_160px] items-center gap-3 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="w-5" />
        <div>{ui.tableName}</div>
        <div>{ui.filterStatus}</div>
        <div>{ui.filterPriority}</div>
        <div>{ui.tableProgress}</div>
        <div>{ui.tasks}</div>
        <div>{ui.tableDue}</div>
      </div>

      {/* Rows */}
      <AnimatePresence>
        {projects.map((item) => {
          const { project, tasks, health, isPinned } = item;
          const completedTasks = tasks.filter(
            (t) => t.status === "done",
          ).length;
          const completionPct =
            tasks.length > 0
              ? Math.round((completedTasks / tasks.length) * 100)
              : 0;
          const isSelected = selectedIds.has(project.id);
          const summary = getProjectOneSentenceSummary(project.description);
          const dateRange = getProjectDateRangeLabelLocalized(project, language);

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              {/* Desktop row */}
              <div
                className={cn(
                  "hidden sm:grid sm:grid-cols-[auto_1fr_100px_80px_120px_80px_160px] items-center gap-3 rounded-lg border bg-card px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/30",
                  isSelected && "ring-2 ring-primary/30 bg-primary/5",
                )}
                onClick={(e) => {
                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                    toggleSelect(project.id, e);
                  } else {
                    onSelectProject(project);
                  }
                }}
              >
                {/* Pin */}
                <button
                  className="flex h-5 w-5 items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(project.id);
                  }}
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5 transition-colors",
                      isPinned
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground/30 hover:text-muted-foreground",
                    )}
                  />
                </button>

                {/* Name + health */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      health.level === "good" && "bg-green-500",
                      health.level === "warning" && "bg-amber-500",
                      health.level === "critical" && "bg-red-500",
                    )}
                  />
                  <div className="min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {project.name}
                    </span>
                    {summary && (
                      <span className="block text-xs text-muted-foreground truncate">
                        {summary}
                      </span>
                    )}
                  </div>
                </div>

                <StatusBadge
                  variant="status"
                  value={project.status}
                  label={getProjectStatusLabel(project.status, ui)}
                />
                <StatusBadge
                  variant="priority"
                  value={project.priority}
                  label={getProjectPriorityLabel(project.priority, ui)}
                />

                {/* Progress */}
                <div className="flex items-center gap-2">
                  <Progress value={completionPct} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                    {completionPct}%
                  </span>
                </div>

                {/* Tasks */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {completedTasks}/{tasks.length}
                </span>

                {/* Due */}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {dateRange || "—"}
                </span>
              </div>

              {/* Mobile card */}
              <Card
                className="sm:hidden cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => onSelectProject(project)}
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          health.level === "good" && "bg-green-500",
                          health.level === "warning" && "bg-amber-500",
                          health.level === "critical" && "bg-red-500",
                        )}
                      />
                      <h4 className="text-sm font-medium truncate">
                        {project.name}
                      </h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(project.id);
                      }}
                    >
                      <Star
                        className={cn(
                          "h-3.5 w-3.5",
                          isPinned
                            ? "fill-amber-500 text-amber-500"
                            : "text-muted-foreground/30",
                        )}
                      />
                    </button>
                  </div>
                  {summary && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {summary}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      variant="status"
                      value={project.status}
                      label={getProjectStatusLabel(project.status, ui)}
                    />
                    <StatusBadge
                      variant="priority"
                      value={project.priority}
                      label={getProjectPriorityLabel(project.priority, ui)}
                    />
                    {tasks.length > 0 && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        ✓ {completedTasks}/{tasks.length}
                      </span>
                    )}
                    {dateRange && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        📅 {dateRange}
                      </span>
                    )}
                  </div>
                  {tasks.length > 0 && (
                    <Progress value={completionPct} className="h-1" />
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Bulk actions toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg"
          >
            <span className="text-sm font-medium">
              {ui.projectsSelected(selectedIds.size)}
            </span>

            <Select
              onValueChange={(v) =>
                bulkChangeStatus(v as Project["status"])
              }
              itemToStringLabel={(v) =>
                getProjectStatusLabel(v as Project["status"], ui)
              }
            >
              <SelectTrigger className="h-8 w-auto gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <SelectValue placeholder={ui.changeStatus} />
              </SelectTrigger>
              <SelectContent>
                {localizedStatusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() =>
                bulkChangeStatus("cancelled")
              }
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              {ui.archive}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
