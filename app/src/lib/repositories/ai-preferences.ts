import { createClient } from "@/lib/supabase/client";
import type { AITool, UserAIPreferences } from "@/types/ai-coach";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type AIPreferencesInput = Partial<{
  default_ai: AITool;
  custom_ai_url: string | null;
  custom_ai_name: string | null;
  prompt_language: AppLocale | null;
  auto_copy_to_clipboard: boolean;
  show_prompt_preview: boolean;
  allow_ai_analysis: boolean;
  version_retention_limit: number;
}>;

export const aiPreferencesRepository = {
  async get(): Promise<UserAIPreferences | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_ai_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    return (data as UserAIPreferences | null) ?? null;
  },

  async upsert(input: AIPreferencesInput): Promise<UserAIPreferences> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const payload = {
      user_id: user.id,
      ...input,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("user_ai_preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return data as UserAIPreferences;
  },
};
