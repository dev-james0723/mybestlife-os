"use client";

import type { LucideIcon } from "lucide-react";
import { FileText, Inbox, Link2, ListTodo, Mic2, NotebookPen } from "lucide-react";
import { OSFrostedPanel } from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import type { NoteOverview } from "@/lib/notes/note-analytics";
import type { NoteCollection } from "@/lib/notes/note-filters";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";

type Metric = {
  key: keyof NoteOverview;
  label: string;
  icon: LucideIcon;
  collection: NoteCollection;
};

export function NotesOverviewStrip({
  overview,
  copy,
  activeCollection,
  onSelectCollection,
}: {
  overview: NoteOverview;
  copy: NotesUiCopy;
  activeCollection: NoteCollection;
  onSelectCollection: (collection: NoteCollection) => void;
}) {
  const metrics: Metric[] = [
    { key: "total", label: copy.overview.total, icon: NotebookPen, collection: "inbox" },
    { key: "today", label: copy.overview.today, icon: Inbox, collection: "today" },
    { key: "actionable", label: copy.overview.actionable, icon: ListTodo, collection: "actionable" },
    { key: "meetings", label: copy.overview.meetings, icon: Mic2, collection: "meetings" },
    { key: "projectNotes", label: copy.overview.projectNotes, icon: Link2, collection: "project-notes" },
    { key: "orphans", label: copy.overview.orphans, icon: FileText, collection: "orphans" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" data-notes-reveal>
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const active = activeCollection === metric.collection;
        return (
          <button
            key={metric.key}
            type="button"
            onClick={() => onSelectCollection(metric.collection)}
            className="group text-left"
          >
            <OSFrostedPanel
              className={cn(
                "h-full p-3 transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 group-hover:bg-background/70",
                active && "ring-1 ring-primary/30",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className={cn("h-4 w-4 text-muted-foreground", active && "text-primary")} />
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {overview[metric.key]}
                </span>
              </div>
              <div className="mt-2 text-xs font-medium text-muted-foreground">
                {metric.label}
              </div>
            </OSFrostedPanel>
          </button>
        );
      })}
    </div>
  );
}
