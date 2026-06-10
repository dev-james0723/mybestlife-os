"use client";

import { useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BarChart3, Mic2, NotebookPen, Sparkles } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { LoadingCards } from "@/components/shared/loading-state";
import { OSActionRow, OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import { useNotes, useCreateNote, useDeleteNote, useUpdateNote } from "@/hooks/use-notes";
import { useProjects } from "@/hooks/use-projects";
import { useCreateTask } from "@/hooks/use-tasks";
import { useAppStore } from "@/stores/app-store";
import { getNotesUiCopy } from "@/lib/i18n/notes-ui";
import { applyNoteFilters, collectNoteTags, countActiveNoteFilters, EMPTY_NOTE_FILTER, type NoteFilterState, type NoteSortKey } from "@/lib/notes/note-filters";
import { computeNoteOverview } from "@/lib/notes/note-analytics";
import { NOTE_TYPE_LABELS, type NoteType } from "@/lib/notes/note-types";
import { noteActionCandidatesRepository } from "@/lib/repositories/note-action-candidates";
import { notesRepository } from "@/lib/repositories/notes";
import type { NoteActionCandidate, NoteAiMode } from "@/lib/ai/schemas/notes";
import type { NoteAiResponse } from "@/lib/ai/note-ai";
import type { Json, Note, Project } from "@/types/database";
import { toast } from "sonner";
import { NotesQuickCapture, type QuickCaptureInput } from "./NotesQuickCapture";
import { NotesOverviewStrip } from "./NotesOverviewStrip";
import { NotesSidebar } from "./NotesSidebar";
import { NotesTopControlBar } from "./NotesTopControlBar";
import { NoteDetailSheet } from "./NoteDetailSheet";
import { NotesWorkflowRail } from "./NotesWorkflowRail";
import {
  NotesMeetingCapturePanel,
  type MeetingCaptureInput,
} from "./NotesMeetingCapturePanel";
import { NotesFocusPanel } from "./NotesFocusPanel";
import { NotesPurposeStrip } from "./NotesPurposeStrip";
import { NotesProcessingQueue } from "./NotesProcessingQueue";
import { NotesWorkbench } from "./NotesWorkbench";
import {
  inferNoteReviewState,
  type NoteReviewState,
} from "@/lib/notes/note-routing";

gsap.registerPlugin(useGSAP);

const EMPTY_NOTES: Note[] = [];
const EMPTY_PROJECTS: Project[] = [];

function titleFromCapture(content: string) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.trim();
  if (!firstLine) return "Untitled note";
  return firstLine.replace(/^#+\s*/, "").replace(/[.。]\s*$/, "").slice(0, 120);
}

function titleFromMeeting(input: MeetingCaptureInput) {
  if (input.title.trim()) return input.title.trim().slice(0, 120);
  const firstLine = input.transcript
    .split(/\r?\n/)
    .find((line) => line.trim())
    ?.trim();
  if (firstLine) return firstLine.replace(/^#+\s*/, "").slice(0, 120);
  return "Meeting note";
}

function normalizeTodoList(todoList: string) {
  return todoList
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.startsWith("-") ? line : `- ${line}`))
    .join("\n");
}

function buildMeetingContent(input: MeetingCaptureInput) {
  const sections = [
    input.title.trim() ? `# ${input.title.trim()}` : "",
    `Source: ${input.source}`,
    input.template !== "auto" ? `Meeting template: ${input.template}` : "",
    input.audioDurationSeconds > 0
      ? `Audio captured locally: ${Math.floor(input.audioDurationSeconds / 60)}m ${
          input.audioDurationSeconds % 60
        }s`
      : "",
    input.transcript.trim() ? `## Transcript\n${input.transcript.trim()}` : "",
    input.todoList.trim() ? `## To-do list\n${normalizeTodoList(input.todoList)}` : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}

function categoryFromMode(mode: NoteType) {
  if (mode === "auto" || mode === "general") return null;
  return NOTE_TYPE_LABELS[mode];
}

function normalizePriority(priority: NoteActionCandidate["priority"]) {
  return ["low", "medium", "high", "urgent"].includes(priority)
    ? priority
    : "medium";
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function NotesLayout() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const language = useAppStore((state) => state.language);
  const copy = useMemo(() => getNotesUiCopy(language), [language]);
  const { data: notes, isLoading } = useNotes();
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const createTask = useCreateTask();

  const [filter, setFilter] = useState<NoteFilterState>(EMPTY_NOTE_FILTER);
  const [reviewStateFilter, setReviewStateFilter] = useState<NoteReviewState | "all">("all");
  const [sortKey, setSortKey] = useState<NoteSortKey>("updated_at");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [focusSignal, setFocusSignal] = useState(0);
  const [meetingFocusSignal, setMeetingFocusSignal] = useState(0);
  const [now] = useState(() => new Date());

  useGSAP(
    () => {
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
      gsap.from("[data-notes-reveal]", {
        y: 14,
        autoAlpha: 0,
        duration: 0.45,
        ease: "power2.out",
        stagger: 0.045,
        clearProps: "transform,opacity,visibility",
      });
    },
    { scope: rootRef, dependencies: [isLoading] },
  );

  const allNotes = notes ?? EMPTY_NOTES;
  const allProjects = projects ?? EMPTY_PROJECTS;
  const overview = useMemo(() => computeNoteOverview(allNotes, now), [allNotes, now]);
  const tags = useMemo(() => collectNoteTags(allNotes), [allNotes]);
  const collectionFilteredNotes = useMemo(
    () => applyNoteFilters(allNotes, filter, sortKey, now),
    [allNotes, filter, sortKey, now],
  );
  const filteredNotes = useMemo(
    () =>
      reviewStateFilter === "all"
        ? collectionFilteredNotes
        : collectionFilteredNotes.filter((note) => inferNoteReviewState(note) === reviewStateFilter),
    [collectionFilteredNotes, reviewStateFilter],
  );
  const activeFilterCount = useMemo(
    () => countActiveNoteFilters(filter) + (reviewStateFilter === "all" ? 0 : 1),
    [filter, reviewStateFilter],
  );
  const selectedNote = useMemo(
    () => allNotes.find((note) => note.id === selectedNoteId) ?? null,
    [allNotes, selectedNoteId],
  );

  function patchFilter(patch: Partial<NoteFilterState>) {
    setFilter((prev) => ({ ...prev, ...patch }));
  }

  function selectCollection(collection: NoteFilterState["collection"]) {
    setReviewStateFilter("all");
    patchFilter({ collection });
  }

  function selectReviewState(state: NoteReviewState) {
    setFilter((prev) => ({ ...prev, collection: "inbox" }));
    setReviewStateFilter((prev) => (prev === state ? "all" : state));
  }

  function clearFilters() {
    setFilter(EMPTY_NOTE_FILTER);
    setReviewStateFilter("all");
  }

  async function handleCapture(input: QuickCaptureInput) {
    const created = await createNote.mutateAsync({
      title: titleFromCapture(input.content),
      content: input.content,
      category: categoryFromMode(input.mode),
      tags: [],
      is_favorite: false,
      project_id: null,
    });
    setSelectedNoteId(created.id);
    setDetailOpen(true);
  }

  async function handleMeetingCapture(input: MeetingCaptureInput) {
    const tags = [
      "meeting",
      input.transcript.trim() ? "transcript" : "",
      input.todoList.trim() ? "actions" : "",
      input.source === "zoom-import" ? "zoom" : "live-capture",
      input.template !== "auto" ? input.template : "",
    ].filter(Boolean);
    const created = await createNote.mutateAsync({
      title: titleFromMeeting(input),
      content: buildMeetingContent(input),
      category: NOTE_TYPE_LABELS.meeting,
      tags,
      is_favorite: false,
      project_id: null,
    });
    setFilter((prev) => ({ ...prev, collection: "meetings" }));
    setSelectedNoteId(created.id);
    setDetailOpen(true);
  }

  async function handleUpdateNote(id: string, data: Parameters<typeof updateNote.mutateAsync>[0]["data"]) {
    await updateNote.mutateAsync({ id, data });
  }

  async function handleDeleteNote(note: Note) {
    await deleteNote.mutateAsync(note.id);
    if (selectedNoteId === note.id) {
      setSelectedNoteId(null);
      setDetailOpen(false);
    }
  }

  async function handleToggleFavorite(note: Note) {
    await updateNote.mutateAsync({
      id: note.id,
      data: { is_favorite: !note.is_favorite },
    });
  }

  function openNote(note: Note) {
    setSelectedNoteId(note.id);
    setDetailOpen(true);
  }

  async function acceptAction(note: Note, action: NoteActionCandidate) {
    const matchingProject = action.projectHint
      ? allProjects.find((project) =>
          project.name.toLowerCase() === action.projectHint.toLowerCase(),
        )
      : null;
    const projectId = matchingProject?.id ?? note.project_id ?? null;
    const createdTask = await createTask.mutateAsync({
      title: action.title,
      description: [action.description, action.sourceQuote ? `Source note: ${action.sourceQuote}` : ""]
        .filter(Boolean)
        .join("\n\n"),
      priority: normalizePriority(action.priority),
      status: "todo",
      due_date: action.dueDate || null,
      project_id: projectId,
      category: "notes",
      tags: action.tags ?? [],
      source: "note",
      ai_generated: true,
      ai_metadata: {
        noteId: note.id,
        confidence: action.confidence,
        sourceQuote: action.sourceQuote,
      },
    });
    try {
      await noteActionCandidatesRepository.createAccepted({
        note_id: note.id,
        title: action.title,
        description: action.description || null,
        priority: normalizePriority(action.priority),
        due_date: action.dueDate || null,
        project_id: projectId,
        tags: action.tags ?? [],
        task_id: createdTask.id,
        ai_metadata: {
          confidence: action.confidence,
          sourceQuote: action.sourceQuote,
          projectHint: action.projectHint,
        },
      });
    } catch {
      // The candidate table is added by the Notes Intelligence migration. Task
      // creation remains the source of truth until that migration is applied.
    }
    toast.success(copy.taskCreated);
  }

  async function persistAiResult(
    note: Note,
    mode: NoteAiMode,
    result: NoteAiResponse<NoteAiMode>,
  ) {
    const record = result as unknown as Record<string, unknown>;
    const summary = typeof record.summary === "string" ? record.summary : "";
    const noteType = typeof record.noteType === "string" ? record.noteType : "";
    const tags = stringArray(record.tags);
    const processedAt = new Date().toISOString();

    await notesRepository.tryUpdateAiMetadata(note.id, {
      ...(summary ? { summary } : {}),
      ...(noteType ? { note_type: noteType } : {}),
      ...(tags.length > 0 ? { ai_tags: tags } : {}),
      ai_suggestions: {
        mode,
        result: result as unknown as Json,
        processedAt,
      },
      ai_metadata: {
        lastNotesAiMode: mode,
        source: result.source,
        processedAt,
      },
      last_processed_at: processedAt,
    });
  }

  if (isLoading) {
    return (
      <PageShell
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={
          <OSActionRow>
            <OSControl disabled>
              <Sparkles className="h-4 w-4" />
              {copy.processInbox}
            </OSControl>
            <OSPrimaryAction disabled>
              <NotebookPen className="h-4 w-4" />
              {copy.newNote}
            </OSPrimaryAction>
          </OSActionRow>
        }
      >
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-[84px] animate-pulse rounded-xl border border-slate-200/70 bg-slate-200/35 dark:border-white/10 dark:bg-white/[0.055]"
              />
            ))}
          </div>
          <LoadingCards count={4} columns={2} />
        </div>
      </PageShell>
    );
  }

  return (
    <div ref={rootRef}>
      <PageShell
        title={copy.pageTitle}
        description={copy.pageDescription}
        actions={
          <OSActionRow>
            <OSControl
              type="button"
              onClick={() => {
                selectCollection("actionable");
                const first =
                  allNotes.find((note) => inferNoteReviewState(note) === "action-candidates") ??
                  allNotes[0];
                if (first) openNote(first);
              }}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.processInbox}</span>
            </OSControl>
            <OSControl
              type="button"
              onClick={() => setMeetingFocusSignal((value) => value + 1)}
            >
              <Mic2 className="h-4 w-4" />
              <span className="hidden sm:inline">{copy.liveMeeting}</span>
            </OSControl>
            <OSPrimaryAction
              type="button"
              onClick={() => setFocusSignal((value) => value + 1)}
            >
              <NotebookPen className="h-4 w-4" />
              {copy.newNote}
            </OSPrimaryAction>
            <OSControl type="button" disabled>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{overview.recent}</span>
            </OSControl>
          </OSActionRow>
        }
      >
        <div className="space-y-4">
          <NotesWorkflowRail copy={copy} />
          <NotesPurposeStrip
            copy={copy}
            onFocusCapture={() => setFocusSignal((value) => value + 1)}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)]">
            <NotesQuickCapture
              copy={copy}
              focusSignal={focusSignal}
              isPending={createNote.isPending}
              onCapture={handleCapture}
            />
            <NotesMeetingCapturePanel
              copy={copy}
              focusSignal={meetingFocusSignal}
              isPending={createNote.isPending}
              locale={language}
              onSaveMeeting={handleMeetingCapture}
            />
          </div>

          <NotesProcessingQueue
            notes={allNotes}
            copy={copy}
            activeReviewState={reviewStateFilter}
            onSelectReviewState={selectReviewState}
          />

          <NotesOverviewStrip
            overview={overview}
            copy={copy}
            activeCollection={filter.collection}
            onSelectCollection={selectCollection}
          />

          <NotesTopControlBar
            copy={copy}
            filter={filter}
            onFilterChange={patchFilter}
            projects={allProjects}
            tags={tags}
            sortKey={sortKey}
            onSortChange={setSortKey}
            activeFilterCount={activeFilterCount}
            onClearFilters={clearFilters}
          />

          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start">
            <NotesSidebar
              copy={copy}
              overview={overview}
              activeCollection={filter.collection}
              onSelectCollection={selectCollection}
            />
            <div className="min-w-0 flex-1">
              <NotesWorkbench
                notes={filteredNotes}
                allNotesCount={allNotes.length}
                selectedNoteId={selectedNoteId}
                copy={copy}
                activeReviewState={reviewStateFilter}
                onOpenNote={openNote}
                onToggleFavorite={(note) => void handleToggleFavorite(note)}
                onDeleteNote={(note) => void handleDeleteNote(note)}
              />
            </div>
            <NotesFocusPanel
              copy={copy}
              overview={overview}
              allNotes={allNotes}
              activeCollection={filter.collection}
              activeReviewState={reviewStateFilter}
              selectedNote={selectedNote}
              locale={language}
              onSelectCollection={selectCollection}
              onSelectReviewState={selectReviewState}
              onFocusMeeting={() => setMeetingFocusSignal((value) => value + 1)}
              onOpenNote={openNote}
              onAiRouteResult={(note, mode, result) => {
                void persistAiResult(note, mode, result);
              }}
            />
          </div>
        </div>
      </PageShell>

      <NoteDetailSheet
        note={selectedNote}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedNoteId(null);
        }}
        projects={allProjects}
        copy={copy}
        locale={language}
        onUpdate={handleUpdateNote}
        onDelete={handleDeleteNote}
        onAcceptAction={acceptAction}
        onAiResult={(note, mode, result) => {
          void persistAiResult(note, mode, result);
        }}
      />
    </div>
  );
}
