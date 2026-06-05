import { createClient } from "@/lib/supabase/client";
import { ensureError } from "@/lib/utils/ensure-error";
import {
  LIFE_AGENT_PERMISSION_DOMAINS,
  type LifeAgentAccessLevel,
  type LifeAgentActionPreview,
  type LifeAgentActionPreviewStatus,
  type LifeAgentConversation,
  type LifeAgentMemory,
  type LifeAgentMessage,
  type LifeAgentMessageRole,
  type LifeAgentMode,
  type LifeAgentPermission,
  type LifeAgentPermissionDomain,
  type LifeAgentProfile,
  type UpsertLifeAgentProfileInput,
} from "@/types/life-agent";

export type { UpsertLifeAgentProfileInput };

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw ensureError(error, "Not authenticated");
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export type CreateLifeAgentConversationInput = {
  title?: string | null;
  mode?: LifeAgentMode;
  character_id?: string;
};

export type UpdateLifeAgentConversationInput = Partial<
  Pick<LifeAgentConversation, "title" | "mode" | "character_id" | "status">
>;

export type CreateLifeAgentMessageInput = {
  conversation_id: string;
  role: LifeAgentMessageRole;
  content: string;
  metadata_json?: Record<string, unknown> | null;
  memory_used_json?: Record<string, unknown> | null;
};

export type CreateLifeAgentMemoryInput = {
  memory_type: LifeAgentMemory["memory_type"];
  content: string;
  source_type?: string | null;
  source_id?: string | null;
  confidence?: number | null;
  user_confirmed?: boolean;
  visibility?: LifeAgentMemory["visibility"];
};

export type CreateLifeAgentActionPreviewInput = {
  conversation_id?: string | null;
  action_type: string;
  payload_json: Record<string, unknown>;
};

const DEFAULT_PERMISSION_LEVEL: LifeAgentAccessLevel = "ask_every_time";

export const lifeAgentRepository = {
  async getProfile(): Promise<LifeAgentProfile | null> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as LifeAgentProfile | null;
  },

  async upsertProfile(input: UpsertLifeAgentProfileInput): Promise<LifeAgentProfile> {
    const supabase = createClient();
    const userId = await requireUserId();
    const payload = {
      user_id: userId,
      ...input,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("life_agent_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentProfile;
  },

  async getPermissions(): Promise<LifeAgentPermission[]> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_permissions")
      .select("*")
      .eq("user_id", userId)
      .order("domain", { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as LifeAgentPermission[];
    if (rows.length === 0) {
      return lifeAgentRepository.seedDefaultPermissions();
    }
    return rows;
  },

  async seedDefaultPermissions(): Promise<LifeAgentPermission[]> {
    const supabase = createClient();
    const userId = await requireUserId();
    const rows = LIFE_AGENT_PERMISSION_DOMAINS.map((domain) => ({
      user_id: userId,
      domain,
      access_level: DEFAULT_PERMISSION_LEVEL,
    }));
    const { data, error } = await supabase
      .from("life_agent_permissions")
      .upsert(rows, { onConflict: "user_id,domain" })
      .select();
    if (error) throw error;
    return (data ?? []) as LifeAgentPermission[];
  },

  async upsertPermission(
    domain: LifeAgentPermissionDomain,
    access_level: LifeAgentAccessLevel,
  ): Promise<LifeAgentPermission> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_permissions")
      .upsert(
        {
          user_id: userId,
          domain,
          access_level,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,domain" },
      )
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentPermission;
  },

  async getConversations(): Promise<LifeAgentConversation[]> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as LifeAgentConversation[];
  },

  async getConversationById(id: string): Promise<LifeAgentConversation | null> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_conversations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as LifeAgentConversation | null;
  },

  async createConversation(
    input: CreateLifeAgentConversationInput = {},
  ): Promise<LifeAgentConversation> {
    const supabase = createClient();
    const userId = await requireUserId();
    let characterId = input.character_id;
    if (!characterId) {
      const profile = await lifeAgentRepository.getProfile();
      characterId = profile?.character_id ?? "aura";
    }
    const { data, error } = await supabase
      .from("life_agent_conversations")
      .insert({
        user_id: userId,
        title: input.title ?? null,
        mode: input.mode ?? "companion",
        character_id: characterId,
        status: "active",
      })
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentConversation;
  },

  async updateConversation(
    id: string,
    input: UpdateLifeAgentConversationInput,
  ): Promise<LifeAgentConversation> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_conversations")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentConversation;
  },

  async deleteConversation(id: string): Promise<void> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { error } = await supabase
      .from("life_agent_conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  async getMessages(
    conversationId: string,
    options?: { limit?: number; beforeCreatedAt?: string },
  ): Promise<{ messages: LifeAgentMessage[]; hasMore: boolean }> {
    const supabase = createClient();
    const userId = await requireUserId();
    const limit = options?.limit ?? 50;
    let query = supabase
      .from("life_agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (options?.beforeCreatedAt) {
      query = query.lt("created_at", options.beforeCreatedAt);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as LifeAgentMessage[];
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return { messages: slice.reverse(), hasMore };
  },

  async createMessage(input: CreateLifeAgentMessageInput): Promise<LifeAgentMessage> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_messages")
      .insert({
        user_id: userId,
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        metadata_json: input.metadata_json ?? null,
        memory_used_json: input.memory_used_json ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentMessage;
  },

  async createActionPreview(
    input: CreateLifeAgentActionPreviewInput,
  ): Promise<LifeAgentActionPreview> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_action_previews")
      .insert({
        user_id: userId,
        conversation_id: input.conversation_id ?? null,
        action_type: input.action_type,
        payload_json: input.payload_json,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentActionPreview;
  },

  async updateActionPreviewStatus(
    id: string,
    status: LifeAgentActionPreviewStatus,
  ): Promise<LifeAgentActionPreview> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_action_previews")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentActionPreview;
  },

  async getMemories(): Promise<LifeAgentMemory[]> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_memories")
      .select("*")
      .eq("user_id", userId)
      .eq("visibility", "private")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as LifeAgentMemory[];
  },

  async createMemory(input: CreateLifeAgentMemoryInput): Promise<LifeAgentMemory> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from("life_agent_memories")
      .insert({
        user_id: userId,
        memory_type: input.memory_type,
        content: input.content,
        source_type: input.source_type ?? null,
        source_id: input.source_id ?? null,
        confidence: input.confidence ?? null,
        user_confirmed: input.user_confirmed ?? false,
        visibility: input.visibility ?? "private",
      })
      .select()
      .single();
    if (error) throw error;
    return data as LifeAgentMemory;
  },

  async deleteMemory(id: string): Promise<void> {
    const supabase = createClient();
    const userId = await requireUserId();
    const { error } = await supabase
      .from("life_agent_memories")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },
};
