import { z } from "zod";
import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const NOTE_AI_MODES = [
  "capture",
  "route",
  "summarize",
  "extract-actions",
  "organize",
  "connect",
  "meeting-recap",
  "research-distill",
  "ask",
] as const;

export type NoteAiMode = (typeof NOTE_AI_MODES)[number];
export type NoteAiSource = "gemini" | "fallback";

export const NOTE_TARGET_TYPES = [
  "project",
  "task",
  "goal",
  "idea",
  "knowledge",
  "note",
  "journal",
  "person",
] as const;

export const NOTE_ROUTE_DESTINATIONS = [
  "note",
  "idea",
  "knowledge",
  "task",
  "project",
  "journal",
] as const;

export const NOTE_TYPES = [
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

const NoteTypeSchema = z.enum(NOTE_TYPES);
const PrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const ConfidenceSchema = z.number().min(0).max(1).default(0.5);

export const NoteActionCandidateSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(1200).optional().default(""),
  priority: PrioritySchema.default("medium"),
  dueDate: z.string().max(10).optional().default(""),
  projectHint: z.string().max(120).optional().default(""),
  tags: z.array(z.string().min(1).max(32)).max(5).optional().default([]),
  sourceQuote: z.string().max(260).optional().default(""),
  confidence: ConfidenceSchema,
});
export type NoteActionCandidate = z.infer<typeof NoteActionCandidateSchema>;

const DecisionCandidateSchema = z.object({
  text: z.string().min(1).max(260),
  rationale: z.string().max(360).optional().default(""),
  confidence: ConfidenceSchema,
});

const ConnectionHintSchema = z.object({
  targetType: z.enum(NOTE_TARGET_TYPES),
  targetId: z.string().max(120).optional().default(""),
  targetTitle: z.string().min(1).max(180),
  relationshipType: z.string().max(80).optional().default("related"),
  rationale: z.string().max(360),
  confidence: ConfidenceSchema,
});
export type NoteConnectionHint = z.infer<typeof ConnectionHintSchema>;

const NoteRouteDestinationSchema = z.enum(NOTE_ROUTE_DESTINATIONS);

export const NoteRouteSuggestionSchema = z.object({
  destination: NoteRouteDestinationSchema.default("note"),
  secondaryDestinations: z.array(NoteRouteDestinationSchema).max(3).optional().default([]),
  nextBestAction: z.string().min(1).max(220),
  rationale: z.string().min(1).max(420),
  evidence: z.array(z.string().min(1).max(220)).max(5).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteRouteSuggestion = z.infer<typeof NoteRouteSuggestionSchema>;

export const NoteCaptureAiSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(600).optional().default(""),
  noteType: NoteTypeSchema.default("general"),
  category: z.string().max(80).optional().default(""),
  tags: z.array(z.string().min(1).max(32)).max(8).optional().default([]),
  actionCandidates: z.array(NoteActionCandidateSchema).max(8).optional().default([]),
  decisionCandidates: z.array(DecisionCandidateSchema).max(6).optional().default([]),
  connectionHints: z.array(ConnectionHintSchema).max(8).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteCaptureAiResult = z.infer<typeof NoteCaptureAiSchema>;

export const NoteSummarizeAiSchema = z.object({
  summary: z.string().min(1).max(900),
  keyPoints: z.array(z.string().min(1).max(220)).max(8).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteSummarizeAiResult = z.infer<typeof NoteSummarizeAiSchema>;

export const NoteExtractActionsAiSchema = z.object({
  actions: z.array(NoteActionCandidateSchema).max(12),
  summary: z.string().max(360).optional().default(""),
});
export type NoteExtractActionsAiResult = z.infer<typeof NoteExtractActionsAiSchema>;

export const NoteOrganizeAiSchema = z.object({
  title: z.string().min(1).max(160),
  cleanedContent: z.string().max(5000).optional().default(""),
  outline: z.array(z.string().min(1).max(220)).max(12).optional().default([]),
  summary: z.string().max(700).optional().default(""),
  noteType: NoteTypeSchema.default("general"),
  category: z.string().max(80).optional().default(""),
  tags: z.array(z.string().min(1).max(32)).max(8).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteOrganizeAiResult = z.infer<typeof NoteOrganizeAiSchema>;

export const NoteConnectAiSchema = z.object({
  connections: z.array(ConnectionHintSchema).max(12),
  summary: z.string().max(360).optional().default(""),
});
export type NoteConnectAiResult = z.infer<typeof NoteConnectAiSchema>;

export const NoteMeetingRecapAiSchema = z.object({
  summary: z.string().max(700).optional().default(""),
  agenda: z.array(z.string().min(1).max(220)).max(8).optional().default([]),
  decisions: z.array(z.string().min(1).max(220)).max(8).optional().default([]),
  actions: z.array(NoteActionCandidateSchema).max(10).optional().default([]),
  openQuestions: z.array(z.string().min(1).max(220)).max(8).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteMeetingRecapAiResult = z.infer<typeof NoteMeetingRecapAiSchema>;

export const NoteResearchDistillAiSchema = z.object({
  summary: z.string().max(700).optional().default(""),
  claims: z.array(z.string().min(1).max(260)).max(8).optional().default([]),
  sources: z.array(z.string().min(1).max(260)).max(8).optional().default([]),
  questions: z.array(z.string().min(1).max(220)).max(8).optional().default([]),
  nextSteps: z.array(NoteActionCandidateSchema).max(8).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteResearchDistillAiResult = z.infer<typeof NoteResearchDistillAiSchema>;

export const NoteAskAiSchema = z.object({
  answer: z.string().min(1).max(1400),
  citations: z.array(z.string().min(1).max(260)).max(6).optional().default([]),
  confidence: ConfidenceSchema,
});
export type NoteAskAiResult = z.infer<typeof NoteAskAiSchema>;

const ActionGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["title", "priority", "confidence"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    dueDate: { type: "string" },
    projectHint: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    sourceQuote: { type: "string" },
    confidence: { type: "number" },
  },
};

const ConnectionGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["targetType", "targetTitle", "rationale", "confidence"],
  properties: {
    targetType: { type: "string", enum: [...NOTE_TARGET_TYPES] },
    targetId: { type: "string" },
    targetTitle: { type: "string" },
    relationshipType: { type: "string" },
    rationale: { type: "string" },
    confidence: { type: "number" },
  },
};

export const NoteCaptureGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["title", "noteType", "confidence"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    noteType: { type: "string", enum: [...NOTE_TYPES] },
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    actionCandidates: { type: "array", items: ActionGeminiSchema },
    decisionCandidates: {
      type: "array",
      items: {
        type: "object",
        required: ["text", "confidence"],
        properties: {
          text: { type: "string" },
          rationale: { type: "string" },
          confidence: { type: "number" },
        },
      },
    },
    connectionHints: { type: "array", items: ConnectionGeminiSchema },
    confidence: { type: "number" },
  },
};

export const NoteRouteGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["destination", "nextBestAction", "rationale", "confidence"],
  properties: {
    destination: { type: "string", enum: [...NOTE_ROUTE_DESTINATIONS] },
    secondaryDestinations: {
      type: "array",
      items: { type: "string", enum: [...NOTE_ROUTE_DESTINATIONS] },
    },
    nextBestAction: { type: "string" },
    rationale: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
};

export const NoteSummarizeGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["summary", "confidence"],
  properties: {
    summary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
};

export const NoteExtractActionsGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["actions"],
  properties: {
    actions: { type: "array", items: ActionGeminiSchema },
    summary: { type: "string" },
  },
};

export const NoteOrganizeGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["title", "noteType", "confidence"],
  properties: {
    title: { type: "string" },
    cleanedContent: { type: "string" },
    outline: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    noteType: { type: "string", enum: [...NOTE_TYPES] },
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
};

export const NoteConnectGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["connections"],
  properties: {
    connections: { type: "array", items: ConnectionGeminiSchema },
    summary: { type: "string" },
  },
};

export const NoteMeetingRecapGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["summary", "confidence"],
  properties: {
    summary: { type: "string" },
    agenda: { type: "array", items: { type: "string" } },
    decisions: { type: "array", items: { type: "string" } },
    actions: { type: "array", items: ActionGeminiSchema },
    openQuestions: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
};

export const NoteResearchDistillGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["summary", "confidence"],
  properties: {
    summary: { type: "string" },
    claims: { type: "array", items: { type: "string" } },
    sources: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: ActionGeminiSchema },
    confidence: { type: "number" },
  },
};

export const NoteAskGeminiSchema: GeminiResponseSchema = {
  type: "object",
  required: ["answer", "confidence"],
  properties: {
    answer: { type: "string" },
    citations: { type: "array", items: { type: "string" } },
    confidence: { type: "number" },
  },
};

export type NoteAiResultByMode = {
  capture: NoteCaptureAiResult;
  route: NoteRouteSuggestion;
  summarize: NoteSummarizeAiResult;
  "extract-actions": NoteExtractActionsAiResult;
  organize: NoteOrganizeAiResult;
  connect: NoteConnectAiResult;
  "meeting-recap": NoteMeetingRecapAiResult;
  "research-distill": NoteResearchDistillAiResult;
  ask: NoteAskAiResult;
};
