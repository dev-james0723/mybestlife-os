import type { GeminiResponseSchema } from "@/lib/ai/gemini-text";
import { LIFE_AGENT_ACTION_TYPES } from "@/lib/life-agent/action-types";

/** Gemini structured output schema for Life Companion turns. */
export const LIFE_AGENT_CHAT_RESPONSE_SCHEMA: GeminiResponseSchema = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Markdown reply to the user. Warm, clear, honest. No fake completed actions.",
    },
    suggestedActions: {
      type: "array",
      description: "Optional action previews the user may confirm later. Never claim executed.",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              ...LIFE_AGENT_ACTION_TYPES,
              "save_note",
              "update_relationship",
              "review_open_loop",
            ],
          },
          title: { type: "string" },
          description: { type: "string" },
          payload: {
            type: "object",
            description: "Structured fields for the action (title, body, relationship_id, etc.).",
          },
        },
        required: ["type", "title", "description"],
      },
    },
  },
  required: ["reply", "suggestedActions"],
};
