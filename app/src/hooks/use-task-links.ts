"use client";

/**
 * Aggregates every cross-module link source (daily plans, brain relations,
 * habit links, ideas, notes, and knowledge) into a single
 * `getLinkFlags(taskId)` lookup for the task views, plus the mutations the
 * detail panel uses to create links. Query keys mirror the owning hooks so
 * caches are shared, not duplicated.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@/types/database";
import type { BrainRelationRow } from "@/types/brain";
import { useDailyPlans } from "@/hooks/use-daily-plans";
import { useIdeas } from "@/hooks/use-ideas";
import { useNotes } from "@/hooks/use-notes";
import { useKnowledgeItemsPickList } from "@/hooks/use-knowledge-items-pick";
import { habitLinksRepository } from "@/lib/repositories/habits";
import { ideasRepository } from "@/lib/repositories/ideas";
import { tasksRepository } from "@/lib/repositories/tasks";
import { brainRelationsRepository } from "@/lib/brain/queries";
import { hasDevLoginBypassCookie } from "@/lib/dev-login-bypass";
import {
  addTaskToDailyPlan,
  buildTaskLinkIndex,
  findGoalTaskRelationId,
  findTaskEntityRelationIds,
  goalIdsForTask,
  ideaIdsForTask,
  knowledgeIdsForTask,
  linkedEntityIdsForTask,
  linkTaskToGoal,
  linkTaskToKnowledge,
  noteIdsForTask,
  unlinkRelation,
  type TaskLinkFlags,
} from "@/lib/tasks/task-linking";
import {
  addTaskReferenceTag,
  parseTaskLinkMetadata,
  removeTaskReferenceTag,
  stripTaskLinkMetadataSections,
  type TaskLinkMetadata,
  type TaskReferenceKind,
} from "@/lib/tasks/task-link-metadata";

const LINK_STALE_MS = 60_000;

const subscribeOptionalBrainRelationsApi = () => () => {};
const getOptionalBrainRelationsApiClientSnapshot = () =>
  !hasDevLoginBypassCookie();
const getOptionalBrainRelationsApiServerSnapshot = () => false;

function useOptionalBrainRelationsApiEnabled() {
  return useSyncExternalStore(
    subscribeOptionalBrainRelationsApi,
    getOptionalBrainRelationsApiClientSnapshot,
    getOptionalBrainRelationsApiServerSnapshot,
  );
}

function idsForReferenceKind(
  metadata: TaskLinkMetadata,
  kind: TaskReferenceKind,
): string[] {
  if (kind === "note") return metadata.noteIds;
  if (kind === "idea") return metadata.ideaIds;
  return metadata.knowledgeIds;
}

function sameTags(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((tag, index) => tag === right[index])
  );
}

/**
 * Remove one legacy reference without losing sibling links that only existed
 * in old description sections. When a legacy section is cleaned up, its other
 * ids are first promoted to reference tags.
 */
async function removeTaskMetadataReference(
  task: Task,
  kind: TaskReferenceKind,
  id: string,
): Promise<void> {
  const metadata = parseTaskLinkMetadata(task.tags, task.description);
  const normalizedId = id.toLowerCase();
  const hasReference = idsForReferenceKind(metadata, kind).some(
    (candidate) => candidate.toLowerCase() === normalizedId,
  );
  if (!hasReference) return;

  let nextTags = removeTaskReferenceTag(task.tags, kind, id);
  let nextDescription = task.description;

  // Description metadata is removed as a unit. Preserve every sibling edge
  // by canonicalising it into a reference tag first.
  if (task.description?.toLowerCase().includes(normalizedId)) {
    const references: Array<[TaskReferenceKind, string[]]> = [
      ["note", metadata.noteIds],
      ["idea", metadata.ideaIds],
      ["knowledge", metadata.knowledgeIds],
    ];
    for (const [referenceKind, referenceIds] of references) {
      for (const referenceId of referenceIds) {
        if (
          referenceKind === kind &&
          referenceId.toLowerCase() === normalizedId
        ) {
          continue;
        }
        nextTags = addTaskReferenceTag(nextTags, referenceKind, referenceId);
      }
    }
    nextDescription = stripTaskLinkMetadataSections(task.description) ?? "";
  }

  const tagsChanged = !sameTags(task.tags, nextTags);
  const descriptionChanged = task.description !== nextDescription;
  if (!tagsChanged && !descriptionChanged) return;

  await tasksRepository.update(task.id, {
    ...(tagsChanged ? { tags: nextTags } : {}),
    ...(descriptionChanged ? { description: nextDescription ?? "" } : {}),
  });
}

export function useTaskLinks(tasks: Task[] | undefined) {
  const queryClient = useQueryClient();
  const optionalBrainRelationsApiEnabled =
    useOptionalBrainRelationsApiEnabled();

  const dailyPlans = useDailyPlans();
  const ideasQuery = useIdeas();
  const notesQuery = useNotes();
  const knowledgeItemsQuery = useKnowledgeItemsPickList();

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
        ideas: ideasQuery.data,
        habitLinks: habitLinks.data,
        brainRelations: relations.data,
      }),
    [tasks, dailyPlans.data, ideasQuery.data, habitLinks.data, relations.data],
  );

  const getLinkFlags = useCallback(
    (taskId: string): TaskLinkFlags | undefined => index.get(taskId),
    [index],
  );

  const relationRows = useMemo(
    () => relations.data ?? ([] as BrainRelationRow[]),
    [relations.data],
  );
  const taskRows = useMemo(() => tasks ?? [], [tasks]);
  const ideaRows = useMemo(() => ideasQuery.data ?? [], [ideasQuery.data]);
  const noteRows = useMemo(() => notesQuery.data ?? [], [notesQuery.data]);
  const knowledgeItemRows = useMemo(
    () => knowledgeItemsQuery.data ?? [],
    [knowledgeItemsQuery.data],
  );
  const taskById = useMemo(
    () => new Map(taskRows.map((task) => [task.id, task])),
    [taskRows],
  );

  const goalsForTask = useCallback(
    (taskId: string) => goalIdsForTask(relationRows, taskId),
    [relationRows],
  );

  const ideasForTask = useCallback(
    (taskId: string) => {
      const task = taskById.get(taskId);
      if (task) return ideaIdsForTask(ideaRows, task);
      return ideaRows
        .filter((idea) => (idea.linked_task_ids ?? []).includes(taskId))
        .map((idea) => idea.id);
    },
    [ideaRows, taskById],
  );

  const knowledgeForTask = useCallback(
    (taskId: string) => {
      const task = taskById.get(taskId);
      if (task) return knowledgeIdsForTask(relationRows, task);
      return linkedEntityIdsForTask(relationRows, taskId, "knowledge");
    },
    [relationRows, taskById],
  );

  const notesForTask = useCallback(
    (taskId: string) => {
      const task = taskById.get(taskId);
      return task ? noteIdsForTask(task) : [];
    },
    [taskById],
  );

  const getTaskForMutation = useCallback(
    (taskId: string) => taskById.get(taskId) ?? tasksRepository.getById(taskId),
    [taskById],
  );

  const invalidateLinks = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["brain", "relations"] });
    void queryClient.invalidateQueries({ queryKey: ["daily-plans"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["habit-links"] });
    void queryClient.invalidateQueries({ queryKey: ["ideas"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({
      queryKey: ["knowledge_items", "pick-list"],
    });
  }, [queryClient]);

  const addToPlan = useMutation({
    mutationFn: ({ task, planDate }: { task: Task; planDate: string }) =>
      addTaskToDailyPlan(task, planDate),
    onSuccess: invalidateLinks,
  });

  const linkGoal = useMutation({
    mutationFn: ({ taskId, goalId }: { taskId: string; goalId: string }) =>
      linkTaskToGoal(taskId, goalId),
    onSuccess: invalidateLinks,
  });

  const unlinkGoal = useMutation({
    mutationFn: ({ taskId, goalId }: { taskId: string; goalId: string }) => {
      const id = findGoalTaskRelationId(relationRows, taskId, goalId);
      if (!id) return Promise.resolve();
      return unlinkRelation(id);
    },
    onSuccess: invalidateLinks,
  });

  const linkIdea = useMutation({
    mutationFn: async ({
      taskId,
      ideaId,
    }: {
      taskId: string;
      ideaId: string;
    }) => {
      const idea =
        ideaRows.find((candidate) => candidate.id === ideaId) ??
        (await ideasRepository.getById(ideaId));
      if ((idea.linked_task_ids ?? []).includes(taskId)) return idea;
      return ideasRepository.update(ideaId, {
        linked_task_ids: [...(idea.linked_task_ids ?? []), taskId],
      });
    },
    onSuccess: invalidateLinks,
  });

  const unlinkIdea = useMutation({
    mutationFn: async ({
      taskId,
      ideaId,
    }: {
      taskId: string;
      ideaId: string;
    }) => {
      const idea = ideaRows.find((candidate) => candidate.id === ideaId);
      const task = await getTaskForMutation(taskId);
      await Promise.all([
        idea && (idea.linked_task_ids ?? []).includes(taskId)
          ? ideasRepository.update(ideaId, {
              linked_task_ids: (idea.linked_task_ids ?? []).filter(
                (candidate) => candidate !== taskId,
              ),
            })
          : Promise.resolve(),
        removeTaskMetadataReference(task, "idea", ideaId),
      ]);
    },
    onSuccess: invalidateLinks,
  });

  const linkKnowledge = useMutation({
    mutationFn: ({
      taskId,
      knowledgeId,
    }: {
      taskId: string;
      knowledgeId: string;
    }) => linkTaskToKnowledge(taskId, knowledgeId),
    onSuccess: invalidateLinks,
  });

  const unlinkKnowledge = useMutation({
    mutationFn: async ({
      taskId,
      knowledgeId,
    }: {
      taskId: string;
      knowledgeId: string;
    }) => {
      const relationIds = findTaskEntityRelationIds(
        relationRows,
        taskId,
        "knowledge",
        knowledgeId,
      );
      const task = await getTaskForMutation(taskId);
      await Promise.all([
        ...relationIds.map((relationId) => unlinkRelation(relationId)),
        removeTaskMetadataReference(task, "knowledge", knowledgeId),
      ]);
    },
    onSuccess: invalidateLinks,
  });

  const unlinkNote = useMutation({
    mutationFn: async ({
      taskId,
      noteId,
    }: {
      taskId: string;
      noteId: string;
    }) => {
      const task = await getTaskForMutation(taskId);
      await removeTaskMetadataReference(task, "note", noteId);
    },
    onSuccess: invalidateLinks,
  });

  return {
    getLinkFlags,
    goalsForTask,
    ideasForTask,
    knowledgeForTask,
    notesForTask,
    relations: relationRows,
    ideas: ideaRows,
    notes: noteRows,
    knowledgeItems: knowledgeItemRows,
    isLoading:
      dailyPlans.isLoading ||
      ideasQuery.isLoading ||
      notesQuery.isLoading ||
      knowledgeItemsQuery.isLoading ||
      habitLinks.isLoading ||
      relations.isLoading,
    addToPlan,
    linkGoal,
    unlinkGoal,
    linkIdea,
    unlinkIdea,
    linkKnowledge,
    unlinkKnowledge,
    unlinkNote,
  };
}
