"use client";

/**
 * Aggregates every cross-module link source (daily plans, brain relations,
 * habit links, ideas) into a single `getLinkFlags(taskId)` lookup for the task
 * views, plus the mutations the detail panel uses to create links. Query keys
 * mirror the owning hooks so caches are shared, not duplicated.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Task } from "@/types/database";
import type { BrainRelationRow } from "@/types/brain";
import { useDailyPlans } from "@/hooks/use-daily-plans";
import { useIdeas } from "@/hooks/use-ideas";
import { habitLinksRepository } from "@/lib/repositories/habits";
import { brainRelationsRepository } from "@/lib/brain/queries";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";
import {
  addTaskToDailyPlan,
  buildTaskLinkIndex,
  findGoalTaskRelationId,
  goalIdsForTask,
  linkTaskToGoal,
  unlinkRelation,
  type TaskLinkFlags,
} from "@/lib/tasks/task-linking";

const LINK_STALE_MS = 60_000;

const subscribeOptionalBrainRelationsApi = () => () => {};
const getOptionalBrainRelationsApiClientSnapshot = () => !hasDevLoginBypassCookie();
const getOptionalBrainRelationsApiServerSnapshot = () => false;

function useOptionalBrainRelationsApiEnabled() {
  return useSyncExternalStore(
    subscribeOptionalBrainRelationsApi,
    getOptionalBrainRelationsApiClientSnapshot,
    getOptionalBrainRelationsApiServerSnapshot,
  );
}

export function useTaskLinks(tasks: Task[] | undefined) {
  const queryClient = useQueryClient();
  const optionalBrainRelationsApiEnabled = useOptionalBrainRelationsApiEnabled();

  const dailyPlans = useDailyPlans();
  const ideas = useIdeas();

  const habitLinks = useQuery({
    queryKey: ["habit-links", "all"],
    queryFn: () => habitLinksRepository.list(),
    staleTime: LINK_STALE_MS,
  });

  const relations = useQuery({
    queryKey: ["brain", "relations"] as const,
    queryFn: () => brainRelationsRepository.list(),
    enabled: optionalBrainRelationsApiEnabled,
    staleTime: LINK_STALE_MS,
  });

  const index = useMemo(
    () =>
      buildTaskLinkIndex({
        tasks: tasks ?? [],
        dailyPlans: dailyPlans.data,
        ideas: ideas.data,
        habitLinks: habitLinks.data,
        brainRelations: relations.data,
      }),
    [tasks, dailyPlans.data, ideas.data, habitLinks.data, relations.data],
  );

  const getLinkFlags = useCallback(
    (taskId: string): TaskLinkFlags | undefined => index.get(taskId),
    [index],
  );

  const relationRows = useMemo(
    () => relations.data ?? ([] as BrainRelationRow[]),
    [relations.data],
  );

  const goalsForTask = useCallback(
    (taskId: string) => goalIdsForTask(relationRows, taskId),
    [relationRows],
  );

  const invalidateLinks = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["brain", "relations"] });
    queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["habit-links"] });
  }, [queryClient]);

  const addToPlan = useMutation({
    mutationFn: ({ task, planDate }: { task: Task; planDate: string }) =>
      addTaskToDailyPlan(task, planDate),
    onSuccess: invalidateLinks,
  });

  const linkGoal = useMutation({
    mutationFn: ({ taskId, goalId }: { taskId: string; goalId: string }) =>
      linkTaskToGoal(taskId, goalId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brain", "relations"] }),
  });

  const unlinkGoal = useMutation({
    mutationFn: ({ taskId, goalId }: { taskId: string; goalId: string }) => {
      const id = findGoalTaskRelationId(relationRows, taskId, goalId);
      if (!id) return Promise.resolve();
      return unlinkRelation(id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brain", "relations"] }),
  });

  return {
    getLinkFlags,
    goalsForTask,
    relations: relationRows,
    isLoading:
      dailyPlans.isLoading ||
      ideas.isLoading ||
      habitLinks.isLoading ||
      relations.isLoading,
    addToPlan,
    linkGoal,
    unlinkGoal,
  };
}
