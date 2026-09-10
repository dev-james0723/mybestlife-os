import { z } from "zod";
import { PROMPT_TOP_CATEGORIES } from "@/types/prompt";

const text = z.string().max(100_000);
const shortText = z.string().max(4000);
const variable = z.object({ name: shortText, label: shortText.nullable(), description: shortText.nullable(), required: z.boolean(), example: shortText.nullable() });
export const blankPromptDraftSchema = z.object({
  operationId: z.uuid().nullable(), title: shortText, description: shortText, body: text, tagsRaw: shortText,
  topCategory: z.enum(PROMPT_TOP_CATEGORIES),
});
export const promptWizardDraftSchema = z.object({
  operationId: z.uuid().nullable(), stepIndex: z.number().int().min(0).max(8),
  wizard: z.object({
    stepId: z.enum(["goal", "expert_role", "context", "output_format", "tone_style", "variables", "guardrails", "examples"]),
    goal: text, expertRole: text, context: text, outputFormat: text, toneStyle: z.array(shortText).max(30),
    variables: z.array(variable).max(100), guardrails: text,
    examples: z.array(z.object({ input: text, expectedOutput: text })).max(100),
    draftId: shortText.nullable(), synthesizedBody: text.nullable(), updatedAt: shortText,
  }),
  editTitle: shortText, editDescription: shortText, editBody: text, editTags: shortText,
  editCategory: z.enum(PROMPT_TOP_CATEGORIES), synthesisVariables: z.array(variable).max(100).nullable(),
});
export const bundleDraftSchema = z.object({
  operationId: z.uuid().nullable(), savedId: z.uuid().nullable(), step: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  template: z.enum(["grad_school", "tech_job", "speaking", "funding", "custom"]).nullable(),
  selectedIds: z.array(z.uuid()).max(1000), includeCover: z.boolean(),
  title: shortText, subtitle: shortText, recipient: shortText, name: shortText, description: text,
  format: z.enum(["zip", "merged_pdf"]), filename: shortText,
});
