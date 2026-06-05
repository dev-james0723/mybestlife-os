import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentIntent, LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { LifeAgentCharacterId, LifeAgentPermissionDomain } from "@/types/life-agent";

export type LifeAgentSuggestedActionType =
  | "create_task"
  | "draft_message"
  | "review_open_loop"
  | "open_project"
  | "update_relationship"
  | "save_note";

export type LifeAgentSuggestedAction = {
  id: string;
  type: LifeAgentSuggestedActionType;
  title: string;
  description: string;
  payload?: Record<string, unknown>;
  /** Phase 4: always preview — execution in Phase 5 */
  status: "preview";
};

export type LifeAgentChatRequestBody = {
  conversationId?: string;
  message: string;
  mode?: LifeAgentMode;
  characterId?: string;
  locale?: AppLocale;
  temporaryPermissions?: Partial<Record<LifeAgentPermissionDomain, boolean>>;
};

export type LifeAgentChatResponseBody = {
  conversationId: string;
  reply: string;
  mode: LifeAgentMode;
  characterId: LifeAgentCharacterId;
  intent: LifeAgentIntent;
  memoryUsed: LifeAgentMemoryUsedItem[];
  suggestedActions: LifeAgentSuggestedAction[];
  actionPreviews: LifeAgentActionPreviewCard[];
  actionsNeedStructuring?: boolean;
  modelUsed?: string;
  warnings?: string[];
};

export type LifeAgentModelInput = {
  systemInstruction: string;
  userText: string;
  history: { role: "user" | "assistant"; content: string }[];
  temperature?: number;
  maxOutputTokens?: number;
};

export type LifeAgentModelOutput = {
  reply: string;
  suggestedActions: LifeAgentSuggestedAction[];
  modelUsed: string;
  raw?: unknown;
};

export type LifeAgentModelProvider = {
  generateText(input: LifeAgentModelInput): Promise<LifeAgentModelOutput>;
};
