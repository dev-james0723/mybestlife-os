"use client";

import { useEffect, useMemo, useState } from "react";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
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
  /** Cross-module connection actions (Add to plan, goal links) rendered in-panel. */
  linkSlot?: React.ReactNode;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
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

  const [titleDraft, setTitleDraft] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [blocksDraft, setBlocksDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Seed editable drafts when a different task opens (not on every refetch).
  useEffect(() => {
    if (task && open) {
      setTitleDraft(task.title);
      setDescDraft(task.description ?? "");
      setBlocksDraft(task.estimated_blocks?.toString() ?? "");
    }
  }, [task?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

  const t = task;
  const overdue = isOverdue(t.due_date) && t.status !== "done";

  const commitTitle = () => {
    const v = titleDraft.trim();
    if (v && v !== t.title) onUpdate(t.id, { title: v });
  };
  const commitDescription = () => {
    const v = descDraft.trim();
    if (v !== (t.description ?? "")) onUpdate(t.id, { description: v || null });
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
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader className="gap-2 pr-10">
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
            <SheetTitle className="sr-only">{t.title}</SheetTitle>
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
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.labelStatus}>
                <Select
                  value={t.status}
                  onValueChange={(v) => {
                    if (v !== null) onUpdate(t.id, { status: v });
                  }}
                  itemToStringLabel={(v) =>
                    statusOptions.find((o) => o.value === v)?.label ?? String(v)
                  }
                >
                  <SelectTrigger className="h-8">
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
                    priorityOptions.find((o) => o.value === v)?.label ?? String(v)
                  }
                >
                  <SelectTrigger className="h-8">
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

            <div className="grid grid-cols-2 gap-3">
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
                    categoryOptions.find((o) => o.value === v)?.label ?? String(v)
                  }
                >
                  <SelectTrigger className="h-8">
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

            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.labelDueDate}>
                <DatePickerInput
                  value={t.due_date ?? ""}
                  onChange={(v) => onUpdate(t.id, { due_date: v || null })}
                />
              </Field>
              <Field label={centerCopy.labelScheduledDate}>
                <DatePickerInput
                  value={t.scheduled_date ?? ""}
                  onChange={(v) => onUpdate(t.id, { scheduled_date: v || null })}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={copy.labelEstimatedBlocks}>
                <Input
                  type="number"
                  min={0}
                  value={blocksDraft}
                  onChange={(e) => setBlocksDraft(e.target.value)}
                  onBlur={commitBlocks}
                  placeholder={copy.placeholderBlocks}
                  className="h-8"
                />
              </Field>
              {t.reminder_date && (
                <Field label={copy.detailReminder}>
                  <p className="flex h-8 items-center gap-1 text-sm">
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

            <Separator />

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

            {t.tags && t.tags.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm font-medium text-muted-foreground">
                  {copy.detailTags}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
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
                    {centerCopy.completedLabel} · {formatDate(t.completed_at)}
                  </li>
                )}
              </ul>
            </div>
          </div>

          <SheetFooter className="flex-row items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              {copy.delete}
            </Button>
            <div className="flex items-center gap-2">
              {t.status !== "done" && onOpenRitual && (
                <Button variant="outline" size="sm" onClick={onOpenRitual}>
                  <Focus className="h-4 w-4" />
                  {copy.focusRitual}
                </Button>
              )}
              <Button size="sm" onClick={() => onOpenChange(false)}>
                {copy.close}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
