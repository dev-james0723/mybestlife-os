import { createClient } from "@/lib/supabase/client";
import type {
  AITool,
  SystemPromptTemplate,
  UserCustomPrompt,
  UserPromptFavorite,
} from "@/types/ai-coach";

export type NewCustomPromptInput = {
  title: string;
  prompt_body: string;
  icon?: string;
  tags?: string[];
  attachment_categories?: string[];
  required_variables?: string[];
  optional_variables?: string[];
};

export type UpdateCustomPromptInput = Partial<
  NewCustomPromptInput & { is_favorite: boolean }
>;

export const promptLibraryRepository = {
  // ---------- system templates ----------
  async listSystemTemplates(): Promise<SystemPromptTemplate[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_prompt_templates")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as SystemPromptTemplate[];
  },

  async getSystemTemplate(id: string): Promise<SystemPromptTemplate> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("system_prompt_templates")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as SystemPromptTemplate;
  },

  // ---------- custom prompts ----------
  async listCustomPrompts(): Promise<UserCustomPrompt[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_custom_prompts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as UserCustomPrompt[];
  },

  async getCustomPrompt(id: string): Promise<UserCustomPrompt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_custom_prompts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as UserCustomPrompt;
  },

  async createCustomPrompt(
    input: NewCustomPromptInput,
  ): Promise<UserCustomPrompt> {
    const supabase = createClient();
    const payload = {
      title: input.title,
      prompt_body: input.prompt_body,
      icon: input.icon ?? "💡",
      tags: input.tags ?? [],
      attachment_categories: input.attachment_categories ?? [],
      required_variables: input.required_variables ?? [],
      optional_variables: input.optional_variables ?? [],
    };
    const { data, error } = await supabase
      .from("user_custom_prompts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as UserCustomPrompt;
  },

  async updateCustomPrompt(
    id: string,
    input: UpdateCustomPromptInput,
  ): Promise<UserCustomPrompt> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_custom_prompts")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as UserCustomPrompt;
  },

  async deleteCustomPrompt(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_custom_prompts")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async incrementCustomUsage(id: string): Promise<void> {
    const supabase = createClient();
    // Read → increment → write. Two round-trips but avoids a DB function.
    const { data, error: readErr } = await supabase
      .from("user_custom_prompts")
      .select("usage_count")
      .eq("id", id)
      .single();
    if (readErr) throw readErr;
    const next = (data?.usage_count ?? 0) + 1;
    const { error } = await supabase
      .from("user_custom_prompts")
      .update({
        usage_count: next,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  },

  // ---------- favourites on system templates ----------
  async listFavorites(): Promise<UserPromptFavorite[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_prompt_favorites")
      .select("*");
    if (error) throw error;
    return (data ?? []) as UserPromptFavorite[];
  },

  async addFavorite(templateId: string): Promise<void> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("user_prompt_favorites")
      .insert({ user_id: user.id, template_id: templateId });
    if (error && error.code !== "23505") throw error;
  },

  async removeFavorite(templateId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("user_prompt_favorites")
      .delete()
      .eq("template_id", templateId);
    if (error) throw error;
  },

  // ---------- usage history ----------
  async logUsage(input: {
    templateId?: string | null;
    customPromptId?: string | null;
    aiTool: AITool;
    attachedFileIds?: string[];
  }): Promise<void> {
    const supabase = createClient();
    const payload = {
      template_id: input.templateId ?? null,
      custom_prompt_id: input.customPromptId ?? null,
      ai_tool: input.aiTool,
      attached_file_ids: input.attachedFileIds ?? [],
    };
    const { error } = await supabase
      .from("prompt_usage_history")
      .insert(payload);
    if (error) throw error;
  },

  /**
   * Returns the last `limit` distinct prompts used by the current user.
   * Each record comes from `prompt_usage_history`; duplicates are collapsed
   * to the most recent usage.
   */
  async listRecentUsage(
    limit = 20,
  ): Promise<Array<{
    template_id: string | null;
    custom_prompt_id: string | null;
    used_at: string;
  }>> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("prompt_usage_history")
      .select("template_id,custom_prompt_id,used_at")
      .order("used_at", { ascending: false })
      .limit(limit * 3); // overfetch so we can dedupe client-side
    if (error) throw error;

    const seen = new Set<string>();
    const out: Array<{
      template_id: string | null;
      custom_prompt_id: string | null;
      used_at: string;
    }> = [];
    for (const row of data ?? []) {
      const key = row.template_id ?? row.custom_prompt_id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(row);
      if (out.length >= limit) break;
    }
    return out;
  },
};
