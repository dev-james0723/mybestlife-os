import type { Note } from "@/types/database";

export const NOTE_TYPES = [
  "auto",
  "brain-dump",
  "meeting",
  "research",
  "decision",
  "reflection",
  "project-note",
  "resource",
  "learning",
  "general",
] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  auto: "Auto",
  "brain-dump": "Brain dump",
  meeting: "Meeting",
  research: "Research",
  decision: "Decision",
  reflection: "Reflection",
  "project-note": "Project note",
  resource: "Resource",
  learning: "Learning",
  general: "General",
};

const MEETING_HINTS = ["meeting", "standup", "agenda", "minutes", "會議", "会议"];
const RESEARCH_HINTS = ["http", "source", "paper", "research", "quote", "引用", "研究"];
const DECISION_HINTS = ["decision", "decided", "tradeoff", "commit", "決定", "取捨", "承諾"];
const REFLECTION_HINTS = ["feel", "felt", "emotion", "reflect", "感受", "情緒", "反思"];

function hasAny(text: string, hints: string[]) {
  return hints.some((hint) => text.includes(hint));
}

export function inferNoteType(note: Pick<Note, "category" | "tags" | "content" | "title">): Exclude<NoteType, "auto"> {
  const explicit = note.category?.trim().toLowerCase();
  if (explicit && NOTE_TYPES.includes(explicit as NoteType) && explicit !== "auto") {
    return explicit as Exclude<NoteType, "auto">;
  }

  const text = `${note.title} ${note.content ?? ""} ${(note.tags ?? []).join(" ")}`.toLowerCase();
  if (hasAny(text, MEETING_HINTS)) return "meeting";
  if (hasAny(text, RESEARCH_HINTS)) return "research";
  if (hasAny(text, DECISION_HINTS)) return "decision";
  if (hasAny(text, REFLECTION_HINTS)) return "reflection";
  if ((note.content ?? "").length > 900) return "brain-dump";
  return "general";
}

export function notePreview(note: Pick<Note, "content" | "title">, maxLength = 180) {
  const raw = (note.content?.trim() || note.title).replace(/\s+/g, " ");
  if (raw.length <= maxLength) return raw;
  return `${raw.slice(0, maxLength - 1).trim()}...`;
}

export function splitTagInput(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}
