"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { findPresetSkillForRoleModel } from "@/lib/mind-council/role-model-skill-map";
import {
  useGenerateNeuralSkill,
  useRoleModelMindSkills,
} from "@/hooks/use-role-model-neural-skills";
import type { RoleModel } from "@/types/database";
import type { RoleModelInsightContextPayload } from "@/types/role-model-intelligence";

export type TalkOptions = { prompt?: string };

/**
 * Orchestrates "Talk To {name}" routing into Mind Council:
 *   1. Preset lens (famous people) → deep-link immediately.
 *   2. Saved Neural Skill → deep-link immediately.
 *   3. Otherwise → surface a confirm prompt to generate a Neural Skill first,
 *      then deep-link once it's persisted.
 *
 * `buildContext` is supplied by the caller (it owns the Life OS data) and is
 * only invoked lazily when generation is actually needed.
 */
export function useRoleModelTalk(
  buildContext: (rm: RoleModel) => RoleModelInsightContextPayload,
) {
  const router = useRouter();
  const mindCouncilBase = useLocalizedPath("/mind-council");
  const { byRoleModelId } = useRoleModelMindSkills();
  const generate = useGenerateNeuralSkill();

  const [pending, setPending] = useState<{ rm: RoleModel; opts: TalkOptions } | null>(null);

  const route = useCallback(
    (skillId: string, opts: TalkOptions) => {
      const params = new URLSearchParams({ skill: skillId, mode: "chat", source: "role-model" });
      if (opts.prompt) params.set("prompt", opts.prompt);
      router.push(`${mindCouncilBase}?${params.toString()}`);
    },
    [router, mindCouncilBase],
  );

  const talk = useCallback(
    (rm: RoleModel, opts: TalkOptions = {}) => {
      const preset = findPresetSkillForRoleModel(rm.name);
      if (preset) {
        route(preset.skillId, opts);
        return;
      }
      const saved = byRoleModelId.get(rm.id);
      if (saved) {
        route(saved.mind_skill_id, opts);
        return;
      }
      setPending({ rm, opts });
    },
    [byRoleModelId, route],
  );

  const confirmGenerate = useCallback(async () => {
    if (!pending) return;
    const { rm, opts } = pending;
    try {
      const saved = await generate.mutateAsync({
        roleModelId: rm.id,
        roleModelName: rm.name,
        context: buildContext(rm),
      });
      setPending(null);
      route(saved.mind_skill_id, opts);
    } catch {
      toast.error("Could not create a Neural Skill. Please try again.");
    }
  }, [pending, generate, buildContext, route]);

  return {
    talk,
    pending,
    isGenerating: generate.isPending,
    confirmGenerate,
    cancelGenerate: () => setPending(null),
  };
}
