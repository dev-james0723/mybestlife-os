/**
 * Zod + Gemini response schemas for `/api/ai/tasks` (one per `mode`).
 *
 * Each mode pairs:
 *  - a Zod schema (server-side validation of model / fallback output), and
 *  - a Gemini `responseSchema` in the OpenAPI-3 subset Gemini accepts
 *    (no `anyOf`, no `nullable` unions — dates are plain strings, "" = none).
 *
 * Inferred types are re-exported and consumed (type-only) by the client in
 * `lib/ai/task-ai.ts`, so importing this file never pulls Zod into the bundle.
 */
import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const TASK_AI_MODES = [
  "create",
  "breakdown",
  "prioritize",
  "schedule",
  "cleanup",
  "weekly-review",
  "summary",
] as const;

export type TaskAiMode = (typeof TASK_AI_MODES)[number];

const PrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const StatusSchema = z.enum(["todo", "in-progress", "done", "cancelled"]);

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------

export const TaskCreateAiSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  priority: PrioritySchema.default("medium"),
  status: StatusSchema.default("todo"),
  category: z.string().max(40).optional().default(""),
  estimatedBlocks: z.number().int().min(0).max(72).optional().default(0),
  dueDate: z.string().max(10).optional().default(""),
  scheduledDate: z.string().max(10).optional().default(""),
  tags: z.array(z.string().min(1).max(32)).max(8).optional().default([]),
  reminders: z.array(z.string().min(1).max(160)).max(4).optional().default([]),
  subtasks: z.array(z.string().min(1).max(160)).max(10).optional().default([]),
});
export type TaskCreateAiResult = z.infer<typeof TaskCreateAiSchema>;

export const TaskCreateGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["title", "priority", "status"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    status: {
      type: "string",
      enum: ["todo", "in-progress", "done", "cancelled"],
    },
    category: { type: "string" },
    estimatedBlocks: { type: "integer" },
    dueDate: { type: "string" },
    scheduledDate: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    reminders: { type: "array", items: { type: "string" } },
    subtasks: { type: "array", items: { type: "string" } },
  },
};

// ---------------------------------------------------------------------------
// breakdown
// ---------------------------------------------------------------------------

export const TaskBreakdownAiSchema = z.object({
  subtasks: z.array(z.string().min(1).max(160)).min(1).max(12),
  summary: z.string().max(280).optional().default(""),
});
export type TaskBreakdownAiResult = z.infer<typeof TaskBreakdownAiSchema>;

export const TaskBreakdownGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["subtasks"],
  properties: {
    subtasks: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
  },
};

// ---------------------------------------------------------------------------
// prioritize
// ---------------------------------------------------------------------------

export const TaskPrioritizeItemSchema = z.object({
  id: z.string().min(1),
  priority: PrioritySchema,
  reason: z.string().max(280).optional().default(""),
});
export const TaskPrioritizeAiSchema = z.object({
  items: z.array(TaskPrioritizeItemSchema).max(50),
  summary: z.string().max(280).optional().default(""),
});
export type TaskPrioritizeAiResult = z.infer<typeof TaskPrioritizeAiSchema>;

export const TaskPrioritizeGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "priority"],
        properties: {
          id: { type: "string" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          reason: { type: "string" },
        },
      },
    },
    summary: { type: "string" },
  },
};

// ---------------------------------------------------------------------------
// schedule
// ---------------------------------------------------------------------------

export const TaskScheduleItemSchema = z.object({
  id: z.string().min(1),
  scheduledDate: z.string().max(10).optional().default(""),
  dueDate: z.string().max(10).optional().default(""),
  reason: z.string().max(280).optional().default(""),
});
export const TaskScheduleAiSchema = z.object({
  items: z.array(TaskScheduleItemSchema).max(50),
  summary: z.string().max(280).optional().default(""),
});
export type TaskScheduleAiResult = z.infer<typeof TaskScheduleAiSchema>;

export const TaskScheduleGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
          scheduledDate: { type: "string" },
          dueDate: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    summary: { type: "string" },
  },
};

// ---------------------------------------------------------------------------
// cleanup
// ---------------------------------------------------------------------------

export const TASK_CLEANUP_ACTIONS = [
  "archive",
  "delete",
  "reword",
  "set-priority",
  "set-project",
] as const;

export const TaskCleanupItemSchema = z.object({
  id: z.string().min(1),
  action: z.enum(TASK_CLEANUP_ACTIONS),
  reason: z.string().max(280),
  newTitle: z.string().max(200).optional().default(""),
  priority: PrioritySchema.optional(),
});
export const TaskCleanupAiSchema = z.object({
  suggestions: z.array(TaskCleanupItemSchema).max(30),
  summary: z.string().max(280).optional().default(""),
});
export type TaskCleanupAiResult = z.infer<typeof TaskCleanupAiSchema>;

export const TaskCleanupGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "action", "reason"],
        properties: {
          id: { type: "string" },
          action: {
            type: "string",
            enum: [...TASK_CLEANUP_ACTIONS],
          },
          reason: { type: "string" },
          newTitle: { type: "string" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
        },
      },
    },
    summary: { type: "string" },
  },
};

// ---------------------------------------------------------------------------
// weekly-review + summary (prose-ish, bulleted)
// ---------------------------------------------------------------------------

export const TaskReviewAiSchema = z.object({
  headline: z.string().min(1).max(200),
  wins: z.array(z.string().min(1).max(200)).max(6).optional().default([]),
  risks: z.array(z.string().min(1).max(200)).max(6).optional().default([]),
  recommendations: z
    .array(z.string().min(1).max(200))
    .max(6)
    .optional()
    .default([]),
});
export type TaskReviewAiResult = z.infer<typeof TaskReviewAiSchema>;

export const TaskReviewGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["headline"],
  properties: {
    headline: { type: "string" },
    wins: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
};

// ---------------------------------------------------------------------------
// Discriminated result union (used by the typed client)
// ---------------------------------------------------------------------------

export type TaskAiSource = "gemini" | "fallback";

export type TaskAiResultByMode = {
  create: TaskCreateAiResult;
  breakdown: TaskBreakdownAiResult;
  prioritize: TaskPrioritizeAiResult;
  schedule: TaskScheduleAiResult;
  cleanup: TaskCleanupAiResult;
  "weekly-review": TaskReviewAiResult;
  summary: TaskReviewAiResult;
};
