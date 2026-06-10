import { isSameDay, parseISO } from "date-fns";
import type { Note } from "@/types/database";
import { inferNoteType } from "./note-types";

export const NOTE_COLLECTIONS = [
  "inbox",
  "today",
  "actionable",
  "meetings",
  "research",
  "decisions",
  "favorites",
  "project-notes",
  "orphans",
] as const;

export type NoteCollection = (typeof NOTE_COLLECTIONS)[number];

export type NoteSortKey = "updated_at" | "created_at" | "title";

export type NoteFilterState = {
  collection: NoteCollection;
  search: string;
  projectId: string;
  tag: string;
};

export const EMPTY_NOTE_FILTER: NoteFilterState = {
  collection: "inbox",
  search: "",
  projectId: "all",
  tag: "all",
};

const ACTION_HINTS = [
  "todo",
  "to-do",
  "action",
  "follow up",
  "next step",
  "deadline",
  "需要",
  "跟進",
  "跟进",
  "下一步",
  "安排",
];

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

export function noteHasActionHints(note: Note) {
  const text = `${note.title} ${note.content ?? ""}`.toLowerCase();
  return ACTION_HINTS.some((hint) => text.includes(hint));
}

export function noteIsOrphan(note: Note) {
  return (
    !note.project_id &&
    !note.category?.trim() &&
    (note.tags ?? []).length === 0
  );
}

export function noteMatchesCollection(note: Note, collection: NoteCollection, today = new Date()) {
  const type = inferNoteType(note);
  switch (collection) {
    case "today": {
      const updated = safeDate(note.updated_at) ?? safeDate(note.created_at);
      return updated ? isSameDay(updated, today) : false;
    }
    case "actionable":
      return noteHasActionHints(note);
    case "meetings":
      return type === "meeting";
    case "research":
      return type === "research";
    case "decisions":
      return type === "decision";
    case "favorites":
      return note.is_favorite;
    case "project-notes":
      return Boolean(note.project_id);
    case "orphans":
      return noteIsOrphan(note);
    case "inbox":
    default:
      return true;
  }
}

export function collectNoteTags(notes: Note[]) {
  return Array.from(
    new Set(notes.flatMap((note) => note.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

export function applyNoteFilters(
  notes: Note[],
  filter: NoteFilterState,
  sortKey: NoteSortKey,
  today = new Date(),
) {
  const query = filter.search.trim().toLowerCase();
  const filtered = notes.filter((note) => {
    if (!noteMatchesCollection(note, filter.collection, today)) return false;
    if (filter.projectId !== "all" && note.project_id !== filter.projectId) return false;
    if (filter.tag !== "all" && !(note.tags ?? []).includes(filter.tag)) return false;
    if (!query) return true;
    const haystack = `${note.title} ${note.content ?? ""} ${note.category ?? ""} ${(note.tags ?? []).join(" ")}`.toLowerCase();
    return haystack.includes(query);
  });

  return [...filtered].sort((a, b) => {
    if (sortKey === "title") return a.title.localeCompare(b.title);
    const left = safeDate(a[sortKey])?.getTime() ?? 0;
    const right = safeDate(b[sortKey])?.getTime() ?? 0;
    return right - left;
  });
}

export function countActiveNoteFilters(filter: NoteFilterState) {
  let count = 0;
  if (filter.collection !== "inbox") count += 1;
  if (filter.search.trim()) count += 1;
  if (filter.projectId !== "all") count += 1;
  if (filter.tag !== "all") count += 1;
  return count;
}
