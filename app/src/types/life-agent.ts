/** Life Agent domain types (mirrors `life_agent_*` tables). */

export type LifeAgentMode = "companion" | "orchestrator" | "operator" | "mirror";

export type LifeAgentCharacterId =
  | "aura"
  | "sage"
  | "nova"
  | "muse"
  | "atlas"
  | "guardian"
  | (string & {});

export type LifeAgentPermissionDomain =
  | "about_me"
  | "projects"
  | "tasks"
  | "goals"
  | "habits"
  | "relationships"
  | "role_models"
  | "assets"
  | "documents"
  | "notes"
  | "journal"
  | "bucket_list"
  | "knowledge"
  | "finance"
  | "health"
  | "brain_graph";

export type LifeAgentAccessLevel =
  | "off"
  | "ask_every_time"
  | "read_only"
  | "suggest_actions"
  | "act_with_confirmation";

export type LifeAgentMessageRole = "user" | "assistant" | "system" | "tool";

export type LifeAgentConversationStatus = "active" | "archived";

export type LifeAgentMemoryType =
  | "identity"
  | "preference"
  | "goal"
  | "constraint"
  | "relationship_context"
  | "emotional_pattern"
  | "working_style"
  | "life_chapter"
  | "other";

export type LifeAgentMemoryVisibility = "private" | "archived";

export type LifeAgentActionPreviewStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "executed"
  | "failed";

export const LIFE_AGENT_PERMISSION_DOMAINS: LifeAgentPermissionDomain[] = [
  "about_me",
  "projects",
  "tasks",
  "goals",
  "habits",
  "relationships",
  "role_models",
  "assets",
  "documents",
  "notes",
  "journal",
  "bucket_list",
  "knowledge",
  "finance",
  "health",
  "brain_graph",
];

export const LIFE_AGENT_ACCESS_LEVELS: LifeAgentAccessLevel[] = [
  "off",
  "ask_every_time",
  "read_only",
  "suggest_actions",
  "act_with_confirmation",
];

export type LifeAgentProfile = {
  id: string;
  user_id: string;
  character_id: LifeAgentCharacterId;
  custom_name: string | null;
  warmth: number;
  directness: number;
  creativity: number;
  strategic_depth: number;
  execution_energy: number;
  emotional_gentleness: number;
  visual_style: string | null;
  voice_style: string | null;
  created_at: string;
  updated_at: string;
};

export type UpsertLifeAgentProfileInput = Partial<
  Pick<
    LifeAgentProfile,
    | "character_id"
    | "custom_name"
    | "warmth"
    | "directness"
    | "creativity"
    | "strategic_depth"
    | "execution_energy"
    | "emotional_gentleness"
    | "visual_style"
    | "voice_style"
  >
>;

export type LifeAgentConversation = {
  id: string;
  user_id: string;
  title: string | null;
  mode: LifeAgentMode;
  character_id: LifeAgentCharacterId;
  status: LifeAgentConversationStatus;
  created_at: string;
  updated_at: string;
};

export type LifeAgentMessage = {
  id: string;
  user_id: string;
  conversation_id: string;
  role: LifeAgentMessageRole;
  content: string;
  metadata_json: Record<string, unknown> | null;
  memory_used_json: Record<string, unknown> | null;
  created_at: string;
};

export type LifeAgentPermission = {
  id: string;
  user_id: string;
  domain: LifeAgentPermissionDomain;
  access_level: LifeAgentAccessLevel;
  created_at: string;
  updated_at: string;
};

export type LifeAgentMemory = {
  id: string;
  user_id: string;
  memory_type: LifeAgentMemoryType;
  content: string;
  source_type: string | null;
  source_id: string | null;
  confidence: number | null;
  user_confirmed: boolean;
  visibility: LifeAgentMemoryVisibility;
  created_at: string;
  updated_at: string;
};

export type LifeAgentActionPreview = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  action_type: string;
  payload_json: Record<string, unknown>;
  status: LifeAgentActionPreviewStatus;
  created_at: string;
  updated_at: string;
};
