"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { EntityCard } from "@/components/shared/entity-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { PreTaskRitualModal } from "@/components/tasks/pre-task-ritual-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckSquare,
  Plus,
  AlertCircle,
  CheckCircle,
  Sparkles,
  FileEdit,
  Loader2,
  Globe,
  Bell,
  LayoutGrid,
  ChevronRight,
} from "lucide-react";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-projects";
import { formatDateShort, isOverdue } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Task } from "@/types/database";
import type { CreateTaskInput } from "@/lib/repositories/tasks";
import { useAppStore } from "@/stores/app-store";
import { getPreTaskRitualUiCopy } from "@/lib/i18n/pre-task-ritual-ui";
import {
  getTasksUiCopy,
  getTaskStatusOptions,
  getTaskPriorityOptions,
  getTaskSortOptions,
  formatAllFilterLabel,
  buildClarifyingQuestions,
  buildAiMetadata,
  applyClarifyingInference,
  taskStatusLabel,
  taskPriorityLabel,
  type ClarifyingQuestion,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

const priorityOrder: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ---------------------------------------------------------------------------
// CreateTaskModal
// ---------------------------------------------------------------------------

type CreatePhase = "quick" | "clarifying" | "generating" | "full";

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[] | undefined;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  isPending: boolean;
  copy: TasksUiCopy;
}

function CreateTaskModal({
  open,
  onOpenChange,
  projects,
  onSubmit,
  isPending,
  copy,
}: CreateTaskModalProps) {
  const statusOptions = useMemo(() => getTaskStatusOptions(copy), [copy]);
  const priorityOptions = useMemo(() => getTaskPriorityOptions(copy), [copy]);

  const [phase, setPhase] = useState<CreatePhase>("quick");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedBlocks, setEstimatedBlocks] = useState("");

  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [customAnswer, setCustomAnswer] = useState("");

  const [aiMeta, setAiMeta] = useState<ReturnType<typeof buildAiMetadata> | null>(null);

  const reset = useCallback(() => {
    setPhase("quick");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setDueDate("");
    setProjectId("");
    setNotes("");
    setEstimatedBlocks("");
    setQuestions([]);
    setCurrentQ(0);
    setAnswers([]);
    setCustomAnswer("");
    setAiMeta(null);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleCreateWithAi = () => {
    if (!title.trim()) return;
    const qs = buildClarifyingQuestions(copy, title.trim());
    setQuestions(qs);
    setAnswers(new Array(qs.length).fill(""));
    setCurrentQ(0);
    setPhase("clarifying");
  };

  const handleSelectOption = (optionId: string) => {
    const next = [...answers];
    next[currentQ] = optionId;
    setAnswers(next);
    advanceQuestion(next);
  };

  const handleCustomSubmit = () => {
    if (!customAnswer.trim()) return;
    const next = [...answers];
    next[currentQ] = customAnswer.trim();
    setAnswers(next);
    setCustomAnswer("");
    advanceQuestion(next);
  };

  const advanceQuestion = (updatedAnswers: string[]) => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      setPhase("generating");
      setTimeout(() => {
        const inferred = applyClarifyingInference(questions, updatedAnswers);
        setEstimatedBlocks(inferred.estimatedBlocks);
        setPriority(inferred.priority);
        setDescription(copy.aiDescriptionTemplate(title.trim()));
        setAiMeta(buildAiMetadata(copy, title.trim()));
        setPhase("full");
      }, 1500);
    }
  };

  const handleManual = () => {
    if (!title.trim()) return;
    setPhase("full");
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      description: description || undefined,
      project_id: projectId || undefined,
      priority,
      status,
      due_date: dueDate || undefined,
      estimated_blocks: estimatedBlocks ? Number(estimatedBlocks) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={phase === "quick" ? "md" : "2xl"}
        showCloseButton={phase !== "generating"}
      >
        {phase === "quick" && (
          <>
            <DialogHeader>
              <DialogTitle>{copy.createDialogTitleNew}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={copy.createPlaceholderTitle}
                className="text-lg h-12"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) handleManual();
                }}
              />
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={handleCreateWithAi}
                  disabled={!title.trim()}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {copy.createWithAi}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleManual}
                  disabled={!title.trim()}
                >
                  <FileEdit className="h-4 w-4 mr-2" />
                  {copy.createManually}
                </Button>
              </div>
            </div>
          </>
        )}

        {phase === "clarifying" && questions.length > 0 && (
          <>
            <DialogHeader>
              <DialogTitle>{copy.createDialogTitleQuestions}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {copy.createDialogQuestionProgress(currentQ + 1, questions.length)}
              </p>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-base font-medium">
                {questions[currentQ].question}
              </p>
              <div className="flex flex-wrap gap-2">
                {questions[currentQ].options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(opt.id)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary",
                      answers[currentQ] === opt.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customAnswer}
                  onChange={(e) => setCustomAnswer(e.target.value)}
                  placeholder={copy.createCustomAnswerPlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustomSubmit();
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleCustomSubmit}
                  disabled={!customAnswer.trim()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {phase === "generating" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {copy.createGenerating}
            </p>
          </div>
        )}

        {phase === "full" && (
          <>
            <DialogHeader>
              <DialogTitle>
                {aiMeta ? copy.createTitleAiAssisted : copy.createTitleNewTask}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
              <div className="space-y-2">
                <Label>{copy.labelTitle}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={copy.placeholderTaskTitle}
                />
              </div>
              <div className="space-y-2">
                <Label>{copy.labelDescription}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={copy.placeholderDescription}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{copy.labelStatus}</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => {
                      if (v !== null) setStatus(v as Task["status"]);
                    }}
                    itemToStringLabel={(v) =>
                      statusOptions.find((o) => o.value === v)?.label ?? String(v)
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
                  <Label>{copy.labelPriority}</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) => {
                      if (v !== null) setPriority(v as Task["priority"]);
                    }}
                    itemToStringLabel={(v) =>
                      priorityOptions.find((o) => o.value === v)?.label ?? String(v)
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{copy.labelDueDate}</Label>
                  <DatePickerInput
                    value={dueDate}
                    onChange={(v) => setDueDate(v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{copy.labelEstimatedBlocks}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={estimatedBlocks}
                    onChange={(e) => setEstimatedBlocks(e.target.value)}
                    placeholder={copy.placeholderBlocks}
                  />
                </div>
              </div>
              {projects && projects.length > 0 && (
                <div className="space-y-2">
                  <Label>{copy.labelProject}</Label>
                  <Select
                    value={projectId || "none"}
                    onValueChange={(v) => {
                      if (v !== null)
                        setProjectId(v === "none" ? "" : v);
                    }}
                    itemToStringLabel={(v) =>
                      v === "none" || v === null ? copy.noProject : String(v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={copy.noProject} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{copy.noProject}</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{copy.labelNotes}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={copy.placeholderNotes}
                  rows={2}
                />
              </div>

              {aiMeta && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      {copy.aiSuggestionsHeading}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">{copy.aiRemindersLabel}</span>{" "}
                          {aiMeta.reminders.join(", ")}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <LayoutGrid className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">
                            {copy.aiBlocksLabel}
                          </span>{" "}
                          {aiMeta.suggestedBlocks}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">{copy.aiResourcesLabel}</span>
                          <ul className="mt-1 space-y-0.5">
                            {aiMeta.webResources.map((r) => (
                              <li key={r.label}>
                                <a
                                  href={r.url}
                                  className="text-primary underline underline-offset-2 hover:text-primary/80"
                                >
                                  {r.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {copy.cancel}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || isPending}
              >
                {isPending ? copy.creating : copy.createTask}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// TasksPage
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getTasksUiCopy(language), [language]);
  const ritualCopy = useMemo(
    () => getPreTaskRitualUiCopy(language),
    [language],
  );
  const statusOptions = useMemo(() => getTaskStatusOptions(ui), [ui]);
  const priorityOptions = useMemo(() => getTaskPriorityOptions(ui), [ui]);
  const sortOptions = useMemo(() => getTaskSortOptions(ui), [ui]);

  const { data: tasks, isLoading } = useTasks();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRitual, setShowRitual] = useState(false);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result = [...tasks];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "due_date":
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return (
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
        case "priority":
          return (
            (priorityOrder[a.priority] ?? 2) -
            (priorityOrder[b.priority] ?? 2)
          );
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [tasks, search, statusFilter, priorityFilter, sortBy]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    if (key === "status") setStatusFilter(value);
    if (key === "priority") setPriorityFilter(value);
  }, []);

  const handleCreate = async (input: CreateTaskInput) => {
    await createTask.mutateAsync(input);
  };

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    await updateTask.mutateAsync({ id, data });
  };

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

  if (isLoading) return <LoadingPage />;

  return (
    <>
      <PageShell
        title={ui.pageTitle}
        description={ui.pageDescription}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {ui.newTask}
          </Button>
        }
      >
        <FilterBar
          search={{
            placeholder: ui.searchPlaceholder,
            value: search,
            onChange: setSearch,
          }}
          filters={[
            {
              key: "status",
              label: ui.filterStatus,
              options: statusOptions,
              value: statusFilter,
            },
            {
              key: "priority",
              label: ui.filterPriority,
              options: priorityOptions,
              value: priorityFilter,
            },
          ]}
          onFilterChange={handleFilterChange}
          sort={{ options: sortOptions, value: sortBy, onChange: setSortBy }}
          viewModes={["list", "grid"]}
          activeViewMode={viewMode}
          onViewModeChange={setViewMode}
          i18n={{
            searchDefaultPlaceholder: ui.searchPlaceholder,
            sortPlaceholder: ui.sortPlaceholder,
            formatAllFilterOption: (filterLabel) => formatAllFilterLabel(ui, filterLabel),
          }}
        />

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
                    onClick: () => setShowCreate(true),
                  }
                : undefined
            }
          />
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            }
          >
            {filteredTasks.map((task) => {
              const overdue = isOverdue(task.due_date);
              return (
                <EntityCard
                  key={task.id}
                  title={task.title}
                  subtitle={task.project?.name ?? undefined}
                  badges={
                    <>
                      <StatusBadge
                        variant="status"
                        value={task.status}
                        label={taskStatusLabel(ui, task.status)}
                      />
                      <StatusBadge
                        variant="priority"
                        value={task.priority}
                        label={taskPriorityLabel(ui, task.priority)}
                      />
                    </>
                  }
                  meta={
                    task.due_date && (
                      <span
                        className={
                          overdue
                            ? "text-destructive font-medium flex items-center gap-1"
                            : ""
                        }
                      >
                        {overdue && <AlertCircle className="h-3 w-3" />}
                        {formatDateShort(task.due_date)}
                      </span>
                    )
                  }
                  onClick={() => openDetail(task)}
                  actions={
                    task.status !== "done" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleCompleteTask(task)}
                        aria-label={ui.completeTaskAria}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </PageShell>

      <CreateTaskModal
        open={showCreate}
        onOpenChange={setShowCreate}
        projects={projects}
        onSubmit={handleCreate}
        isPending={createTask.isPending}
        copy={ui}
      />

      <TaskDetailModal
        task={selectedTask}
        open={showDetail}
        onOpenChange={setShowDetail}
        projects={projects}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        isUpdating={updateTask.isPending}
        isDeleting={deleteTask.isPending}
        onOpenRitual={handleOpenRitual}
        copy={ui}
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
