import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Note } from "@/types/database";
import type { NoteRouteSuggestion } from "@/lib/ai/schemas/notes";
import { inferNoteType, notePreview } from "./note-types";

export const NOTE_REVIEW_STATES = [
  "unprocessed",
  "needs-clarification",
  "action-candidates",
  "meeting-review",
  "decisions",
  "research-to-promote",
  "orphans",
  "recently-processed",
] as const;

export type NoteReviewState = (typeof NOTE_REVIEW_STATES)[number];
export type NoteDestination = NoteRouteSuggestion["destination"];

const ACTION_HINTS = [
  "todo",
  "to-do",
  "action",
  "follow up",
  "next step",
  "deadline",
  "need to",
  "should",
  "需要",
  "跟進",
  "跟进",
  "下一步",
  "安排",
  "完成",
];

const SOURCE_HINTS = [
  "http://",
  "https://",
  "source:",
  "citation",
  "quote",
  "paper",
  "pdf",
  "research",
  "來源",
  "出处",
  "引用",
  "研究",
  "論文",
  "论文",
];

const SPARK_HINTS = [
  "idea",
  "maybe",
  "what if",
  "could",
  "opportunity",
  "concept",
  "靈感",
  "灵感",
  "點子",
  "点子",
  "可以試",
  "可以试",
];

const PROJECT_HINTS = [
  "project",
  "roadmap",
  "milestone",
  "launch",
  "scope",
  "stakeholder",
  "專案",
  "项目",
  "里程碑",
  "上線",
  "上线",
];

function lowerText(note: Pick<Note, "title" | "content" | "category" | "tags">) {
  return `${note.title} ${note.content ?? ""} ${note.category ?? ""} ${(note.tags ?? []).join(" ")}`.toLowerCase();
}

function includesAny(text: string, hints: string[]) {
  return hints.some((hint) => text.includes(hint));
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function latestAiMode(note: Note) {
  const metadata = jsonRecord(note.ai_metadata);
  return typeof metadata.lastNotesAiMode === "string" ? metadata.lastNotesAiMode : "";
}

function hasAiSuggestion(note: Note) {
  return Boolean(note.ai_suggestions || note.last_processed_at || latestAiMode(note));
}

function evidenceFor(note: Note, hints: string[], max = 3) {
  const lines = (note.content ?? note.title)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines
    .filter((line) => includesAny(line.toLowerCase(), hints))
    .slice(0, max)
    .map((line) => line.slice(0, 220));
}

export function detectActionHeavyNote(note: Note) {
  return includesAny(lowerText(note), ACTION_HINTS);
}

export function detectSourceHeavyNote(note: Note) {
  return includesAny(lowerText(note), SOURCE_HINTS);
}

export function detectSparkLikeNote(note: Note) {
  const text = lowerText(note);
  return includesAny(text, SPARK_HINTS) && !detectActionHeavyNote(note) && !detectSourceHeavyNote(note);
}

export function detectProjectLikeNote(note: Note) {
  return Boolean(note.project_id) || includesAny(lowerText(note), PROJECT_HINTS);
}

export function noteNeedsClarification(note: Note) {
  const content = (note.content ?? "").trim();
  return content.length > 0 && content.length < 48 && !detectActionHeavyNote(note);
}

export function noteIsOrphanForReview(note: Note) {
  return !note.project_id && !note.category?.trim() && (note.tags ?? []).length === 0;
}

export function inferNoteDestination(note: Note): NoteDestination {
  const type = inferNoteType(note);
  if (detectSourceHeavyNote(note)) return "knowledge";
  if (detectSparkLikeNote(note)) return "idea";
  if (detectActionHeavyNote(note) && (note.content ?? "").length < 700) return "task";
  if (detectProjectLikeNote(note)) return "project";
  if (type === "reflection") return "journal";
  return "note";
}

export function inferNoteReviewState(note: Note): NoteReviewState {
  const type = inferNoteType(note);
  if (type === "meeting") return "meeting-review";
  if (type === "decision") return "decisions";
  if (detectSourceHeavyNote(note)) return "research-to-promote";
  if (detectActionHeavyNote(note)) return "action-candidates";
  if (noteNeedsClarification(note)) return "needs-clarification";
  if (noteIsOrphanForReview(note)) return "orphans";
  if (hasAiSuggestion(note)) return "recently-processed";
  return "unprocessed";
}

export function getNoteRouteSuggestion(note: Note): NoteRouteSuggestion {
  const destination = inferNoteDestination(note);
  const content = note.content ?? note.title;
  const secondaryDestinations = new Set<NoteDestination>();
  if (destination !== "note") secondaryDestinations.add("note");
  if (detectActionHeavyNote(note) && destination !== "task") secondaryDestinations.add("task");
  if (detectProjectLikeNote(note) && destination !== "project") secondaryDestinations.add("project");

  const copy: Record<NoteDestination, Pick<NoteRouteSuggestion, "nextBestAction" | "rationale" | "confidence">> = {
    note: {
      nextBestAction: "Clarify the raw thought, then decide whether it needs routing.",
      rationale: "This still looks like active thinking work best handled inside Notes.",
      confidence: content.length > 80 ? 0.52 : 0.38,
    },
    idea: {
      nextBestAction: "Send this spark to Ideas if it should incubate instead of becoming work today.",
      rationale: "The note reads like an early possibility rather than a durable source or task.",
      confidence: 0.58,
    },
    knowledge: {
      nextBestAction: "Promote source material to Knowledge Base after review.",
      rationale: "The note includes source, citation, link, or research signals.",
      confidence: 0.66,
    },
    task: {
      nextBestAction: "Extract action candidates and approve the useful ones as tasks.",
      rationale: "The note contains concrete next-step language.",
      confidence: 0.62,
    },
    project: {
      nextBestAction: "Link this note to the relevant project before extracting follow-ups.",
      rationale: "The note appears connected to project scope, milestones, or delivery work.",
      confidence: 0.58,
    },
    journal: {
      nextBestAction: "Move the reflective part to Journal if this is personal processing.",
      rationale: "The note contains reflective or emotional context.",
      confidence: 0.55,
    },
  };

  const evidence =
    destination === "knowledge"
      ? evidenceFor(note, SOURCE_HINTS)
      : destination === "task"
        ? evidenceFor(note, ACTION_HINTS)
        : destination === "idea"
          ? evidenceFor(note, SPARK_HINTS)
          : destination === "project"
            ? evidenceFor(note, PROJECT_HINTS)
            : [notePreview(note, 180)].filter(Boolean);

  return {
    destination,
    secondaryDestinations: [...secondaryDestinations].slice(0, 3),
    evidence,
    ...copy[destination],
  };
}

function reviewScore(note: Note, now: Date) {
  const state = inferNoteReviewState(note);
  const priority: Record<NoteReviewState, number> = {
    "action-candidates": 80,
    "meeting-review": 76,
    decisions: 72,
    "research-to-promote": 66,
    "needs-clarification": 60,
    orphans: 52,
    unprocessed: 46,
    "recently-processed": 20,
  };
  const updated = safeDate(note.updated_at) ?? safeDate(note.created_at);
  const ageBoost = updated ? Math.max(0, 12 - differenceInCalendarDays(now, updated)) : 0;
  return priority[state] + ageBoost + (note.is_favorite ? 4 : 0);
}

export function rankNextReviewNotes(notes: Note[], now = new Date()) {
  return [...notes].sort((a, b) => reviewScore(b, now) - reviewScore(a, now));
}

export function computeNoteReviewCounts(notes: Note[]) {
  const counts = Object.fromEntries(NOTE_REVIEW_STATES.map((state) => [state, 0])) as Record<NoteReviewState, number>;
  for (const note of notes) {
    counts[inferNoteReviewState(note)] += 1;
  }
  return counts;
}
