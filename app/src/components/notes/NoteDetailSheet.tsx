"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Save, Star, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { inferNoteType, splitTagInput } from "@/lib/notes/note-types";
import { cn } from "@/lib/utils";
import { NoteAiSidecar } from "./NoteAiSidecar";
import { MeetingReviewWorkflow } from "./MeetingReviewWorkflow";
import { NotesRouteSuggestionPanel } from "./NotesRouteSuggestionPanel";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { Note, Project } from "@/types/database";
import type { NoteActionCandidate, NoteAiMode } from "@/lib/ai/schemas/notes";
import type { NoteAiResponse } from "@/lib/ai/note-ai";
import type { UpdateNoteInput } from "@/lib/repositories/notes";

function dateLine(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type NoteDetailSheetProps = {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Pick<Project, "id" | "name">[];
  copy: NotesUiCopy;
  locale: AppLocale;
  onUpdate: (id: string, data: UpdateNoteInput) => Promise<void>;
  onDelete: (note: Note) => Promise<void>;
  onAcceptAction: (note: Note, action: NoteActionCandidate) => Promise<void>;
  onAiResult?: (
    note: Note,
    mode: NoteAiMode,
    result: NoteAiResponse<NoteAiMode>,
  ) => void | Promise<void>;
};

type NoteDetailBodyProps = Omit<NoteDetailSheetProps, "note" | "open"> & {
  note: Note;
};

export function NoteDetailSheet({
  note,
  open,
  onOpenChange,
  projects,
  copy,
  locale,
  onUpdate,
  onDelete,
  onAcceptAction,
  onAiResult,
}: NoteDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        {note ? (
          <NoteDetailBody
            key={note.id}
            note={note}
            onOpenChange={onOpenChange}
            projects={projects}
            copy={copy}
            locale={locale}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAcceptAction={onAcceptAction}
            onAiResult={onAiResult}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function NoteDetailBody({
  note,
  onOpenChange,
  projects,
  copy,
  locale,
  onUpdate,
  onDelete,
  onAcceptAction,
  onAiResult,
}: NoteDetailBodyProps) {
  const [title, setTitle] = useState(note.title ?? "");
  const [content, setContent] = useState(note.content ?? "");
  const [category, setCategory] = useState(note.category ?? "");
  const [tagInput, setTagInput] = useState((note.tags ?? []).join(", "));
  const [projectId, setProjectId] = useState(note.project_id ?? "none");
  const [favorite, setFavorite] = useState(note.is_favorite);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => {
    if (!note) return false;
    return (
      title !== note.title ||
      content !== (note.content ?? "") ||
      category !== (note.category ?? "") ||
      tagInput !== (note.tags ?? []).join(", ") ||
      projectId !== (note.project_id ?? "none") ||
      favorite !== note.is_favorite
    );
  }, [note, title, content, category, tagInput, projectId, favorite]);

  const isMeetingNote = note ? inferNoteType(note) === "meeting" : false;

  async function save() {
    if (!note || !dirty || saving) return;
    setSaving(true);
    try {
      await onUpdate(note.id, {
        title: title.trim() || copy.untitled,
        content: content.trim() || null,
        category: category.trim() || null,
        tags: splitTagInput(tagInput),
        project_id: projectId === "none" ? null : projectId,
        is_favorite: favorite,
      });
    } finally {
      setSaving(false);
    }
  }

  async function appendMeetingRecap(recapMarkdown: string) {
    if (!note) return;
    const nextContent = [content.trim(), recapMarkdown.trim()]
      .filter(Boolean)
      .join("\n\n");
    setContent(nextContent);
    await onUpdate(note.id, { content: nextContent });
  }

  return (
    <>
      <SheetHeader className="border-b border-black/8 pr-14 dark:border-white/10">
        <SheetTitle>{title || copy.untitled}</SheetTitle>
        <SheetDescription>
          {copy.rawNote} · {dateLine(note.updated_at || note.created_at)}
        </SheetDescription>
      </SheetHeader>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-y-auto xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4 p-4 sm:p-5">
          <OSFrostedPanel className="space-y-4 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {dateLine(note.created_at)}
                </Badge>
                {note.project ? (
                  <Badge variant="secondary">{note.project.name}</Badge>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <OSControl
                  type="button"
                  osSize="compact"
                  onClick={() => setFavorite((prev) => !prev)}
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      favorite && "fill-amber-400 text-amber-500",
                    )}
                  />
                  {favorite ? copy.unfavorite : copy.favorite}
                </OSControl>
                <OSControl
                  type="button"
                  osSize="compact"
                  onClick={() => void onDelete(note)}
                >
                  <Trash2 className="h-4 w-4" />
                  {copy.deleteNote}
                </OSControl>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {copy.titleLabel}
                </span>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="bg-background/45"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {copy.categoryLabel}
                </span>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="bg-background/45"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {copy.projectLabel}
                </span>
                <select
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background/45 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-8"
                >
                  <option value="none">{copy.noProject}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {copy.tagsLabel}
                </span>
                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  placeholder={copy.tagsPlaceholder}
                  className="bg-background/45"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {copy.contentLabel}
                </span>
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[280px] resize-y bg-background/45 text-sm leading-6"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <OSControl type="button" onClick={() => onOpenChange(false)}>
                {copy.cancel}
              </OSControl>
              <OSPrimaryAction
                type="button"
                onClick={() => void save()}
                disabled={!dirty || saving}
              >
                <Save className="h-4 w-4" />
                {copy.saveChanges}
              </OSPrimaryAction>
            </div>
          </OSFrostedPanel>
        </div>

        <div className="space-y-4 border-t border-black/8 p-4 dark:border-white/10 xl:border-l xl:border-t-0">
          <NotesRouteSuggestionPanel
            note={note}
            copy={copy}
            locale={locale}
            onAiResult={(targetNote, mode, result) => onAiResult?.(targetNote, mode, result)}
          />
          {isMeetingNote ? (
            <MeetingReviewWorkflow
              key={`${note.id}-meeting-review`}
              note={note}
              locale={locale}
              copy={copy}
              currentContent={content}
              onAcceptAction={(action) => onAcceptAction(note, action)}
              onAppendRecap={appendMeetingRecap}
              onAiResult={(mode, result) => onAiResult?.(note, mode, result)}
            />
          ) : null}
          <NoteAiSidecar
            key={note.id}
            note={note}
            locale={locale}
            copy={copy}
            onAcceptAction={(action) => onAcceptAction(note, action)}
            onAiResult={(mode, result) => onAiResult?.(note, mode, result)}
          />
        </div>
      </div>
    </>
  );
}
