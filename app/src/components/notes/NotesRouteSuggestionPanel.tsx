"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FolderKanban,
  HelpCircle,
  Lightbulb,
  Loader2,
  NotebookPen,
  Route,
  ScrollText,
  Sparkles,
  SquareCheckBig,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OSControl, OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { postNoteAi, type NoteAiResponse } from "@/lib/ai/note-ai";
import type {
  NoteAiMode,
  NoteRouteSuggestion,
} from "@/lib/ai/schemas/notes";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import {
  getNoteRouteSuggestion,
  type NoteDestination,
} from "@/lib/notes/note-routing";
import type { Note } from "@/types/database";

const DESTINATION_ICONS: Record<NoteDestination, LucideIcon> = {
  note: NotebookPen,
  idea: Lightbulb,
  knowledge: BookOpenCheck,
  task: SquareCheckBig,
  project: FolderKanban,
  journal: ScrollText,
};

function sourceLabel(copy: NotesUiCopy, source: "heuristic" | "fallback" | "gemini") {
  if (source === "gemini") return copy.aiSourceGemini;
  if (source === "fallback") return copy.aiSourceFallback;
  return copy.routeSuggestion.heuristicSource;
}

export function NotesRouteSuggestionPanel({
  note,
  copy,
  locale,
  onAiResult,
}: {
  note: Note | null;
  copy: NotesUiCopy;
  locale: AppLocale;
  onAiResult?: (
    note: Note,
    mode: NoteAiMode,
    result: NoteAiResponse<NoteAiMode>,
  ) => void | Promise<void>;
}) {
  const tasksHref = useLocalizedPath("/tasks");
  const ideasHref = useLocalizedPath("/ideas");
  const knowledgeHref = useLocalizedPath("/knowledge-base");
  const projectsHref = useLocalizedPath("/projects");
  const journalHref = useLocalizedPath("/journal");
  const notesHref = useLocalizedPath("/notes");
  const [aiSuggestion, setAiSuggestion] = useState<{
    noteId: string;
    result: NoteAiResponse<"route">;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [routeError, setRouteError] = useState<{
    noteId: string;
    message: string;
  } | null>(null);

  const activeAiSuggestion =
    note && aiSuggestion?.noteId === note.id ? aiSuggestion.result : null;
  const error = note && routeError?.noteId === note.id ? routeError.message : null;

  const suggestion = useMemo<NoteRouteSuggestion | null>(() => {
    if (activeAiSuggestion) return activeAiSuggestion;
    return note ? getNoteRouteSuggestion(note) : null;
  }, [activeAiSuggestion, note]);

  const source = activeAiSuggestion?.source ?? "heuristic";

  const destinationHref: Record<NoteDestination, string> = {
    note: notesHref,
    idea: ideasHref,
    knowledge: knowledgeHref,
    task: tasksHref,
    project: projectsHref,
    journal: journalHref,
  };

  async function runRoute() {
    if (!note || running) return;
    setRunning(true);
    setRouteError(null);
    try {
      const response = await postNoteAi("route", {
        locale,
        noteId: note.id,
        noteTitle: note.title,
        noteContent: note.content ?? note.title,
        scope: "current-note",
        activeProjectId: note.project_id,
        activeProjectName: note.project?.name ?? null,
      });
      setAiSuggestion({ noteId: note.id, result: response });
      void onAiResult?.(note, "route", response);
    } catch {
      setRouteError({ noteId: note.id, message: copy.aiUnavailable });
    } finally {
      setRunning(false);
    }
  }

  if (!note || !suggestion) {
    return (
      <OSFrostedPanel className="p-4">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold text-foreground">
            {copy.routeSuggestion.title}
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {copy.routeSuggestion.empty}
        </p>
      </OSFrostedPanel>
    );
  }

  const DestinationIcon = DESTINATION_ICONS[suggestion.destination];

  return (
    <OSFrostedPanel className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold text-foreground">
              {copy.routeSuggestion.title}
            </div>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.routeSuggestion.subtitle}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 bg-background/55">
          {sourceLabel(copy, source)}
        </Badge>
      </div>

      <div className="rounded-xl border border-black/8 bg-background/45 p-3 dark:border-white/10">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <DestinationIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {copy.routeSuggestion.destinations[suggestion.destination]}
              </span>
              <Badge variant="outline" className="bg-background/55">
                {Math.round(suggestion.confidence * 100)}% {copy.confidence}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {suggestion.nextBestAction}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {suggestion.rationale}
            </p>
          </div>
        </div>

        {suggestion.secondaryDestinations.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {suggestion.secondaryDestinations.map((destination) => (
              <Badge key={destination} variant="ghost" className="bg-background/55">
                {copy.routeSuggestion.destinations[destination]}
              </Badge>
            ))}
          </div>
        ) : null}

        {suggestion.evidence.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.routeSuggestion.evidence}
            </div>
            {suggestion.evidence.map((item) => (
              <p
                key={item}
                className="rounded-lg bg-background/60 px-2.5 py-1.5 text-xs leading-5 text-muted-foreground"
              >
                {item}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <OSPrimaryAction
          type="button"
          onClick={() => void runRoute()}
          disabled={running}
          className="justify-center"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {running ? copy.aiRunning : copy.routeSuggestion.runAiRoute}
        </OSPrimaryAction>
        <OSControl
          osSize="compact"
          render={<Link href={destinationHref[suggestion.destination]} />}
          className="justify-center"
        >
          <CheckCircle2 className="h-4 w-4" />
          {copy.routeSuggestion.openDestination}
          <ArrowRight className="h-4 w-4" />
        </OSControl>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-black/8 bg-background/35 p-3 text-xs leading-5 text-muted-foreground dark:border-white/10 dark:bg-white/[0.035]">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        {copy.routeSuggestion.approvalNotice}
      </div>
    </OSFrostedPanel>
  );
}
