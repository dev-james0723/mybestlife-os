"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  roleModelNeuralSkillsRepository,
  type UpsertNeuralSkillInput,
} from "@/lib/repositories/role-model-neural-skills";
import type { MindSkill } from "@/lib/mind-council/types";
import { useAppStore } from "@/stores/app-store";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import {
  buildNeuralSkillSystemPrompt,
  mergeNeuralSkillIntoCache,
  readNeuralSkillApiResponse,
  wrapNeuralSkillGenerationError,
} from "@/lib/relationships/neural-skill-generation";
import type {
  RoleModelInsightContextPayload,
  RoleModelNeuralSkill,
} from "@/types/role-model-intelligence";

/** Deterministic accent gradient from a name, so each lens reads distinct. */
const GRADIENT_PALETTE: [string, string][] = [
  ["#6366f1", "#0ea5e9"],
  ["#a855f7", "#ec4899"],
  ["#f97316", "#eab308"],
  ["#22c55e", "#14b8a6"],
  ["#be123c", "#f59e0b"],
  ["#1e3a8a", "#60a5fa"],
  ["#7c3aed", "#fbbf24"],
  ["#0f766e", "#5eead4"],
];

function gradientForName(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENT_PALETTE[hash % GRADIENT_PALETTE.length]!;
}

/** Mind Council skill id for a role-model lens. Prefixed `custom-` so the
 *  existing chat route + SkillChatRoom treat it as a custom lens. */
export function neuralSkillIdForRoleModel(roleModelId: string): string {
  return `custom-rm-${roleModelId}`;
}

export const neuralSkillKeys = {
  all: ["role-model-neural-skills"] as const,
};

export function useRoleModelNeuralSkills(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: neuralSkillKeys.all,
    queryFn: roleModelNeuralSkillsRepository.getAll,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useUpsertNeuralSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertNeuralSkillInput) =>
      roleModelNeuralSkillsRepository.upsert(input),
    onSuccess: (saved) => {
      // Make a just-created lens available before Talk To navigates to Mind
      // Council. Invalidating alone leaves a race where the destination sees
      // the previous cached [] and rejects the custom-rm-* deep link.
      qc.setQueryData<RoleModelNeuralSkill[]>(neuralSkillKeys.all, (current) =>
        mergeNeuralSkillIntoCache(current, saved),
      );
      void qc.invalidateQueries({ queryKey: neuralSkillKeys.all });
    },
  });
}

/**
 * Generate a Neural Skill from a role model (AI distill → persist).
 * Returns the persisted row so callers can immediately deep-link into chat.
 */
export function useGenerateNeuralSkill() {
  const locale = parseAppLocale(useAppStore((s) => s.language));
  const upsert = useUpsertNeuralSkill();
  return useMutation({
    mutationFn: async (args: {
      roleModelId: string;
      roleModelName: string;
      context: RoleModelInsightContextPayload;
    }): Promise<RoleModelNeuralSkill> => {
      let response: Response;
      try {
        response = await fetch("/api/ai/role-model/distill-skill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleModelId: args.roleModelId,
            language: locale,
            context: args.context,
          }),
        });
      } catch (error) {
        throw wrapNeuralSkillGenerationError(error, "generate");
      }

      const generated = await readNeuralSkillApiResponse(response);
      try {
        return await upsert.mutateAsync({
          role_model_id: args.roleModelId,
          mind_skill_id: neuralSkillIdForRoleModel(args.roleModelId),
          skill_json: generated.result,
          avatar_gradient: gradientForName(args.roleModelName),
          model_used: generated.meta?.modelUsed ?? null,
        });
      } catch (error) {
        throw wrapNeuralSkillGenerationError(error, "persist");
      }
    },
  });
}

/** Convert a persisted Neural Skill into a Mind Council `MindSkill`. */
export function neuralSkillToMindSkill(ns: RoleModelNeuralSkill): MindSkill {
  const content = ns.skill_json;
  return {
    skillId: ns.mind_skill_id,
    agentId: ns.mind_skill_id,
    skillProvider: "custom",
    status: ns.status,
    category: "philosophy",
    lensTitle: content.lensTitle,
    lensSubtitle: content.lensSubtitle || "Neural Skill distilled from your Role Model.",
    systemPromptHint: buildNeuralSkillSystemPrompt(content),
    avatarGradient: ns.avatar_gradient,
  };
}

/** All persisted Neural Skills as ready-to-use Mind Council skills. */
export function useRoleModelMindSkills(enabled = true): {
  skills: MindSkill[];
  byRoleModelId: Map<string, RoleModelNeuralSkill>;
  isLoading: boolean;
} {
  const { data, isLoading } = useRoleModelNeuralSkills({ enabled });
  return useMemo(() => {
    const rows = data ?? [];
    return {
      skills: rows.map(neuralSkillToMindSkill),
      byRoleModelId: new Map(rows.map((r) => [r.role_model_id, r])),
      isLoading,
    };
  }, [data, isLoading]);
}
