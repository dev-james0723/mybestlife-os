"use client";

import { ArrowRight, FileText, ListTodo, Mic2, Network, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OSControl, OSFrostedPanel } from "@/components/ui/os-primitives";
import type { NoteAiResponse } from "@/lib/ai/note-ai";
import type { NoteAiMode } from "@/lib/ai/schemas/notes";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { NoteOverview } from "@/lib/notes/note-analytics";
import type { NoteCollection } from "@/lib/notes/note-filters";
import {
  inferNoteReviewState,
  rankNextReviewNotes,
  type NoteReviewState,
} from "@/lib/notes/note-routing";
import { inferNoteType, NOTE_TYPE_LABELS, notePreview } from "@/lib/notes/note-types";
import type { Note } from "@/types/database";
import { NotesRouteSuggestionPanel } from "./NotesRouteSuggestionPanel";

type NotesFocusPanelProps = {
  copy: NotesUiCopy;
  overview: NoteOverview;
  allNotes: Note[];
  activeCollection: NoteCollection;
  activeReviewState: NoteReviewState | "all";
  selectedNote: Note | null;
  locale: AppLocale;
  onSelectCollection: (collection: NoteCollection) => void;
  onSelectReviewState: (state: NoteReviewState) => void;
  onFocusMeeting: () => void;
  onOpenNote: (note: Note) => void;
  onAiRouteResult?: (
    note: Note,
    mode: NoteAiMode,
    result: NoteAiResponse<NoteAiMode>,
  ) => void | Promise<void>;
};

function collectionLabel(copy: NotesUiCopy, collection: NoteCollection) {
  switch (collection) {
    case "project-notes":
      return copy.collections.projectNotes;
    default:
      return copy.collections[collection];
  }
}

export function NotesFocusPanel({
  copy,
  overview,
  allNotes,
  activeCollection,
  activeReviewState,
  selectedNote,
  locale,
  onSelectCollection,
  onSelectReviewState,
  onFocusMeeting,
  onOpenNote,
  onAiRouteResult,
}: NotesFocusPanelProps) {
  const selectedType = selectedNote ? inferNoteType(selectedNote) : null;
  const nextReviewNotes = rankNextReviewNotes(allNotes).slice(0, 4);

  return (
    <aside className="min-w-0 space-y-3 lg:w-[320px] xl:w-[340px]" data-notes-reveal>
      <NotesRouteSuggestionPanel
        note={selectedNote}
        copy={copy}
        locale={locale}
        onAiResult={onAiRouteResult}
      />

      <OSFrostedPanel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">
              {copy.focusPanel.title}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.focusPanel.subtitle}
            </p>
          </div>
          <Network className="h-4 w-4 shrink-0 text-primary" />
        </div>

        <div className="mt-4 rounded-lg border border-black/8 bg-background/40 p-3 dark:border-white/10 dark:bg-white/[0.035]">
          <div className="text-xs font-medium text-muted-foreground">
            {copy.focusPanel.activeCollection}
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              {collectionLabel(copy, activeCollection)}
            </span>
            <Badge variant="outline" className="bg-background/55">
              {overview.total}
            </Badge>
          </div>
        </div>
      </OSFrostedPanel>

      <OSFrostedPanel className="p-4">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            {copy.focusPanel.nextBestReview}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {nextReviewNotes.map((note) => {
            const state = inferNoteReviewState(note);
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => {
                  onSelectReviewState(state);
                  onOpenNote(note);
                }}
                className="w-full rounded-lg border border-black/8 bg-background/40 p-3 text-left transition hover:bg-background/70 dark:border-white/10 dark:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-xs font-semibold text-foreground">
                      {note.title || copy.untitled}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {notePreview(note, 120)}
                    </p>
                  </div>
                  <Badge
                    variant={activeReviewState === state ? "default" : "outline"}
                    className="shrink-0"
                  >
                    {copy.reviewStates[state].label}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </OSFrostedPanel>

      <OSFrostedPanel className="p-4">
        <div className="flex items-center gap-2">
          <Mic2 className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            {copy.focusPanel.meetingReadiness}
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {copy.focusPanel.meetingReadinessDescription}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSelectCollection("meetings")}
            className="rounded-lg border border-black/8 bg-background/40 p-3 text-left transition hover:bg-background/70 dark:border-white/10 dark:bg-white/[0.035]"
          >
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {overview.meetings}
            </div>
            <div className="text-xs text-muted-foreground">
              {copy.collections.meetings}
            </div>
          </button>
          <button
            type="button"
            onClick={onFocusMeeting}
            className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-left transition hover:bg-primary/15"
          >
            <ArrowRight className="h-4 w-4 text-primary" />
            <div className="mt-2 text-xs font-semibold text-primary">
              {copy.liveMeeting}
            </div>
          </button>
        </div>
      </OSFrostedPanel>

      <OSFrostedPanel className="p-4">
        <div className="flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            {copy.focusPanel.nextActions}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <OSControl
            type="button"
            onClick={() => onSelectCollection("actionable")}
            className="w-full justify-between"
          >
            {copy.focusPanel.processActionable}
            <Badge variant="outline" className="bg-background/55">
              {overview.actionable}
            </Badge>
          </OSControl>
          <OSControl
            type="button"
            onClick={() => onSelectCollection("meetings")}
            className="w-full justify-between"
          >
            {copy.focusPanel.openMeetings}
            <Badge variant="outline" className="bg-background/55">
              {overview.meetings}
            </Badge>
          </OSControl>
          <OSControl
            type="button"
            onClick={() => onSelectCollection("orphans")}
            className="w-full justify-between"
          >
            {copy.focusPanel.reviewOrphans}
            <Badge variant="outline" className="bg-background/55">
              {overview.orphans}
            </Badge>
          </OSControl>
        </div>
      </OSFrostedPanel>

      <OSFrostedPanel className="p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            {copy.focusPanel.selectedNote}
          </div>
        </div>
        {selectedNote ? (
          <div className="mt-3 space-y-2">
            <div className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
              {selectedNote.title || copy.untitled}
            </div>
            <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
              {notePreview(selectedNote, 180)}
            </p>
            {selectedType ? (
              <Badge variant="outline" className="bg-background/55">
                {NOTE_TYPE_LABELS[selectedType]}
              </Badge>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {copy.focusPanel.noSelectedNote}
          </p>
        )}
      </OSFrostedPanel>
    </aside>
  );
}
