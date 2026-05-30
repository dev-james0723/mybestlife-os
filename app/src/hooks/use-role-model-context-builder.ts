"use client";

import { useCallback } from "react";
import { useProjects } from "@/hooks/use-projects";
import { useGoals } from "@/hooks/use-goals";
import { useNotes } from "@/hooks/use-notes";
import { useTasks } from "@/hooks/use-tasks";
import { useIdeas } from "@/hooks/use-ideas";
import { useAboutMe } from "@/hooks/use-about-me";
import { useRoleModels } from "@/hooks/use-role-models";
import { useAppStore } from "@/stores/app-store";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import { buildRoleModelInsightContext } from "@/lib/role-models/role-model-insight-context";
import type { RoleModel } from "@/types/database";
import type { RoleModelInsightContextPayload } from "@/types/role-model-intelligence";

/**
 * Returns a memoized `(roleModel) => contextPayload` builder. It reads the
 * Life OS slices it needs from the shared TanStack cache (deduped across the
 * page), and builds the compact, capped payload lazily on demand.
 */
export function useRoleModelContextBuilder() {
  const locale = parseAppLocale(useAppStore((s) => s.language));
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const { data: notes } = useNotes();
  const { data: tasks } = useTasks();
  const { data: ideas } = useIdeas();
  const { data: aboutMe } = useAboutMe();
  const { data: roleModels } = useRoleModels();

  return useCallback(
    (roleModel: RoleModel): RoleModelInsightContextPayload =>
      buildRoleModelInsightContext({
        roleModel,
        locale,
        projects: projects ?? [],
        goals: goals ?? [],
        tasks: tasks ?? [],
        notes: notes ?? [],
        ideas: ideas ?? [],
        aboutMe: aboutMe ?? null,
        allRoleModels: roleModels ?? [],
      }),
    [locale, projects, goals, tasks, notes, ideas, aboutMe, roleModels],
  );
}
