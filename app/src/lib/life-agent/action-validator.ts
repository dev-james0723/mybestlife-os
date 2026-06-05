import { z } from "zod";
import {
  LIFE_AGENT_ACTION_TYPES,
  type LifeAgentActionPreviewPayloadEnvelope,
  type LifeAgentActionRiskLevel,
  type LifeAgentActionType,
} from "@/lib/life-agent/action-types";
import { domainForActionType } from "@/lib/life-agent/action-permissions";

const optionalUuid = z.string().uuid().optional();
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

export const CreateTaskPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  project_id: optionalUuid,
  due_date: isoDate,
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const CreateNotePayloadSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(16000).optional(),
  project_id: optionalUuid,
});

export const CreateProjectPayloadSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const UpdateRelationshipPayloadSchema = z.object({
  relationship_id: z.string().uuid(),
  next_action: z.string().min(1).max(500),
  next_action_date: isoDate,
});

export const SaveJournalPayloadSchema = z.object({
  topic: z.string().min(1).max(200),
  primaryEmotion: z.string().min(1).max(80).optional(),
  bullets: z.array(z.string().max(500)).max(12).optional(),
  nextTinyStep: z.string().max(500).optional(),
  entryDate: isoDate,
});

export const CreateMemoryPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  memory_type: z
    .enum([
      "identity",
      "preference",
      "goal",
      "constraint",
      "relationship_context",
      "emotional_pattern",
      "working_style",
      "life_chapter",
      "other",
    ])
    .optional(),
});

export const DraftMessagePayloadSchema = z.object({
  recipient_hint: z.string().max(200).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(8000),
  channel: z.enum(["email", "text", "other"]).optional(),
});

const PAYLOAD_SCHEMAS: Record<LifeAgentActionType, z.ZodType<unknown>> = {
  create_task: CreateTaskPayloadSchema,
  create_note: CreateNotePayloadSchema,
  create_project: CreateProjectPayloadSchema,
  update_relationship_next_action: UpdateRelationshipPayloadSchema,
  save_journal_entry: SaveJournalPayloadSchema,
  create_life_agent_memory: CreateMemoryPayloadSchema,
  draft_message: DraftMessagePayloadSchema,
};

const RISK_BY_TYPE: Record<LifeAgentActionType, LifeAgentActionRiskLevel> = {
  create_task: "low",
  create_note: "low",
  create_project: "medium",
  update_relationship_next_action: "low",
  save_journal_entry: "low",
  create_life_agent_memory: "medium",
  draft_message: "low",
};

export type ValidatedActionInput = {
  actionType: LifeAgentActionType;
  title: string;
  description: string;
  envelope: LifeAgentActionPreviewPayloadEnvelope;
};

export type ModelSuggestionInput = {
  type: string;
  title: string;
  description: string;
  payload?: Record<string, unknown>;
};

/** Maps legacy / loose model action types to Phase 5 types. */
const MODEL_TYPE_ALIASES: Record<string, LifeAgentActionType | null> = {
  create_task: "create_task",
  create_note: "create_note",
  save_note: "create_note",
  create_project: "create_project",
  open_project: "create_project",
  update_relationship: "update_relationship_next_action",
  update_relationship_next_action: "update_relationship_next_action",
  save_journal_entry: "save_journal_entry",
  journal_entry: "save_journal_entry",
  create_life_agent_memory: "create_life_agent_memory",
  create_memory: "create_life_agent_memory",
  draft_message: "draft_message",
  review_open_loop: "create_task",
};

function coercePayloadForType(
  actionType: LifeAgentActionType,
  raw: Record<string, unknown>,
  title: string,
  description: string,
): Record<string, unknown> {
  switch (actionType) {
    case "create_task":
      return {
        title:
          (typeof raw.title === "string" && raw.title) ||
          title.slice(0, 200),
        description:
          (typeof raw.description === "string" && raw.description) ||
          description,
        project_id: raw.project_id ?? raw.projectId,
        due_date: raw.due_date ?? raw.dueDate,
        priority: raw.priority,
      };
    case "create_note":
      return {
        title: (typeof raw.title === "string" && raw.title) || title,
        content:
          (typeof raw.content === "string" && raw.content) ||
          description,
        project_id: raw.project_id ?? raw.projectId,
      };
    case "create_project":
      return {
        name:
          (typeof raw.name === "string" && raw.name) ||
          (typeof raw.title === "string" && raw.title) ||
          title,
        description:
          (typeof raw.description === "string" && raw.description) ||
          description,
      };
    case "update_relationship_next_action":
      return {
        relationship_id: raw.relationship_id ?? raw.relationshipId,
        next_action:
          (typeof raw.next_action === "string" && raw.next_action) ||
          (typeof raw.nextAction === "string" && raw.nextAction) ||
          title,
        next_action_date: raw.next_action_date ?? raw.nextActionDate,
      };
    case "save_journal_entry":
      return {
        topic: (typeof raw.topic === "string" && raw.topic) || title,
        primaryEmotion: raw.primaryEmotion ?? raw.primary_emotion ?? "reflective",
        bullets: raw.bullets,
        nextTinyStep:
          (typeof raw.nextTinyStep === "string" && raw.nextTinyStep) ||
          description.slice(0, 500),
        entryDate: raw.entryDate ?? raw.entry_date,
      };
    case "create_life_agent_memory":
      return {
        content:
          (typeof raw.content === "string" && raw.content) ||
          `${title}: ${description}`,
        memory_type: raw.memory_type ?? raw.memoryType ?? "preference",
      };
    case "draft_message":
      return {
        recipient_hint: raw.recipient_hint ?? raw.recipientHint,
        subject: raw.subject ?? title,
        body:
          (typeof raw.body === "string" && raw.body) ||
          description,
        channel: raw.channel,
      };
    default:
      return raw;
  }
}

export function isLifeAgentActionType(value: string): value is LifeAgentActionType {
  return (LIFE_AGENT_ACTION_TYPES as readonly string[]).includes(value);
}

export function validateActionPreviewInput(
  actionType: LifeAgentActionType,
  title: string,
  description: string,
  rawPayload: unknown,
): ValidatedActionInput | null {
  const schema = PAYLOAD_SCHEMAS[actionType];
  const coerced = coercePayloadForType(
    actionType,
    rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)
      ? (rawPayload as Record<string, unknown>)
      : {},
    title,
    description,
  );
  const parsed = schema.safeParse(coerced);
  if (!parsed.success) return null;

  const domain = domainForActionType(actionType);
  const envelope: LifeAgentActionPreviewPayloadEnvelope = {
    title: title.slice(0, 200),
    description: description.slice(0, 600),
    riskLevel: RISK_BY_TYPE[actionType],
    domain,
    requiresConfirmation: true,
    data: parsed.data,
  };

  return {
    actionType,
    title: envelope.title,
    description: envelope.description,
    envelope,
  };
}

/** Parse a loose model suggestion into a validated preview input, or null. */
export function validateModelSuggestion(
  suggestion: ModelSuggestionInput,
): ValidatedActionInput | null {
  const mapped = MODEL_TYPE_ALIASES[suggestion.type] ?? null;
  if (!mapped) return null;
  const title = suggestion.title?.trim();
  const description = suggestion.description?.trim();
  if (!title || !description) return null;
  return validateActionPreviewInput(mapped, title, description, suggestion.payload ?? {});
}

export function validateDirectPreviewBody(
  actionType: unknown,
  title: unknown,
  description: unknown,
  payload: unknown,
): ValidatedActionInput | null {
  if (typeof actionType !== "string" || !isLifeAgentActionType(actionType)) return null;
  if (typeof title !== "string" || typeof description !== "string") return null;
  return validateActionPreviewInput(actionType, title.trim(), description.trim(), payload);
}
