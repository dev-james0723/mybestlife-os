"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { PreTaskRitualModal } from "@/components/tasks/pre-task-ritual-modal";
import { CheckSquare, Zap, FileEdit, Sparkles, BarChart3 } from "lucide-react";
import { OSControl, OSPrimaryAction } from "@/components/ui/os-primitives";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useBulkUpdateTasks,
  useBulkDeleteTasks,
} from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { useGoals } from "@/hooks/use-goals";
import { useTaskLinks } from "@/hooks/use-task-links";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Task } from "@/types/database";
import {
  taskSubtasksRepository,
  type CreateTaskInput,
} from "@/lib/repositories/tasks";
import { postTaskAi } from "@/lib/ai/task-ai";
import { buildLocalTaskDraft, type TaskDraft } from "@/lib/tasks/task-create";
import type { TaskCreateAiResult } from "@/lib/ai/schemas/tasks";
import { useAppStore } from "@/stores/app-store";
import { getPreTaskRitualUiCopy } from "@/lib/i18n/pre-task-ritual-ui";
import { getTasksUiCopy } from "@/lib/i18n/tasks-ui";
import { getTasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import {
  UniversalCreateMenu,
  type CreateMenuOption,
} from "@/components/shared/universal-create-menu";
import {
  TaskCreateDialog,
  type TaskCreateMode,
} from "@/components/tasks/task-create-dialog";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { TaskConnections } from "@/components/tasks/task-connections";
import { TaskInsightPanel } from "@/components/tasks/task-insight-panel";
import { TaskOverviewStrip, type OverviewMetricKey } from "@/components/tasks/task-overview-strip";
import { TaskControlBar, type TaskViewMode } from "@/components/tasks/task-control-bar";
import { TaskCardView } from "@/components/tasks/task-card-view";
import { TaskGridView } from "@/components/tasks/task-grid-view";
import { TaskTableView } from "@/components/tasks/task-table-view";
import { TaskBoardView } from "@/components/tasks/task-board-view";
import { TaskAdvancedFilters } from "@/components/tasks/task-advanced-filters";
import { TaskSavedFilters } from "@/components/tasks/task-saved-filters";
import {
  EMPTY_TASK_FILTER,
  NO_PROJECT_FILTER,
  collectTaskTags,
  countActiveFilters,
  type TaskFilterState,
} from "@/lib/tasks/task-filters";
import { collectTaskCategories } from "@/lib/tasks/task-categories";
import { applyTaskPipeline } from "@/lib/tasks/task-view-model";
import {
  defaultDirectionFor,
  type SortDirection,
  type TaskSortKey,
} from "@/lib/tasks/task-sort";
import {
  NO_PROJECT_GROUP,
  UNCATEGORIZED_GROUP,
  type TaskGroupBy,
} from "@/lib/tasks/task-grouping";
import { deadlineColumnToDueDate, type DeadlineColumn } from "@/lib/tasks/task-dates";
import { computeTaskOverview } from "@/lib/tasks/task-analytics";

const VIEW_STORAGE_KEY = "tasks:viewMode";
const BOARD_GROUP_STORAGE_KEY = "tasks:boardGroupBy";
const VALID_VIEW_MODES: TaskViewMode[] = ["list", "grid", "table", "kanban"];
const VALID_GROUP_BYS: TaskGroupBy[] = [
  "status",
  "priority",
  "project",
  "category",
  "deadline",
];

// ---------------------------------------------------------------------------
// TasksPage
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getTasksUiCopy(language), [language]);
  const centerUi = useMemo(() => getTasksCenterUiCopy(language), [language]);
  const ritualCopy = useMemo(
    () => getPreTaskRitualUiCopy(language),
    [language],
  );

  const { data: tasks, isLoading } = useTasks();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const taskLinks = useTaskLinks(tasks);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdateTasks = useBulkUpdateTasks();
  const bulkDeleteTasks = useBulkDeleteTasks();

  const [filter, setFilter] = useState<TaskFilterState>(EMPTY_TASK_FILTER);
  const [sortKey, setSortKey] = useState<TaskSortKey>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [boardGroupBy, setBoardGroupBy] = useState<TaskGroupBy>("status");

  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<TaskCreateMode>("manual");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRitual, setShowRitual] = useState(false);

  // Persist view mode + board grouping across sessions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VALID_VIEW_MODES as string[]).includes(stored)) {
      setViewMode(stored as TaskViewMode);
    }
    const storedGroup = window.localStorage.getItem(BOARD_GROUP_STORAGE_KEY);
    if (storedGroup && (VALID_GROUP_BYS as string[]).includes(storedGroup)) {
      setBoardGroupBy(storedGroup as TaskGroupBy);
    }
  }, []);

  const handleViewModeChange = useCallback((mode: TaskViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(VIEW_STORAGE_KEY, mode);
    }
  }, []);

  const handleBoardGroupByChange = useCallback((groupBy: TaskGroupBy) => {
    setBoardGroupBy(groupBy);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOARD_GROUP_STORAGE_KEY, groupBy);
    }
  }, []);

  const now = useMemo(() => new Date(), [tasks]);

  const { getLinkFlags } = taskLinks;

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return applyTaskPipeline(tasks, filter, {
      sortKey,
      sortDirection,
      ctx: { now, getLinkFlags },
    });
  }, [tasks, filter, sortKey, sortDirection, now, getLinkFlags]);

  const overview = useMemo(
    () => computeTaskOverview(tasks ?? [], now),
    [tasks, now],
  );

  const activeFilterCount = useMemo(() => countActiveFilters(filter), [filter]);

  const allTags = useMemo(() => collectTaskTags(tasks ?? []), [tasks]);
  const allCategories = useMemo(
    () => collectTaskCategories(tasks ?? []),
    [tasks],
  );

  // When a single project is filtered, new tasks inherit it (plan §9).
  const activeProjectId = useMemo(() => {
    const p = filter.project;
    if (!p || p === "all" || p === NO_PROJECT_FILTER) return undefined;
    return p;
  }, [filter.project]);

  const activeMetric: OverviewMetricKey | null = useMemo(() => {
    if (filter.deadline === "overdue") return "overdue";
    if (filter.deadline === "today") return "due-today";
    if (filter.status === "in-progress") return "in-progress";
    if (filter.status === "done") return "completed-week";
    if (filter.project === NO_PROJECT_FILTER) return "no-project";
    if (filter.priority === "high") return "high-priority";
    return null;
  }, [filter]);

  const patchFilter = useCallback((patch: Partial<TaskFilterState>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSortChange = useCallback((key: TaskSortKey) => {
    setSortKey(key);
    setSortDirection(defaultDirectionFor(key));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  // Table column header: toggle direction when already active, else switch key.
  const handleColumnSort = useCallback(
    (key: TaskSortKey) => {
      if (sortKey === key) {
        toggleSortDirection();
      } else {
        setSortKey(key);
        setSortDirection(defaultDirectionFor(key));
      }
    },
    [sortKey, toggleSortDirection],
  );

  const clearFilters = useCallback(() => setFilter(EMPTY_TASK_FILTER), []);

  const applyFilter = useCallback((next: TaskFilterState) => setFilter(next), []);

  const handleOverviewSelect = useCallback(
    (key: OverviewMetricKey) => {
      switch (key) {
        case "total":
        case "active":
          clearFilters();
          break;
        case "in-progress":
          patchFilter({
            status: filter.status === "in-progress" ? "all" : "in-progress",
          });
          break;
        case "completed-week":
          patchFilter({ status: filter.status === "done" ? "all" : "done" });
          break;
        case "due-today":
          patchFilter({ deadline: filter.deadline === "today" ? "all" : "today" });
          break;
        case "overdue":
          patchFilter({
            deadline: filter.deadline === "overdue" ? "all" : "overdue",
          });
          break;
        case "high-priority":
          patchFilter({ priority: filter.priority === "high" ? "all" : "high" });
          break;
        case "no-project":
          patchFilter({
            project: filter.project === NO_PROJECT_FILTER ? "all" : NO_PROJECT_FILTER,
          });
          break;
      }
    },
    [clearFilters, patchFilter, filter],
  );

  const openCreate = useCallback((mode: TaskCreateMode) => {
    setCreateMode(mode);
    setShowCreate(true);
  }, []);

  const createOptions: CreateMenuOption[] = useMemo(
    () => [
      {
        id: "quick",
        label: centerUi.createQuickly,
        icon: Zap,
        onSelect: () => openCreate("quick"),
      },
      {
        id: "manual",
        label: ui.createManually,
        icon: FileEdit,
        onSelect: () => openCreate("manual"),
      },
      {
        id: "ai",
        label: ui.createWithAi,
        icon: Sparkles,
        onSelect: () => openCreate("ai"),
      },
    ],
    [centerUi, ui, openCreate],
  );

  const handleCreate = useCallback(
    async (input: CreateTaskInput, opts?: { subtasks?: string[] }) => {
      try {
        const created = await createTask.mutateAsync({
          ...input,
          project_id: input.project_id ?? activeProjectId,
        });
        setShowCreate(false);
        const subs = (opts?.subtasks ?? []).map((s) => s.trim()).filter(Boolean);
        if (created?.id && subs.length > 0) {
          try {
            await taskSubtasksRepository.createMany(created.id, subs);
          } catch {
            /* subtasks are best-effort; the task itself was created */
          }
        }
      } catch {
        /* useCreateTask surfaces the error toast */
      }
    },
    [createTask, activeProjectId],
  );

  // "Create with AI": real endpoint with a local deterministic fallback so the
  // form always returns a usable draft (offline, no key, or network error).
  const handleAiGenerate = useCallback(
    async (prompt: string): Promise<TaskDraft> => {
      const toDraft = (r: TaskCreateAiResult): TaskDraft => ({
        title: r.title,
        description: r.description || undefined,
        priority: r.priority,
        status: r.status,
        due_date: r.dueDate || null,
        scheduled_date: r.scheduledDate || null,
        category: r.category || null,
        estimated_blocks: r.estimatedBlocks || null,
        tags: r.tags,
        subtasks: r.subtasks,
        suggestions: {
          reminders: r.reminders,
          suggestedBlocks: r.estimatedBlocks || undefined,
          webResources: [],
        },
      });
      try {
        const result = await postTaskAi("create", {
          locale: language,
          prompt,
          projectName: activeProjectId
            ? projects?.find((p) => p.id === activeProjectId)?.name
            : undefined,
        });
        return toDraft(result);
      } catch {
        return buildLocalTaskDraft(prompt, ui);
      }
    },
    [language, activeProjectId, projects, ui],
  );

  const handleDelete = async (id: string) => {
    await deleteTask.mutateAsync(id);
    setSelectedTask(null);
  };

  const handleCompleteTask = async (task: Task) => {
    await updateTask.mutateAsync({
      id: task.id,
      data: {
        status: "done",
        completed_at: new Date().toISOString(),
      },
    });
  };

  // Stamp/clear completed_at whenever a status edit crosses the "done" boundary.
  const withCompletionStamp = (data: Record<string, unknown>) => {
    if (!("status" in data) || data.status == null) return data;
    if (data.status === "done") {
      return { completed_at: new Date().toISOString(), ...data };
    }
    return { completed_at: null, ...data };
  };

  // Inline edits from the table + board (single user action -> single toast).
  const handleInlineUpdate = useCallback(
    (id: string, data: Record<string, unknown>) => {
      updateTask.mutate({ id, data: withCompletionStamp(data) });
    },
    [updateTask],
  );

  const handleBulkUpdate = useCallback(
    (ids: string[], data: Record<string, unknown>) => {
      if (ids.length === 0) return;
      bulkUpdateTasks.mutate({ ids, data: withCompletionStamp(data) });
    },
    [bulkUpdateTasks],
  );

  const handleBulkDelete = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      bulkDeleteTasks.mutate(ids);
    },
    [bulkDeleteTasks],
  );

  // Board drag-drop: translate the destination lane into the right field patch.
  const handleMoveTask = useCallback(
    (taskId: string, targetKey: string) => {
      let patch: Record<string, unknown> | null = null;
      switch (boardGroupBy) {
        case "status":
          patch = { status: targetKey };
          break;
        case "priority":
          patch = { priority: targetKey };
          break;
        case "project":
          patch = {
            project_id: targetKey === NO_PROJECT_GROUP ? null : targetKey,
          };
          break;
        case "category":
          patch = {
            category: targetKey === UNCATEGORIZED_GROUP ? null : targetKey,
          };
          break;
        case "deadline": {
          const due = deadlineColumnToDueDate(targetKey as DeadlineColumn, now);
          if (due === undefined) return; // overdue lane is not a valid drop target
          patch = { due_date: due };
          break;
        }
      }
      if (patch) handleInlineUpdate(taskId, patch);
    },
    [boardGroupBy, now, handleInlineUpdate],
  );

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetail(true);
  };

  const handleOpenRitual = () => {
    setShowDetail(false);
    setTimeout(() => setShowRitual(true), 150);
  };

  const handleBeginTask = () => {
    if (selectedTask) {
      toast.success(ui.toastFocusStarted(selectedTask.title));
    }
  };

  const handleAddToPlan = useCallback(
    async (task: Task) => {
      try {
        const res = await taskLinks.addToPlan.mutateAsync({
          task,
          planDate: format(new Date(), "yyyy-MM-dd"),
        });
        toast.success(
          res.alreadyLinked
            ? centerUi.alreadyInPlanToast
            : centerUi.addedToPlanToast,
        );
      } catch {
        toast.error(centerUi.connectionsFailedToast);
      }
    },
    [taskLinks.addToPlan, centerUi],
  );

  const handleLinkGoal = useCallback(
    async (taskId: string, goalId: string) => {
      try {
        await taskLinks.linkGoal.mutateAsync({ taskId, goalId });
        toast.success(centerUi.goalLinkedToast);
      } catch {
        toast.error(centerUi.connectionsFailedToast);
      }
    },
    [taskLinks.linkGoal, centerUi],
  );

  const handleUnlinkGoal = useCallback(
    async (taskId: string, goalId: string) => {
      try {
        await taskLinks.unlinkGoal.mutateAsync({ taskId, goalId });
        toast.success(centerUi.goalUnlinkedToast);
      } catch {
        toast.error(centerUi.connectionsFailedToast);
      }
    },
    [taskLinks.unlinkGoal, centerUi],
  );

  if (isLoading) return <LoadingPage />;

  const viewProps = {
    tasks: filteredTasks,
    copy: ui,
    centerCopy: centerUi,
    now,
    onOpenTask: openDetail,
    onToggleComplete: handleCompleteTask,
    getLinkFlags,
  };

  return (
    <>
      <PageShell
        title={ui.pageTitle}
        description={ui.pageDescription}
        actions={
          <>
            <OSControl
              onClick={() => setShowInsights(true)}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{centerUi.openInsights}</span>
            </OSControl>
            <UniversalCreateMenu
              label={ui.newTask}
              options={createOptions}
              trigger={
                <OSPrimaryAction>
                  <CheckSquare className="h-4 w-4" />
                  {ui.newTask}
                </OSPrimaryAction>
              }
            />
          </>
        }
      >
        <div className="space-y-4">
          <TaskOverviewStrip
            metrics={overview}
            copy={centerUi}
            activeMetric={activeMetric}
            onSelectMetric={handleOverviewSelect}
          />

          <TaskControlBar
            copy={ui}
            centerCopy={centerUi}
            filter={filter}
            onFilterChange={patchFilter}
            projects={projects}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
            onToggleSortDirection={toggleSortDirection}
            viewMode={viewMode}
            viewModes={VALID_VIEW_MODES}
            onViewModeChange={handleViewModeChange}
            activeFilterCount={activeFilterCount}
            onOpenAdvanced={() => setShowAdvanced(true)}
            onClearAll={clearFilters}
          />

          <TaskSavedFilters copy={centerUi} filter={filter} onApply={applyFilter} />

          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={ui.emptyTitle}
              description={
                tasks?.length === 0 ? ui.emptyDescNew : ui.emptyDescFiltered
              }
              action={
                tasks?.length === 0
                  ? {
                      label: ui.emptyCreate,
                      onClick: () => openCreate("manual"),
                    }
                  : undefined
              }
            />
          ) : viewMode === "grid" ? (
            <TaskGridView {...viewProps} />
          ) : viewMode === "table" ? (
            <TaskTableView
              tasks={filteredTasks}
              copy={ui}
              centerCopy={centerUi}
              now={now}
              projects={projects}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onColumnSort={handleColumnSort}
              onOpenTask={openDetail}
              onUpdateTask={handleInlineUpdate}
              onBulkUpdate={handleBulkUpdate}
              onBulkDelete={handleBulkDelete}
              getLinkFlags={getLinkFlags}
            />
          ) : viewMode === "kanban" ? (
            <TaskBoardView
              tasks={filteredTasks}
              copy={ui}
              centerCopy={centerUi}
              now={now}
              groupBy={boardGroupBy}
              onGroupByChange={handleBoardGroupByChange}
              onOpenTask={openDetail}
              onMoveTask={handleMoveTask}
              getLinkFlags={getLinkFlags}
            />
          ) : (
            <TaskCardView {...viewProps} />
          )}
        </div>
      </PageShell>

      <TaskCreateDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        projects={projects}
        defaultProjectId={activeProjectId}
        onCreate={handleCreate}
        isPending={createTask.isPending}
        copy={ui}
        centerCopy={centerUi}
        initialMode={createMode}
        onAiGenerate={handleAiGenerate}
      />

      <TaskAdvancedFilters
        open={showAdvanced}
        onOpenChange={setShowAdvanced}
        copy={ui}
        centerCopy={centerUi}
        filter={filter}
        onChange={patchFilter}
        onReset={clearFilters}
        projects={projects}
        categories={allCategories}
        tags={allTags}
      />

      <TaskInsightPanel
        open={showInsights}
        onOpenChange={setShowInsights}
        tasks={tasks ?? []}
        locale={language}
        copy={ui}
        centerCopy={centerUi}
      />

      <TaskDetailPanel
        task={selectedTask}
        open={showDetail}
        onOpenChange={setShowDetail}
        projects={projects}
        onUpdate={handleInlineUpdate}
        onDelete={handleDelete}
        now={now}
        onOpenRitual={handleOpenRitual}
        copy={ui}
        centerCopy={centerUi}
        linkFlags={selectedTask ? getLinkFlags(selectedTask.id) : undefined}
        linkSlot={
          selectedTask ? (
            <TaskConnections
              task={selectedTask}
              goals={(goals ?? []).map((g) => ({ id: g.id, name: g.name }))}
              linkedGoalIds={taskLinks.goalsForTask(selectedTask.id)}
              onAddToPlan={() => handleAddToPlan(selectedTask)}
              addingToPlan={taskLinks.addToPlan.isPending}
              onLinkGoal={(goalId) => handleLinkGoal(selectedTask.id, goalId)}
              onUnlinkGoal={(goalId) =>
                handleUnlinkGoal(selectedTask.id, goalId)
              }
              copy={centerUi}
            />
          ) : undefined
        }
      />

      <PreTaskRitualModal
        open={showRitual}
        onOpenChange={setShowRitual}
        taskTitle={selectedTask?.title ?? ""}
        copy={ritualCopy}
        onBeginTask={handleBeginTask}
      />
    </>
  );
}
