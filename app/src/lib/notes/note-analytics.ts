import { isSameDay, parseISO, subDays } from "date-fns";
import type { Note } from "@/types/database";
import { inferNoteType } from "./note-types";
import { noteHasActionHints, noteIsOrphan } from "./note-filters";

export type NoteOverview = {
  total: number;
  today: number;
  actionable: number;
  meetings: number;
  research: number;
  decisions: number;
  favorites: number;
  projectNotes: number;
  orphans: number;
  recent: number;
};

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

export function computeNoteOverview(notes: Note[], now = new Date()): NoteOverview {
  const sevenDaysAgo = subDays(now, 7);
  const metrics: NoteOverview = {
    total: notes.length,
    today: 0,
    actionable: 0,
    meetings: 0,
    research: 0,
    decisions: 0,
    favorites: 0,
    projectNotes: 0,
    orphans: 0,
    recent: 0,
  };

  for (const note of notes) {
    const updated = safeDate(note.updated_at) ?? safeDate(note.created_at);
    if (updated && isSameDay(updated, now)) metrics.today += 1;
    if (updated && updated >= sevenDaysAgo) metrics.recent += 1;
    if (noteHasActionHints(note)) metrics.actionable += 1;
    if (note.is_favorite) metrics.favorites += 1;
    if (note.project_id) metrics.projectNotes += 1;
    if (noteIsOrphan(note)) metrics.orphans += 1;

    const type = inferNoteType(note);
    if (type === "meeting") metrics.meetings += 1;
    if (type === "research") metrics.research += 1;
    if (type === "decision") metrics.decisions += 1;
  }

  return metrics;
}
