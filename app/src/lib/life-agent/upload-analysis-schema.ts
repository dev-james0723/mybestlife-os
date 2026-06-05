import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";

export const LIFE_AGENT_UPLOAD_ANALYSIS_SCHEMA: GeminiResponseSchema = {
  type: "object",
  properties: {
    detectedType: {
      type: "string",
      enum: [
        "receipt",
        "business_card",
        "relationship_photo",
        "asset_photo",
        "document",
        "screenshot",
        "text",
        "unknown",
      ],
    },
    summary: { type: "string" },
    confidence: { type: "number" },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
    extractedTasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          due_date: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        },
        required: ["title"],
      },
    },
    extractedRelationshipUpdate: {
      type: "object",
      properties: {
        name_hint: { type: "string" },
        next_action: { type: "string" },
        next_action_date: { type: "string" },
        notes: { type: "string" },
      },
    },
    extractedAsset: {
      type: "object",
      properties: {
        name: { type: "string" },
        category_hint: { type: "string" },
        value_hint: { type: "string" },
        notes: { type: "string" },
      },
    },
    extractedDocument: {
      type: "object",
      properties: {
        title: { type: "string" },
        document_type_hint: { type: "string" },
        summary: { type: "string" },
        expiry_hint: { type: "string" },
      },
    },
    extractedNote: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" },
      },
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          payload: { type: "object" },
        },
        required: ["type", "title", "description"],
      },
    },
  },
  required: ["detectedType", "summary", "confidence", "warnings", "suggestedActions"],
};
