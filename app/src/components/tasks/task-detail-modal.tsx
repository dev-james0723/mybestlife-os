"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
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
import {
  AlertCircle,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  FolderOpen,
  StickyNote,
  Bell,
  Focus,
  Sparkles,
} from "lucide-react";
import { formatDate, isOverdue } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/database";
import {
  getTaskStatusOptions,
  getTaskPriorityOptions,
  taskStatusLabel,
  taskPriorityLabel,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import { isTaskAiGenerated } from "@/lib/tasks/ai-origin";

export interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[] | undefined;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
  /** Omit to hide the Focus ritual entry point (e.g. embedded project context). */
  onOpenRitual?: () => void;
  copy: TasksUiCopy;
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  projects,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  onOpenRitual,
  copy,
}: TaskDetailModalProps) {
  const statusOptions = useMemo(() => getTaskStatusOptions(copy), [copy]);
  const priorityOptions = useMemo(() => getTaskPriorityOptions(copy), [copy]);

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedBlocks, setEstimatedBlocks] = useState("");

  const syncForm = useCallback((t: Task) => {
    setTitle(t.title);
    setDescription(t.description ?? "");
    setStatus(t.status);
    setPriority(t.priority);
    setDueDate(t.due_date ?? "");
    setProjectId(t.project_id ?? "");
    setNotes("");
    setEstimatedBlocks(t.estimated_blocks?.toString() ?? "");
  }, []);

  useEffect(() => {
    if (task && open) {
      syncForm(task);
      setIsEditing(false);
    }
  }, [task, open, syncForm]);

  const handleSave = async () => {
    if (!task || !title.trim()) return;
    await onUpdate(task.id, {
      title: title.trim(),
      description: description || undefined,
      status,
      priority,
      due_date: dueDate || undefined,
      project_id: projectId || undefined,
      estimated_blocks: estimatedBlocks ? Number(estimatedBlocks) : undefined,
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!task) return;
    await onDelete(task.id);
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (!task) return null;

  const overdue = isOverdue(task.due_date);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="2xl">
          {isEditing ? (
            <>
              <DialogHeader>
                <DialogTitle>{copy.editTask}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <Label>{copy.labelTitle}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{copy.labelDescription}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                        statusOptions.find((o) => o.value === v)?.label ??
                        String(v)
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
                        priorityOptions.find((o) => o.value === v)?.label ??
                        String(v)
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
                        if (v !== null) setProjectId(v === "none" ? "" : v);
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
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    syncForm(task);
                    setIsEditing(false);
                  }}
                >
                  {copy.cancel}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!title.trim() || isUpdating}
                >
                  {isUpdating ? copy.saving : copy.saveChanges}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4 pr-8">
                  <div className="min-w-0">
                    <DialogTitle className="text-xl leading-snug">
                      {task.title}
                    </DialogTitle>
                    {task.project?.name && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {task.project.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {isTaskAiGenerated(task) && (
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
                    value={task.status}
                    label={taskStatusLabel(copy, task.status)}
                  />
                  <StatusBadge
                    variant="priority"
                    value={task.priority}
                    label={taskPriorityLabel(copy, task.priority)}
                  />
                  {overdue && (
                    <span className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {copy.detailOverdue}
                    </span>
                  )}
                </div>

                {task.description && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        {copy.detailDescription}
                      </p>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {task.due_date && (
                    <div>
                      <p className="font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {copy.detailDueDate}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5",
                          overdue && "text-destructive font-medium",
                        )}
                      >
                        {formatDate(task.due_date)}
                      </p>
                    </div>
                  )}
                  {task.estimated_blocks != null && (
                    <div>
                      <p className="font-medium text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {copy.detailTimeBlocks}
                      </p>
                      <p className="mt-0.5">{task.estimated_blocks}</p>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-muted-foreground">
                      {copy.detailCreated}
                    </p>
                    <p className="mt-0.5">{formatDate(task.created_at)}</p>
                  </div>
                  {task.completed_at && (
                    <div>
                      <p className="font-medium text-muted-foreground">
                        {copy.detailCompleted}
                      </p>
                      <p className="mt-0.5">
                        {formatDate(task.completed_at)}
                      </p>
                    </div>
                  )}
                  {task.reminder_date && (
                    <div>
                      <p className="font-medium text-muted-foreground flex items-center gap-1">
                        <Bell className="h-3.5 w-3.5" />
                        {copy.detailReminder}
                      </p>
                      <p className="mt-0.5">
                        {formatDate(task.reminder_date)}
                      </p>
                    </div>
                  )}
                  {task.source && (
                    <div>
                      <p className="font-medium text-muted-foreground flex items-center gap-1">
                        <StickyNote className="h-3.5 w-3.5" />
                        {copy.detailSource}
                      </p>
                      <p className="mt-0.5">
                        {task.source_url ? (
                          <a
                            href={task.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-2"
                          >
                            {task.source}
                          </a>
                        ) : (
                          task.source
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {task.tags && task.tags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1.5">
                        {copy.detailTags}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                {task.status !== "done" && onOpenRitual && (
                  <Button variant="outline" onClick={onOpenRitual}>
                    <Focus className="h-4 w-4 mr-2" />
                    {copy.focusRitual}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {copy.close}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTaskTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteTaskDescription(task.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? copy.deleting : copy.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
