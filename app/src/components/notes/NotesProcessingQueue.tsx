"use client";

import {
  CheckCircle2,
  CircleDot,
  FileQuestion,
  FileSearch,
  HelpCircle,
  ListTodo,
  MessageSquareText,
  Route,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OSFrostedPanel } from "@/components/ui/os-primitives";
import {
  NOTE_REVIEW_STATES,
  computeNoteReviewCounts,
  type NoteReviewState,
} from "@/lib/notes/note-routing";
import { cn } from "@/lib/utils";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { Note } from "@/types/database";

const REVIEW_ICONS: Record<NoteReviewState, LucideIcon> = {
  unprocessed: CircleDot,
  "needs-clarification": HelpCircle,
  "action-candidates": ListTodo,
  "meeting-review": MessageSquareText,
  decisions: Vote,
  "research-to-promote": FileSearch,
  orphans: FileQuestion,
  "recently-processed": CheckCircle2,
};

export function NotesProcessingQueue({
  notes,
  copy,
  activeReviewState,
  onSelectReviewState,
}: {
  notes: Note[];
  copy: NotesUiCopy;
  activeReviewState: NoteReviewState | "all";
  onSelectReviewState: (state: NoteReviewState) => void;
}) {
  const counts = computeNoteReviewCounts(notes);

  return (
    <OSFrostedPanel className="overflow-hidden p-0" data-notes-reveal>
      <div className="flex flex-col gap-2 border-b border-black/5 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Route className="h-4 w-4 text-primary" />
            {copy.processingQueue.title}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.processingQueue.subtitle}
          </p>
        </div>
        <Badge variant="outline" className="w-fit bg-background/55">
          {copy.processingQueue.aiSuggestsUserApproves}
        </Badge>
      </div>

      <div className="flex gap-2 overflow-x-auto p-2 xl:grid xl:grid-cols-4">
        {NOTE_REVIEW_STATES.map((state) => {
          const Icon = REVIEW_ICONS[state];
          const active = activeReviewState === state;
          return (
            <button
              key={state}
              type="button"
              onClick={() => onSelectReviewState(state)}
              className={cn(
                "group min-w-[220px] rounded-lg border p-3 text-left transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-background/70 xl:min-w-0",
                active
                  ? "border-primary/30 bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "border-black/8 bg-background/35 text-foreground dark:border-white/10 dark:bg-white/[0.035]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <Icon className={cn("mt-0.5 h-4 w-4 text-muted-foreground", active && "text-primary")} />
                <span className="text-lg font-semibold tabular-nums">
                  {counts[state]}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold">
                {copy.reviewStates[state].label}
              </div>
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {copy.reviewStates[state].description}
              </div>
            </button>
          );
        })}
      </div>
    </OSFrostedPanel>
  );
}
