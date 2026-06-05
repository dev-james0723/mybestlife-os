import { randomUUID } from "crypto";
import {
  fetchGeminiStructured,
  getGeminiHabitsFlashModel,
  getGeminiServerApiKey,
} from "@/lib/ai/gemini-text";
import type {
  LifeAgentModelInput,
  LifeAgentModelOutput,
  LifeAgentModelProvider,
  LifeAgentSuggestedAction,
  LifeAgentSuggestedActionType,
} from "@/lib/life-agent/chat-types";
import { LIFE_AGENT_CHAT_RESPONSE_SCHEMA } from "@/lib/life-agent/response-schema";

const SUGGESTED_ACTION_TYPES = new Set<LifeAgentSuggestedActionType>([
  "create_task",
  "draft_message",
  "review_open_loop",
  "open_project",
  "update_relationship",
  "save_note",
]);

function getLifeAgentModelId(): string {
  return (
    process.env.GEMINI_LIFE_AGENT_MODEL?.trim() ||
    process.env.GEMINI_COMPANION_MODEL?.trim() ||
    getGeminiHabitsFlashModel()
  );
}

function buildUserText(input: LifeAgentModelInput): string {
  const historyBlock =
    input.history.length > 0
      ? input.history
          .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
          .join("\n\n")
      : "(no prior turns)";

  return `${input.userText}

## Recent conversation
${historyBlock}`;
}

function normalizeSuggestedActions(raw: unknown): LifeAgentSuggestedAction[] {
  if (!Array.isArray(raw)) return [];
  const out: LifeAgentSuggestedAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const type = row.type;
    if (typeof type !== "string" || !SUGGESTED_ACTION_TYPES.has(type as LifeAgentSuggestedActionType)) {
      continue;
    }
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const description = typeof row.description === "string" ? row.description.trim() : "";
    if (!title) continue;
    out.push({
      id: randomUUID(),
      type: type as LifeAgentSuggestedActionType,
      title: title.slice(0, 120),
      description: description.slice(0, 400),
      payload:
        row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
          ? (row.payload as Record<string, unknown>)
          : undefined,
      status: "preview",
    });
  }
  return out.slice(0, 6);
}

type RawModelResponse = {
  reply?: string;
  suggestedActions?: unknown;
};

export const geminiLifeAgentModelProvider: LifeAgentModelProvider = {
  async generateText(input: LifeAgentModelInput): Promise<LifeAgentModelOutput> {
    const apiKey = getGeminiServerApiKey();
    if (!apiKey) {
      throw new Error("gemini_api_key_missing");
    }

    const { data, modelUsed } = await fetchGeminiStructured<RawModelResponse>({
      apiKey,
      model: getLifeAgentModelId(),
      systemInstruction: input.systemInstruction,
      userText: buildUserText(input),
      responseSchema: LIFE_AGENT_CHAT_RESPONSE_SCHEMA,
      temperature: input.temperature ?? 0.55,
      maxOutputTokens: input.maxOutputTokens ?? 4096,
      timeoutMs: 90_000,
    });

    const reply = typeof data.reply === "string" ? data.reply.trim() : "";
    if (!reply) {
      throw new Error("life_agent_empty_reply");
    }

    return {
      reply,
      suggestedActions: normalizeSuggestedActions(data.suggestedActions),
      modelUsed,
      raw: data,
    };
  },
};

/** Default provider — swap implementation here for multi-provider support. */
export function getLifeAgentModelProvider(): LifeAgentModelProvider {
  return geminiLifeAgentModelProvider;
}
