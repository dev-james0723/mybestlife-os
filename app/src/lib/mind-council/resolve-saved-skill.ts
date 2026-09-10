import type { SupabaseClient } from "@supabase/supabase-js";
import { getPresetSkillById } from "./preset-skills";
import type { MindSkill } from "./types";
import type { NeuralSkillContent } from "@/types/role-model-intelligence";
import { buildNeuralSkillSystemPrompt, compileNeuralSkillMarkdown } from "@/lib/relationships/neural-skill-generation";

export type ResolvedMindSkill = MindSkill & { skillMarkdown?: string };

/** Account ownership is checked even when an old client supplies a custom hint. */
export async function resolveSavedMindSkill(
  supabase: SupabaseClient,
  userId: string,
  skillId: string,
): Promise<ResolvedMindSkill | undefined> {
  const preset = getPresetSkillById(skillId);
  if (preset) return preset;
  if (!skillId.startsWith("custom-rm-")) return undefined;
  const { data, error } = await supabase
    .from("role_model_neural_skills")
    .select("mind_skill_id, skill_json, status, avatar_gradient")
    .eq("user_id", userId)
    .eq("mind_skill_id", skillId)
    .eq("status", "ready")
    .maybeSingle();
  if (error) throw new Error("saved_skill_lookup_failed");
  if (!data) return undefined;
  const content = data.skill_json as NeuralSkillContent | null;
  if (!content || typeof content.lensTitle !== "string" || typeof content.systemPromptHint !== "string") {
    throw new Error("saved_skill_invalid");
  }
  return {
    skillId,
    agentId: skillId,
    skillProvider: "custom",
    status: "ready",
    category: "philosophy",
    lensTitle: content.lensTitle,
    lensSubtitle: content.lensSubtitle,
    systemPromptHint: buildNeuralSkillSystemPrompt(content),
    skillMarkdown: content.skillMarkdown?.trim() || compileNeuralSkillMarkdown(content),
    starterPrompts: content.starterPrompts,
    avatarGradient: Array.isArray(data.avatar_gradient) && data.avatar_gradient.length === 2
      ? data.avatar_gradient as [string, string]
      : ["#334155", "#cbd5e1"],
  };
}
