import type { LifeAgentPermissionDomain } from "@/types/life-agent";

/** Safe action types supported in Phase 5. */
export type LifeAgentActionType =
  | "create_task"
  | "create_note"
  | "create_project"
  | "update_relationship_next_action"
  | "save_journal_entry"
  | "create_life_agent_memory"
  | "draft_message";

export const LIFE_AGENT_ACTION_TYPES: LifeAgentActionType[] = [
  "create_task",
  "create_note",
  "create_project",
  "update_relationship_next_action",
  "save_journal_entry",
  "create_life_agent_memory",
  "draft_message",
];

export type LifeAgentActionRiskLevel = "low" | "medium" | "high";

export type LifeAgentActionPreviewStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "executed"
  | "failed";

/** Rich preview card returned by API / shown in UI. */
export type LifeAgentActionPreviewCard = {
  id: string;
  actionType: LifeAgentActionType;
  title: string;
  description: string;
  payload: unknown;
  domain: LifeAgentPermissionDomain;
  riskLevel: LifeAgentActionRiskLevel;
  requiresConfirmation: true;
  status: LifeAgentActionPreviewStatus;
  conversationId?: string | null;
  createdAt?: string;
  /** Set after successful confirm */
  resultSummary?: string;
  errorMessage?: string;
};

export type LifeAgentActionPreviewPayloadEnvelope = {
  title: string;
  description: string;
  riskLevel: LifeAgentActionRiskLevel;
  domain: LifeAgentPermissionDomain;
  requiresConfirmation: true;
  data: unknown;
};
