"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pencil,
  Trash2,
  MessageSquare,
  Target,
  Loader2,
  Plus,
  BookOpen,
  PlayCircle,
  Mic,
  Image as ImageIcon,
  Newspaper,
  ExternalLink,
  Star,
  Bot,
  Sparkles,
  Globe,
  CircleHelp,
} from "lucide-react";
import {
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/use-projects";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import {
  useProjectResources,
  useUpdateProjectResourceFavorite,
} from "@/hooks/use-project-resources";
import { useAppStore } from "@/stores/app-store";
import { getProjectsUiCopy } from "@/lib/i18n/projects-ui";
import { getDailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import {
  getTasksUiCopy,
  getTaskStatusOptions,
  getTaskPriorityOptions,
  taskStatusLabel,
} from "@/lib/i18n/tasks-ui";
import { cn } from "@/lib/utils";
import {
  formatProjectDate,
  getProjectDateRangeLabelLocalized,
  getProjectPriorityLabel,
  getProjectPriorityOptions,
  getProjectStatusLabel,
  getProjectStatusOptions,
} from "@/lib/projects/presentation";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type {
  Project,
  ProjectResource,
  ProjectResourceCategory,
  Task,
} from "@/types/database";
import type { UseMutationResult } from "@tanstack/react-query";
import type { UpdateTaskInput } from "@/lib/repositories/tasks";
import { CreatePlannerTaskAiDialog } from "@/components/daily-planner/create-planner-task-ai-dialog";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";
import { isTaskAiGenerated } from "@/lib/tasks/ai-origin";

type ProjectFormState = {
  name: string;
  description: string;
  status: Project["status"];
  priority: Project["priority"];
  start_date: string;
  end_date: string;
};

const emptyForm: ProjectFormState = {
  name: "",
  description: "",
  status: "planning",
  priority: "medium",
  start_date: "",
  end_date: "",
};

function QuickAddTask({
  projectId,
  onOpenAi,
}: {
  projectId: string;
  onOpenAi: () => void;
}) {
  const createTask = useCreateTask();
  const language = useAppStore((s) => s.language);
  const ui = getProjectsUiCopy(language);
  const priorityOptions = useMemo(() => getProjectPriorityOptions(ui), [ui]);
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");

  const reset = () => {
    setTitle("");
    setPriority("medium");
    setDueDate("");
  };

  const handleAdd = async () => {
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title,
      project_id: projectId,
      priority,
      due_date: dueDate || undefined,
    });
    reset();
  };

  if (!expanded) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 min-w-[10rem] justify-start text-muted-foreground"
          onClick={() => setExpanded(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {ui.addTaskManually}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 min-w-[10rem] justify-start text-muted-foreground"
          onClick={onOpenAi}
        >
          <Bot className="mr-2 h-4 w-4" />
          {ui.aiSmartAddTask}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <Input
        placeholder={ui.manualTaskPlaceholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) handleAdd();
          if (e.key === "Escape") {
            reset();
            setExpanded(false);
          }
        }}
      />
      <div className="flex gap-2">
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as Task["priority"])}
          itemToStringLabel={(v) =>
            getProjectPriorityLabel(v as Task["priority"], ui)
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DatePickerInput
          className="w-40"
          value={dueDate}
          onChange={(v) => setDueDate(v)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setExpanded(false);
          }}
        >
          {ui.cancel}
        </Button>
        <Button
          size="sm"
          disabled={!title.trim() || createTask.isPending}
          onClick={handleAdd}
        >
          {createTask.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {ui.addAction}
        </Button>
      </div>
    </div>
  );
}

const CATEGORY_ICON_MAP: Record<ProjectResourceCategory, typeof PlayCircle> = {
  website: Globe,
  video: PlayCircle,
  article: BookOpen,
  podcast: Mic,
  news: Newspaper,
  image: ImageIcon,
  other: CircleHelp,
};

const DETAIL_CATEGORY_COLOR: Record<ProjectResourceCategory, string> = {
  website:
    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200",
  video: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  article: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  podcast:
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  news: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  image:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  other: "bg-slate-200 text-slate-800 dark:bg-slate-700/50 dark:text-slate-200",
};

function categoryIcon(cat: ProjectResourceCategory) {
  return CATEGORY_ICON_MAP[cat];
}

function savedResourceCategoryLabel(
  cat: ProjectResourceCategory,
  ui: ReturnType<typeof getProjectsUiCopy>,
): string {
  if (cat === "website") return ui.websites;
  if (cat === "video") return ui.videos;
  if (cat === "article") return ui.articles;
  if (cat === "podcast") return ui.podcasts;
  if (cat === "news") return ui.news;
  if (cat === "image") return ui.images;
  return ui.otherResources;
}

function ProjectModalTaskRow({
  task,
  language,
  projectUi,
  taskCopy,
  taskStatusOpts,
  taskPriorityOpts,
  isEditing,
  onOpenDetail,
  updateTask,
}: {
  task: Task;
  language: AppLocale;
  projectUi: ReturnType<typeof getProjectsUiCopy>;
  taskCopy: ReturnType<typeof getTasksUiCopy>;
  taskStatusOpts: ReturnType<typeof getTaskStatusOptions>;
  taskPriorityOpts: ReturnType<typeof getTaskPriorityOptions>;
  isEditing: boolean;
  onOpenDetail: (t: Task) => void;
  updateTask: UseMutationResult<
    Task,
    Error,
    { id: string; data: UpdateTaskInput },
    unknown
  >;
}) {
  const ai = isTaskAiGenerated(task);

  if (isEditing) {
    return (
      <li className="space-y-2 rounded-md border bg-muted/10 p-3 text-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
          {ai && (
            <Badge
              variant="secondary"
              className="h-7 w-fit shrink-0 gap-1 border-primary/30 bg-primary/10 px-2 text-xs text-primary"
            >
              <Sparkles className="h-3 w-3" />
              {taskCopy.detailAiGenerated}
            </Badge>
          )}
          <Input
            key={`${task.id}-${task.updated_at}`}
            defaultValue={task.title}
            className="min-w-[10rem] flex-1 lg:max-w-md"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== task.title) {
                void updateTask.mutateAsync({ id: task.id, data: { title: v } });
              }
            }}
          />
          <Select
            value={task.status}
            onValueChange={(v) => {
              if (v && v !== task.status) {
                void updateTask.mutateAsync({
                  id: task.id,
                  data: { status: v as Task["status"] },
                });
              }
            }}
            itemToStringLabel={(v) =>
              taskStatusOpts.find((o) => o.value === v)?.label ?? String(v)
            }
          >
            <SelectTrigger className="w-full lg:w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskStatusOpts.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={task.priority}
            onValueChange={(v) => {
              if (v && v !== task.priority) {
                void updateTask.mutateAsync({
                  id: task.id,
                  data: { priority: v as Task["priority"] },
                });
              }
            }}
            itemToStringLabel={(v) =>
              taskPriorityOpts.find((o) => o.value === v)?.label ?? String(v)
            }
          >
            <SelectTrigger className="w-full lg:w-[9.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskPriorityOpts.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePickerInput
            className="w-full lg:w-40"
            value={task.due_date ?? ""}
            onChange={(v) => {
              const next = v || undefined;
              const prev = task.due_date ?? undefined;
              if (next !== prev) {
                void updateTask.mutateAsync({
                  id: task.id,
                  data: { due_date: next },
                });
              }
            }}
          />
        </div>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40"
        onClick={() => onOpenDetail(task)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {ai && (
            <Badge
              variant="secondary"
              className="shrink-0 gap-0.5 border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] text-primary"
            >
              <Sparkles className="h-2.5 w-2.5" />
              {taskCopy.detailAiGenerated}
            </Badge>
          )}
          <span
            className={cn(
              "truncate",
              task.status === "done" && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge
            variant="status"
            value={task.status}
            label={taskStatusLabel(taskCopy, task.status)}
          />
          <StatusBadge
            variant="priority"
            value={task.priority}
            label={getProjectPriorityLabel(task.priority, projectUi)}
          />
          {task.due_date && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatProjectDate(task.due_date, language)}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

export function ProjectDetailModal({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const { data: allTasks } = useTasks();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const language = useAppStore((s) => s.language);
  const ui = getProjectsUiCopy(language);
  const statusOptions = useMemo(() => getProjectStatusOptions(ui), [ui]);
  const priorityOptions = useMemo(() => getProjectPriorityOptions(ui), [ui]);
  const { data: projectResources, isLoading: resourcesLoading } =
    useProjectResources(project?.id);
  const updateResourceFav = useUpdateProjectResourceFavorite();
  const { data: projects = [] } = useProjects();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState<ProjectFormState>({ ...emptyForm });
  const [aiTaskDialogOpen, setAiTaskDialogOpen] = useState(false);
  const [taskDetailId, setTaskDetailId] = useState<string | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const plannerUi = useMemo(() => getDailyPlannerUiCopy(language), [language]);
  const taskCopy = useMemo(() => getTasksUiCopy(language), [language]);
  const taskStatusOpts = useMemo(
    () => getTaskStatusOptions(taskCopy),
    [taskCopy],
  );
  const taskPriorityOpts = useMemo(
    () => getTaskPriorityOptions(taskCopy),
    [taskCopy],
  );

  const open = !!project;

  const taskDetailLive = useMemo(() => {
    if (!taskDetailId) return null;
    return (allTasks ?? []).find((t) => t.id === taskDetailId) ?? null;
  }, [allTasks, taskDetailId]);

  const projectOptions = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name })),
    [projects],
  );

  const projectTasks = useMemo(
    () => (allTasks ?? []).filter((t) => t.project_id === project?.id),
    [allTasks, project?.id],
  );

  const completedCount = projectTasks.filter(
    (t) => t.status === "done",
  ).length;
  const completionPct =
    projectTasks.length > 0
      ? Math.round((completedCount / projectTasks.length) * 100)
      : 0;

  const startEditing = () => {
    if (!project) return;
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      priority: project.priority,
      start_date: project.start_date ?? "",
      end_date: project.end_date ?? "",
    });
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (!project || !form.name.trim()) return;
    await updateProject.mutateAsync({
      id: project.id,
      data: {
        name: form.name,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
      },
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!project) return;
    await deleteProject.mutateAsync(project.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setIsEditing(false);
      setAiTaskDialogOpen(false);
      onClose();
    }
  };

  const openTaskDetail = (t: Task) => {
    setTaskDetailId(t.id);
    setTaskDetailOpen(true);
  };

  const handleTaskModalOpenChange = (v: boolean) => {
    setTaskDetailOpen(v);
    if (!v) setTaskDetailId(null);
  };

  const handleTaskUpdate = async (id: string, data: Record<string, unknown>) => {
    await updateTask.mutateAsync({
      id,
      data: data as UpdateTaskInput,
    });
  };

  const handleTaskDelete = async (id: string) => {
    await deleteTask.mutateAsync(id);
    handleTaskModalOpenChange(false);
  };

  const set = <K extends keyof ProjectFormState>(
    k: K,
    v: ProjectFormState[K],
  ) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          size="3xl"
          showCloseButton
          className={cn(
            "max-h-[90vh] flex flex-col overflow-hidden transition-[filter,opacity,transform] duration-200 ease-out",
            aiTaskDialogOpen &&
              "pointer-events-none scale-[0.99] opacity-[var(--nested-parent-dialog-opacity)] blur-[var(--nested-parent-dialog-blur)]",
          )}
        >
          {project && (
            <>
              <div className="space-y-3 shrink-0">
                {project.thumbnail_url && (
                  <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={project.thumbnail_url}
                      alt={project.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <h2 className="text-xl font-semibold leading-tight">
                  {project.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    variant="status"
                    value={project.status}
                    label={getProjectStatusLabel(project.status, ui)}
                  />
                  <StatusBadge
                    variant="priority"
                    value={project.priority}
                    label={getProjectPriorityLabel(project.priority, ui)}
                  />
                  <Badge variant="outline" className="tabular-nums">
                    <Target className="mr-1 h-3 w-3" />
                    {completionPct}%
                  </Badge>
                </div>
                <Progress value={completionPct} />
              </div>

              <Separator />

              <Tabs defaultValue="details" className="min-h-0 flex-1 overflow-hidden">
                <TabsList>
                  <TabsTrigger value="details">{ui.detailsTab}</TabsTrigger>
                  <TabsTrigger value="resources">{ui.tabResources}</TabsTrigger>
                  <TabsTrigger value="activity">
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    {ui.activityTab}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-3 h-full overflow-y-auto">
                  {isEditing ? (
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>
                            {ui.tableName} <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label>{ui.descriptionLabel}</Label>
                          <Textarea
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{ui.statusLabel}</Label>
                          <Select
                            value={form.status}
                            onValueChange={(v) =>
                              set("status", v as Project["status"])
                            }
                            itemToStringLabel={(v) =>
                              getProjectStatusLabel(v as Project["status"], ui)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{ui.priorityLabel}</Label>
                          <Select
                            value={form.priority}
                            onValueChange={(v) =>
                              set("priority", v as Project["priority"])
                            }
                            itemToStringLabel={(v) =>
                              getProjectPriorityLabel(
                                v as Project["priority"],
                                ui,
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{ui.startDateLabel}</Label>
                          <DatePickerInput
                            value={form.start_date}
                            onChange={(v) => set("start_date", v)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{ui.endDateLabel}</Label>
                          <DatePickerInput
                            value={form.end_date}
                            onChange={(v) => set("end_date", v)}
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">
                          {ui.tasks}{" "}
                          <span className="text-muted-foreground">
                            ({completedCount}/{projectTasks.length})
                          </span>
                        </h3>
                        {projectTasks.length > 0 ? (
                          <ul className="space-y-2">
                            {projectTasks.map((task) => (
                              <ProjectModalTaskRow
                                key={task.id}
                                task={task}
                                language={language}
                                projectUi={ui}
                                taskCopy={taskCopy}
                                taskStatusOpts={taskStatusOpts}
                                taskPriorityOpts={taskPriorityOpts}
                                isEditing
                                onOpenDetail={openTaskDetail}
                                updateTask={updateTask}
                              />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {ui.noTasksLinked}
                          </p>
                        )}
                        <QuickAddTask
                          projectId={project.id}
                          onOpenAi={() => setAiTaskDialogOpen(true)}
                        />
                      </div>

                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          {ui.cancel}
                        </Button>
                        <Button
                          onClick={handleUpdate}
                          disabled={
                            !form.name.trim() || updateProject.isPending
                          }
                        >
                          {updateProject.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {ui.saveChanges}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6 pt-2">
                      {project.description && (
                        <p className="text-sm text-muted-foreground">
                          {project.description}
                        </p>
                      )}

                      {getProjectDateRangeLabelLocalized(project, language) && (
                        <div className="rounded-md border bg-muted/20 px-3 py-2 text-sm tabular-nums">
                          {getProjectDateRangeLabelLocalized(project, language)}
                        </div>
                      )}

                      {(project.start_date || project.end_date) && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {project.start_date && (
                            <div>
                              <p className="font-medium text-muted-foreground">
                                {ui.startDateLabel}
                              </p>
                              <p>{formatProjectDate(project.start_date, language)}</p>
                            </div>
                          )}
                          {project.end_date && (
                            <div>
                              <p className="font-medium text-muted-foreground">
                                {ui.endDateLabel}
                              </p>
                              <p>{formatProjectDate(project.end_date, language)}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium">
                          {ui.tasks}{" "}
                          <span className="text-muted-foreground">
                            ({completedCount}/{projectTasks.length})
                          </span>
                        </h3>

                        {projectTasks.length > 0 ? (
                          <ul className="space-y-1.5">
                            {projectTasks.map((task) => (
                              <ProjectModalTaskRow
                                key={task.id}
                                task={task}
                                language={language}
                                projectUi={ui}
                                taskCopy={taskCopy}
                                taskStatusOpts={taskStatusOpts}
                                taskPriorityOpts={taskPriorityOpts}
                                isEditing={false}
                                onOpenDetail={openTaskDetail}
                                updateTask={updateTask}
                              />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {ui.noTasksLinked}
                          </p>
                        )}

                        <QuickAddTask
                          projectId={project.id}
                          onOpenAi={() => setAiTaskDialogOpen(true)}
                        />
                      </div>

                      <div className="flex justify-end gap-2 border-t pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={startEditing}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {ui.edit}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {ui.deleteAction}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="resources" className="pt-2 h-full overflow-y-auto">
                  {resourcesLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !projectResources?.length ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {ui.noSavedResources}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {projectResources.map((r: ProjectResource) => {
                        const CatIcon = categoryIcon(r.category);
                        const catLabel = savedResourceCategoryLabel(
                          r.category,
                          ui,
                        );
                        return (
                          <Card
                            key={r.id}
                            className="relative overflow-hidden"
                          >
                            <CardContent className="p-0">
                              <div className="flex gap-0">
                                {/* Thumbnail */}
                                <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center overflow-hidden">
                                  {r.thumbnail_url ? (
                                    <img
                                      src={r.thumbnail_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                        const parent = (e.target as HTMLImageElement).parentElement;
                                        if (parent) {
                                          const fallback = parent.querySelector(".fallback-icon");
                                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`fallback-icon items-center justify-center ${r.thumbnail_url ? "hidden" : "flex"}`}
                                  >
                                    <CatIcon className="h-8 w-8 text-muted-foreground/50" />
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Badge
                                        variant="secondary"
                                        className={`text-[10px] h-5 shrink-0 ${DETAIL_CATEGORY_COLOR[r.category]}`}
                                      >
                                        <CatIcon className="h-2.5 w-2.5 mr-0.5" />
                                        {catLabel}
                                      </Badge>
                                      {r.source && (
                                        <span className="text-[10px] text-muted-foreground truncate">
                                          {r.source}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs font-medium leading-snug line-clamp-2">
                                      {r.title}
                                    </p>
                                    {r.description && (
                                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                        {r.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <a
                                      href={r.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-primary inline-flex items-center gap-0.5 hover:underline"
                                    >
                                      <ExternalLink className="h-2.5 w-2.5" />
                                      {ui.openLink}
                                    </a>
                                  </div>
                                </div>

                                {/* Favorite button */}
                                <div className="absolute top-1.5 right-1.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={updateResourceFav.isPending}
                                    onClick={() =>
                                      updateResourceFav.mutate({
                                        id: r.id,
                                        is_favorite: !r.is_favorite,
                                      })
                                    }
                                    aria-label={
                                      r.is_favorite
                                        ? ui.removeFromFavorites
                                        : ui.addToFavorites
                                    }
                                  >
                                    <Star
                                      className={cn(
                                        "h-3.5 w-3.5",
                                        r.is_favorite &&
                                          "fill-amber-400 text-amber-500",
                                      )}
                                    />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="h-full overflow-y-auto">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {ui.noActivityTitle}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {ui.noActivityDescription}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CreatePlannerTaskAiDialog
        open={aiTaskDialogOpen}
        onOpenChange={setAiTaskDialogOpen}
        locale={language}
        copy={plannerUi}
        blockMinutes={30}
        lockedProjectId={project?.id}
        onAddToPlan={() => {}}
      />

      <TaskDetailModal
        task={taskDetailLive}
        open={taskDetailOpen && !!taskDetailLive}
        onOpenChange={handleTaskModalOpenChange}
        projects={projectOptions}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        isUpdating={updateTask.isPending}
        isDeleting={deleteTask.isPending}
        copy={taskCopy}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ui.deleteProjectTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {ui.deleteProjectDescription(project?.name ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ui.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ui.deleteAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
