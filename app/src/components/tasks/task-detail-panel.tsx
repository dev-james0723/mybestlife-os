"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  Focus,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  OSControl,
  OSDialogSurface,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { formatDate, isOverdue } from "@/lib/utils/date";
import type { Task } from "@/types/database";
import {
  getTaskPriorityOptions,
  getTaskStatusOptions,
  taskPriorityLabel,
  taskStatusLabel,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import { TASK_CATEGORIES } from "@/lib/tasks/task-categories";
import { isTaskAiGenerated } from "@/lib/tasks/ai-origin";
import type { TaskLinkFlags } from "@/lib/tasks/task-filters";
import {
  addTaskReferenceTag,
  parseTaskLinkMetadata,
  stripTaskLinkMetadataSections,
} from "@/lib/tasks/task-link-metadata";
import { useAppStore } from "@/stores/app-store";
import { TaskProjectLinker } from "./task-project-linker";
import { TaskLinkedEntities } from "./task-linked-entities";
import { TaskSubtasks } from "./task-subtasks";
import { TaskAiActions } from "./task-ai-actions";

const NONE = "none";

export interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[] | undefined;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  now: Date;
  onOpenRitual?: () => void;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  linkFlags?: TaskLinkFlags;
  /** Cross-module connection actions rendered in-panel. */
  linkSlot?: React.ReactNode;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  projects,
  onUpdate,
  onDelete,
  now,
  onOpenRitual,
  copy,
  centerCopy,
  linkFlags,
  linkSlot,
}: TaskDetailPanelProps) {
  const language = useAppStore((s) => s.language);
  const statusOptions = useMemo(() => getTaskStatusOptions(copy), [copy]);
  const priorityOptions = useMemo(() => getTaskPriorityOptions(copy), [copy]);
  const categoryOptions = useMemo(
    () => [
      { value: NONE, label: centerCopy.categoryNone },
      ...TASK_CATEGORIES.map((c) => ({
        value: c,
        label: taskCategoryLabel(centerCopy, c),
      })),
    ],
    [centerCopy],
  );

  const [titleDraft, setTitleDraft] = useState(task?.title ?? "");
  const [descDraft, setDescDraft] = useState(
    stripTaskLinkMetadataSections(task?.description) ?? "",
  );
  const [blocksDraft, setBlocksDraft] = useState(
    task?.estimated_blocks?.toString() ?? "",
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!task) return null;

  const t = task;
  const overdue = isOverdue(t.due_date) && t.status !== "done";
  const visibleDescription = stripTaskLinkMetadataSections(t.description) ?? "";
  const taskLinkMetadata = parseTaskLinkMetadata(t.tags, t.description);
  const { userVisibleTags } = taskLinkMetadata;

  const commitTitle = () => {
    const v = titleDraft.trim();
    if (v && v !== t.title) onUpdate(t.id, { title: v });
  };
  const commitDescription = () => {
    const v = descDraft.trim();
    if (v !== visibleDescription) {
      let nextTags = [...(t.tags ?? [])];
      for (const id of taskLinkMetadata.noteIds) {
        nextTags = addTaskReferenceTag(nextTags, "note", id);
      }
      for (const id of taskLinkMetadata.ideaIds) {
        nextTags = addTaskReferenceTag(nextTags, "idea", id);
      }
      for (const id of taskLinkMetadata.knowledgeIds) {
        nextTags = addTaskReferenceTag(nextTags, "knowledge", id);
      }
      onUpdate(t.id, { description: v || null, tags: nextTags });
    }
  };
  const commitBlocks = () => {
    const raw = blocksDraft.trim();
    const next = raw ? Number(raw) : null;
    if (next !== (t.estimated_blocks ?? null) && !Number.isNaN(next)) {
      onUpdate(t.id, { estimated_blocks: next });
    }
  };

  const handleDelete = () => {
    onDelete(t.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <OSDialogSurface
          size="5xl"
          className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="shrink-0 gap-2 border-b border-border/60 px-4 py-4 pr-12 sm:px-6 sm:pr-14">
            <div className="flex flex-wrap items-center gap-1.5">
              {isTaskAiGenerated(t) && (
                <Badge
                  variant="secondary"
                  className="gap-1 border-primary/30 bg-primary/10 text-primary"
                >
                  <Sparkles className="h-3 w-3" />
                  {copy.detailAiGenerated}
                </Badge>
              )}
              <StatusBadge
                variant="status"
                value={t.status}
                label={taskStatusLabel(copy, t.status)}
              />
              <StatusBadge
                variant="priority"
                value={t.priority}
                label={taskPriorityLabel(copy, t.priority)}
              />
              {overdue && (
                <span className="flex items-center gap-1 text-xs font-medium text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {copy.detailOverdue}
                </span>
              )}
            </div>
            <DialogTitle className="sr-only">{t.title}</DialogTitle>
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              className="h-auto border-0 px-0 text-lg font-medium shadow-none focus-visible:ring-0"
            />
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="grid min-w-0 grid-cols-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-2">
              <div className="min-w-0 space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={copy.labelStatus}>
                    <Select
                      value={t.status}
                      onValueChange={(v) => {
                        if (v !== null) onUpdate(t.id, { status: v });
                      }}
                      itemToStringLabel={(v) =>
                        statusOptions.find((o) => o.value === v)?.label ??
                        String(v)
                      }
                    >
                      <SelectTrigger className="h-11 min-h-11 rounded-xl">
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
                  </Field>
                  <Field label={copy.labelPriority}>
                    <Select
                      value={t.priority}
                      onValueChange={(v) => {
                        if (v !== null) onUpdate(t.id, { priority: v });
                      }}
                      itemToStringLabel={(v) =>
                        priorityOptions.find((o) => o.value === v)?.label ??
                        String(v)
                      }
                    >
                      <SelectTrigger className="h-11 min-h-11 rounded-xl">
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
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={centerCopy.quickFilterProject}>
                    <TaskProjectLinker
                      value={t.project_id}
                      projects={projects}
                      onChange={(id) => onUpdate(t.id, { project_id: id })}
                      copy={copy}
                      centerCopy={centerCopy}
                    />
                  </Field>
                  <Field label={centerCopy.quickFilterCategory}>
                    <Select
                      value={t.category ?? NONE}
                      onValueChange={(v) => {
                        if (v !== null)
                          onUpdate(t.id, { category: v === NONE ? null : v });
                      }}
                      itemToStringLabel={(v) =>
                        categoryOptions.find((o) => o.value === v)?.label ??
                        String(v)
                      }
                    >
                      <SelectTrigger className="h-11 min-h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={copy.labelDueDate}>
                    <DatePickerInput
                      value={t.due_date ?? ""}
                      onChange={(v) => onUpdate(t.id, { due_date: v || null })}
                    />
                  </Field>
                  <Field label={centerCopy.labelScheduledDate}>
                    <DatePickerInput
                      value={t.scheduled_date ?? ""}
                      onChange={(v) =>
                        onUpdate(t.id, { scheduled_date: v || null })
                      }
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label={copy.labelEstimatedBlocks}>
                    <Input
                      type="number"
                      min={0}
                      value={blocksDraft}
                      onChange={(e) => setBlocksDraft(e.target.value)}
                      onBlur={commitBlocks}
                      placeholder={copy.placeholderBlocks}
                      className="h-11 min-h-11 rounded-xl"
                    />
                  </Field>
                  {t.reminder_date && (
                    <Field label={copy.detailReminder}>
                      <p className="flex h-11 min-h-11 items-center gap-1 text-sm">
                        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatDate(t.reminder_date)}
                      </p>
                    </Field>
                  )}
                </div>

                <Field label={copy.labelDescription}>
                  <Textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onBlur={commitDescription}
                    rows={3}
                    placeholder={copy.placeholderDescription}
                  />
                </Field>

                <Separator />

                <TaskSubtasks taskId={t.id} copy={centerCopy} />

                <Separator />

                <TaskAiActions
                  task={t}
                  locale={language}
                  copy={centerCopy}
                  onUpdate={onUpdate}
                />
              </div>

              <div className="min-w-0 space-y-5">
                <TaskLinkedEntities
                  task={t}
                  copy={centerCopy}
                  now={now}
                  linkFlags={linkFlags}
                />

                {linkSlot && (
                  <>
                    <Separator />
                    {linkSlot}
                  </>
                )}

                {userVisibleTags.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                      {copy.detailTags}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {userVisibleTags.map((tag) => (
                        <span
                          key={tag}
                          className="max-w-full break-words rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {t.source && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <StickyNote className="h-3.5 w-3.5" />
                      {copy.detailSource}
                    </p>
                    <p className="text-sm">
                      {t.source_url ? (
                        <a
                          href={t.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {t.source}
                        </a>
                      ) : (
                        t.source
                      )}
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {centerCopy.detailActivityTitle}
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      {centerCopy.createdLabel} · {formatDate(t.created_at)}
                    </li>
                    <li>
                      {centerCopy.updatedLabel} · {formatDate(t.updated_at)}
                    </li>
                    {t.completed_at && (
                      <li>
                        {centerCopy.completedLabel} ·{" "}
                        {formatDate(t.completed_at)}
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mx-0 mb-0 shrink-0 flex-row flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/10 px-4 py-3 sm:px-6 sm:justify-between">
            <OSControl
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              {copy.delete}
            </OSControl>
            <div className="flex items-center gap-2">
              {t.status !== "done" && onOpenRitual && (
                <OSControl variant="outline" onClick={onOpenRitual}>
                  <Focus className="h-4 w-4" />
                  {copy.focusRitual}
                </OSControl>
              )}
              <OSPrimaryAction onClick={() => onOpenChange(false)}>
                {copy.close}
              </OSPrimaryAction>
            </div>
          </DialogFooter>
        </OSDialogSurface>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTaskTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteTaskDescription(t.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
