"use client";

import {
  Archive,
  CalendarDays,
  FileQuestion,
  Inbox,
  Link2,
  Microscope,
  Star,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { OSFrostedPanel } from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import type { NoteOverview } from "@/lib/notes/note-analytics";
import type { NoteCollection } from "@/lib/notes/note-filters";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";

const COLLECTION_ICONS: Record<NoteCollection, LucideIcon> = {
  inbox: Inbox,
  today: CalendarDays,
  actionable: Archive,
  meetings: Users,
  research: Microscope,
  decisions: Vote,
  favorites: Star,
  "project-notes": Link2,
  orphans: FileQuestion,
};

const COLLECTION_COUNTS: Record<NoteCollection, keyof NoteOverview> = {
  inbox: "total",
  today: "today",
  actionable: "actionable",
  meetings: "meetings",
  research: "research",
  decisions: "decisions",
  favorites: "favorites",
  "project-notes": "projectNotes",
  orphans: "orphans",
};

const COLLECTIONS: NoteCollection[] = [
  "inbox",
  "today",
  "actionable",
  "meetings",
  "research",
  "decisions",
  "favorites",
  "project-notes",
  "orphans",
];

function labelFor(copy: NotesUiCopy, collection: NoteCollection) {
  if (collection === "project-notes") return copy.collections.projectNotes;
  return copy.collections[collection];
}

function descriptionFor(copy: NotesUiCopy, collection: NoteCollection) {
  if (collection === "project-notes") return copy.collectionDescriptions.projectNotes;
  return copy.collectionDescriptions[collection];
}

export function NotesSidebar({
  copy,
  overview,
  activeCollection,
  onSelectCollection,
}: {
  copy: NotesUiCopy;
  overview: NoteOverview;
  activeCollection: NoteCollection;
  onSelectCollection: (collection: NoteCollection) => void;
}) {
  return (
    <OSFrostedPanel
      as="aside"
      className="min-w-0 p-2 lg:w-64 lg:shrink-0"
      data-notes-reveal
    >
      <div className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {COLLECTIONS.map((collection) => {
          const Icon = COLLECTION_ICONS[collection];
          const active = activeCollection === collection;
          return (
            <button
              key={collection}
              type="button"
              onClick={() => onSelectCollection(collection)}
              className={cn(
                "group flex min-w-[190px] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:min-w-0",
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-background/65 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {labelFor(copy, collection)}
                </span>
                <span className="block truncate text-xs opacity-75">
                  {descriptionFor(copy, collection)}
                </span>
              </span>
              <span className="rounded-md bg-background/70 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {overview[COLLECTION_COUNTS[collection]]}
              </span>
            </button>
          );
        })}
      </div>
    </OSFrostedPanel>
  );
}
