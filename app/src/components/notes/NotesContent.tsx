"use client";

import { formatDistanceToNow } from "date-fns";
import { FileText, Link2, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { OSFrostedPanel, OSIconControl } from "@/components/ui/os-primitives";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { inferNoteType, NOTE_TYPE_LABELS, notePreview } from "@/lib/notes/note-types";
import type { NoteFilterState } from "@/lib/notes/note-filters";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { Note } from "@/types/database";

function timeAgo(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "";
  }
}

function NoteCard({
  note,
  copy,
  selected,
  onOpen,
  onToggleFavorite,
  onDelete,
}: {
  note: Note;
  copy: NotesUiCopy;
  selected: boolean;
  onOpen: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onDelete: (note: Note) => void;
}) {
  const noteType = inferNoteType(note);
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(note)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(note);
        }
      }}
      className={cn(
        "group cursor-pointer rounded-xl border bg-background/50 p-4 outline-none transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-background/75 focus-visible:ring-3 focus-visible:ring-ring/40",
        selected
          ? "border-primary/35 ring-1 ring-primary/25"
          : "border-black/8 dark:border-white/10",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
            {note.title || copy.untitled}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {note.content ? notePreview(note) : copy.noPreview}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <OSIconControl
                    type="button"
                    osSize="compact"
                    aria-label={note.is_favorite ? copy.unfavorite : copy.favorite}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(note);
                    }}
                  />
                }
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    note.is_favorite && "fill-amber-400 text-amber-500",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                {note.is_favorite ? copy.unfavorite : copy.favorite}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <OSIconControl
                    type="button"
                    osSize="compact"
                    aria-label={copy.deleteNote}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(note);
                    }}
                  />
                }
              >
                <Trash2 className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>{copy.deleteNote}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="bg-background/50">
          {NOTE_TYPE_LABELS[noteType]}
        </Badge>
        {note.category ? (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {note.category}
          </Badge>
        ) : null}
        {note.project ? (
          <Badge variant="outline" className="gap-1 bg-background/50">
            <Link2 className="h-3 w-3" />
            {note.project.name}
          </Badge>
        ) : null}
        {(note.tags ?? []).slice(0, 4).map((tag) => (
          <Badge key={tag} variant="ghost" className="bg-background/45">
            {tag}
          </Badge>
        ))}
        {(note.tags ?? []).length > 4 ? (
          <Badge variant="ghost" className="bg-background/45">
            <MoreHorizontal className="h-3 w-3" />
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {timeAgo(note.updated_at || note.created_at)}
      </div>
    </article>
  );
}

export function NotesContent({
  notes,
  allNotesCount,
  selectedNoteId,
  filter,
  copy,
  onOpenNote,
  onToggleFavorite,
  onDeleteNote,
}: {
  notes: Note[];
  allNotesCount: number;
  selectedNoteId: string | null;
  filter: NoteFilterState;
  copy: NotesUiCopy;
  onOpenNote: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
}) {
  if (notes.length === 0) {
    return (
      <OSFrostedPanel className="p-6" data-notes-reveal>
        <EmptyState
          icon={FileText}
          title={allNotesCount === 0 ? copy.emptyTitle : copy.emptyFilteredTitle}
          description={
            allNotesCount === 0
              ? copy.emptyDescription
              : copy.emptyFilteredDescription
          }
        />
      </OSFrostedPanel>
    );
  }

  return (
    <OSFrostedPanel className="min-w-0 p-2" data-notes-reveal>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            copy={copy}
            selected={selectedNoteId === note.id && filter.collection !== "inbox"}
            onOpen={onOpenNote}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDeleteNote}
          />
        ))}
      </div>
    </OSFrostedPanel>
  );
}
