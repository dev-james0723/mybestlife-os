import { createClient } from "@/lib/supabase/client";
import type {
  NeuralSkillContent,
  RoleModelNeuralSkill,
} from "@/types/role-model-intelligence";

const SELECT_COLUMNS =
  "id, user_id, role_model_id, mind_skill_id, skill_json, avatar_gradient, status, model_used, created_at, updated_at";

/** Postgres "relation does not exist" — the migration hasn't been applied yet. */
function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function coerceGradient(value: unknown): [string, string] {
  if (Array.isArray(value) && value.length >= 2) {
    return [String(value[0]), String(value[1])];
  }
  return ["#334155", "#cbd5e1"];
}

function mapRow(row: Record<string, unknown>): RoleModelNeuralSkill {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    role_model_id: String(row.role_model_id),
    mind_skill_id: String(row.mind_skill_id),
    skill_json: (row.skill_json ?? {}) as NeuralSkillContent,
    avatar_gradient: coerceGradient(row.avatar_gradient),
    status: (row.status as RoleModelNeuralSkill["status"]) ?? "ready",
    model_used: (row.model_used as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export type UpsertNeuralSkillInput = {
  role_model_id: string;
  mind_skill_id: string;
  skill_json: NeuralSkillContent;
  avatar_gradient?: [string, string];
  model_used?: string | null;
};

export const roleModelNeuralSkillsRepository = {
  /** All Neural Skills for the current user. Degrades to `[]` if the table is missing. */
  async getAll(): Promise<RoleModelNeuralSkill[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("role_model_neural_skills")
      .select(SELECT_COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  },

  /** Insert or update the single Neural Skill for a role model (unique per user+model). */
  async upsert(input: UpsertNeuralSkillInput): Promise<RoleModelNeuralSkill> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("role_model_neural_skills")
      .upsert(
        {
          role_model_id: input.role_model_id,
          mind_skill_id: input.mind_skill_id,
          skill_json: input.skill_json,
          avatar_gradient: input.avatar_gradient ?? ["#334155", "#cbd5e1"],
          model_used: input.model_used ?? null,
          status: "ready",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,role_model_id" },
      )
      .select(SELECT_COLUMNS)
      .single();
    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  async delete(roleModelId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from("role_model_neural_skills")
      .delete()
      .eq("role_model_id", roleModelId);
    if (error && !isMissingTableError(error)) throw error;
  },
};
