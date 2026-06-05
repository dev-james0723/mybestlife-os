import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentSuggestedAction } from "@/lib/life-agent/chat-types";
import type { LifeAgentMessage } from "@/types/life-agent";

function isMemoryUsedItem(v: unknown): v is LifeAgentMemoryUsedItem {
  if (!v || typeof v !== "object") return false;
  const row = v as Record<string, unknown>;
  return (
    typeof row.sourceType === "string" &&
    typeof row.sourceId === "string" &&
    typeof row.title === "string" &&
    typeof row.reason === "string"
  );
}

export function parseMessageMemoryUsed(
  message: LifeAgentMessage,
): LifeAgentMemoryUsedItem[] {
  const raw = message.memory_used_json;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter(isMemoryUsedItem);
  }
  return [];
}

function isActionPreviewCard(v: unknown): v is LifeAgentActionPreviewCard {
  if (!v || typeof v !== "object") return false;
  const row = v as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.actionType === "string" &&
    typeof row.title === "string" &&
    typeof row.status === "string"
  );
}

export function parseMessageActionPreviews(
  message: LifeAgentMessage,
): LifeAgentActionPreviewCard[] {
  const meta = message.metadata_json;
  if (!meta || typeof meta !== "object") return [];
  const previews = (meta as Record<string, unknown>).actionPreviews;
  if (!Array.isArray(previews)) return [];
  return previews.filter(isActionPreviewCard);
}

export function parseMessageSuggestedActions(
  message: LifeAgentMessage,
): LifeAgentSuggestedAction[] {
  const meta = message.metadata_json;
  if (!meta || typeof meta !== "object") return [];
  const actions = (meta as Record<string, unknown>).suggestedActions;
  if (!Array.isArray(actions)) return [];
  return actions
    .filter((a): a is LifeAgentSuggestedAction => {
      if (!a || typeof a !== "object") return false;
      const row = a as Record<string, unknown>;
      return (
        typeof row.id === "string" &&
        typeof row.type === "string" &&
        typeof row.title === "string" &&
        typeof row.description === "string"
      );
    })
    .map((a) => ({ ...a, status: "preview" as const }));
}
