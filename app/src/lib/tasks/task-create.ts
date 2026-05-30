/**
 * Shared types + a deterministic local generator for the "Create with AI" flow.
 * The generator works with zero external dependencies so the AI create form is
 * fully functional without a Gemini key; the real endpoint (wave 8) reuses the
 * same `TaskDraft` shape and falls back to this logic when no key is present.
 */
import type { Task } from "@/types/database";
import { buildAiMetadata, type TasksUiCopy } from "@/lib/i18n/tasks-ui";
import { deriveTaskCategory } from "./task-categories";

export type TaskDraftSuggestions = {
  reminders?: string[];
  suggestedBlocks?: number;
  webResources?: { label: string; url: string }[];
};

export type TaskDraft = {
  title: string;
  description?: string;
  priority?: Task["priority"];
  status?: Task["status"];
  due_date?: string | null;
  scheduled_date?: string | null;
  category?: string | null;
  estimated_blocks?: number | null;
  tags?: string[];
  subtasks?: string[];
  suggestions?: TaskDraftSuggestions;
};

const URGENT_HINTS = ["urgent", "asap", "immediately", "today", "緊急", "紧急", "马上", "馬上", "今天"];
const HIGH_HINTS = ["important", "priority", "deadline", "重要", "优先", "優先", "截止"];
const QUICK_HINTS = ["quick", "small", "短", "快", "简单", "簡單"];
const DEEP_HINTS = ["deep", "research", "design", "build", "write", "depth", "深", "研究", "设计", "設計", "撰写", "撰寫"];

function detectPriority(text: string): Task["priority"] {
  const t = text.toLowerCase();
  if (URGENT_HINTS.some((h) => t.includes(h))) return "urgent";
  if (HIGH_HINTS.some((h) => t.includes(h))) return "high";
  return "medium";
}

function detectBlocks(text: string): number {
  const t = text.toLowerCase();
  if (DEEP_HINTS.some((h) => t.includes(h))) return 4;
  if (QUICK_HINTS.some((h) => t.includes(h))) return 1;
  return 2;
}

function firstLineTitle(prompt: string): string {
  const firstLine = prompt.split(/\r?\n/)[0]?.trim() ?? prompt.trim();
  // Trim a trailing period and cap length for a clean title.
  const cleaned = firstLine.replace(/[.。]\s*$/, "");
  return cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
}

/**
 * Turn a free-text prompt into a structured task draft using simple, transparent
 * heuristics (priority/effort keywords, derived category, AI suggestion card).
 */
export function buildLocalTaskDraft(prompt: string, copy: TasksUiCopy): TaskDraft {
  const trimmed = prompt.trim();
  const title = firstLineTitle(trimmed) || trimmed;
  const hasBody = trimmed.length > title.length + 4;
  const priority = detectPriority(trimmed);
  const blocks = detectBlocks(trimmed);
  const category = deriveTaskCategory({
    tags: [],
    source: null,
    title: trimmed,
  });
  const meta = buildAiMetadata(copy, title);

  return {
    title,
    description: hasBody ? trimmed : undefined,
    priority,
    status: "todo",
    category,
    estimated_blocks: blocks,
    tags: [],
    suggestions: {
      reminders: meta.reminders,
      suggestedBlocks: meta.suggestedBlocks,
      webResources: meta.webResources,
    },
  };
}
