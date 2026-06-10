"use client";

import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  FileQuestion,
  FileSearch,
  HelpCircle,
  Link2,
  ListTodo,
  MessageSquareText,
  MoreHorizontal,
  Route,
  Star,
  Trash2,
  Vote,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { OSFrostedPanel, OSIconControl } from "@/components/ui/os-primitives";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import {
  NOTE_REVIEW_STATES,
  getNoteRouteSuggestion,
  inferNoteReviewState,
  rankNextReviewNotes,
  type NoteReviewState,
} from "@/lib/notes/note-routing";
import { inferNoteType, NOTE_TYPE_LABELS, notePreview } from "@/lib/notes/note-types";
import { cn } from "@/lib/utils";
import type { Note } from "@/types/database";

const REVIEW_ICONS: Record<NoteReviewState, LucideIcon> = {
  unprocessed: Zap,
  "needs-clarification": HelpCircle,
  "action-candidates": ListTodo,
  "meeting-review": MessageSquareText,
  decisions: Vote,
  "research-to-promote": FileSearch,
  orphans: FileQuestion,
  "recently-processed": CheckCircle2,
};

function timeAgo(value: string) {
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "";
  }
}

function NoteWorkbenchRow({
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
  const route = getNoteRouteSuggestion(note);

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
        "group grid cursor-pointer gap-3 rounded-lg border bg-background/45 p-3 outline-none transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-background/75 focus-visible:ring-3 focus-visible:ring-ring/40 lg:grid-cols-[minmax(0,1fr)_220px]",
        selected
          ? "border-primary/35 ring-1 ring-primary/25"
          : "border-black/8 dark:border-white/10",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {note.title || copy.untitled}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
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
      </div>

      <div className="rounded-lg border border-black/8 bg-background/45 p-3 dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="gap-1 bg-background/55">
            <Route className="h-3 w-3" />
            {copy.routeSuggestion.destinations[route.destination]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {timeAgo(note.updated_at || note.created_at)}
          </span>
        </div>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
          {route.nextBestAction}
        </p>
      </div>
    </article>
  );
}

export function NotesWorkbench({
  notes,
  allNotesCount,
  selectedNoteId,
  copy,
  activeReviewState,
  onOpenNote,
  onToggleFavorite,
  onDeleteNote,
}: {
  notes: Note[];
  allNotesCount: number;
  selectedNoteId: string | null;
  copy: NotesUiCopy;
  activeReviewState: NoteReviewState | "all";
  onOpenNote: (note: Note) => void;
  onToggleFavorite: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
}) {
  const rankedNotes = rankNextReviewNotes(notes);
  const groups = NOTE_REVIEW_STATES.map((state) => ({
    state,
    notes: rankedNotes.filter((note) => inferNoteReviewState(note) === state),
  })).filter((group) => group.notes.length > 0);

  return (
    <OSFrostedPanel className="min-w-0 overflow-hidden p-0" data-notes-reveal>
      <div className="flex flex-col gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">
            {copy.workbench.title}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {activeReviewState === "all"
              ? copy.workbench.subtitle
              : copy.reviewStates[activeReviewState].description}
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-background/55">
          {notes.length} {copy.workbench.visible}
        </Badge>
      </div>

      {notes.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={Route}
            title={allNotesCount === 0 ? copy.emptyTitle : copy.emptyFilteredTitle}
            description={
              allNotesCount === 0
                ? copy.emptyDescription
                : copy.emptyFilteredDescription
            }
          />
        </div>
      ) : null}

      <div className="space-y-4 p-2">
        {groups.map((group) => {
          const Icon = REVIEW_ICONS[group.state];
          return (
            <section key={group.state} className="space-y-2">
              <div className="flex items-center justify-between gap-3 px-2 pt-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {copy.reviewStates[group.state].label}
                  </h2>
                </div>
                <Badge variant="ghost" className="bg-background/45">
                  {group.notes.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {group.notes.map((note) => (
                  <NoteWorkbenchRow
                    key={note.id}
                    note={note}
                    copy={copy}
                    selected={selectedNoteId === note.id}
                    onOpen={onOpenNote}
                    onToggleFavorite={onToggleFavorite}
                    onDelete={onDeleteNote}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </OSFrostedPanel>
  );
}
