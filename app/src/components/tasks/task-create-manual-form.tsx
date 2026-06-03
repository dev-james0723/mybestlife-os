"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import {
  OSControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import type { Task } from "@/types/database";
import type { CreateTaskInput } from "@/lib/repositories/tasks";
import {
  getTaskPriorityOptions,
  getTaskStatusOptions,
  type TasksUiCopy,
} from "@/lib/i18n/tasks-ui";
import {
  taskCategoryLabel,
  type TasksCenterUiCopy,
} from "@/lib/i18n/tasks-center-ui";
import { TASK_CATEGORIES } from "@/lib/tasks/task-categories";
import type { TaskDraft } from "@/lib/tasks/task-create";

const NONE = "none";

interface TaskCreateManualFormProps {
  projects: { id: string; name: string }[] | undefined;
  initialDraft?: TaskDraft;
  defaultProjectId?: string;
  onSubmit: (input: CreateTaskInput) => void;
  isPending: boolean;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  submitLabel?: string;
  onCancel?: () => void;
}

export function TaskCreateManualForm({
  projects,
  initialDraft,
  defaultProjectId,
  onSubmit,
  isPending,
  copy,
  centerCopy,
  submitLabel,
  onCancel,
}: TaskCreateManualFormProps) {
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

  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialDraft?.description ?? "");
  const [status, setStatus] = useState<Task["status"]>(
    initialDraft?.status ?? "todo",
  );
  const [priority, setPriority] = useState<Task["priority"]>(
    initialDraft?.priority ?? "medium",
  );
  const [dueDate, setDueDate] = useState(initialDraft?.due_date ?? "");
  const [scheduledDate, setScheduledDate] = useState(
    initialDraft?.scheduled_date ?? "",
  );
  const [category, setCategory] = useState<string>(
    initialDraft?.category ?? NONE,
  );
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [estimatedBlocks, setEstimatedBlocks] = useState(
    initialDraft?.estimated_blocks != null
      ? String(initialDraft.estimated_blocks)
      : "",
  );
  const [tagsInput, setTagsInput] = useState(
    (initialDraft?.tags ?? []).join(", "),
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      due_date: dueDate || undefined,
      scheduled_date: scheduledDate || undefined,
      category: category === NONE ? undefined : category,
      project_id: projectId || undefined,
      estimated_blocks: estimatedBlocks ? Number(estimatedBlocks) : undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
        <div className="space-y-2">
          <Label>{copy.labelTitle}</Label>
          <Input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.placeholderTaskTitle}
            className="h-11 min-h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label>{copy.labelDescription}</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={copy.placeholderDescription}
            rows={3}
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
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{copy.labelDueDate}</Label>
            <DatePickerInput value={dueDate} onChange={setDueDate} />
          </div>
          <div className="space-y-2">
            <Label>{centerCopy.labelScheduledDate}</Label>
            <DatePickerInput value={scheduledDate} onChange={setScheduledDate} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{centerCopy.quickFilterCategory}</Label>
            <Select
              value={category}
              onValueChange={(v) => {
                if (v !== null) setCategory(String(v));
              }}
              itemToStringLabel={(v) =>
                categoryOptions.find((o) => o.value === v)?.label ?? String(v)
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
          </div>
          <div className="space-y-2">
            <Label>{copy.labelEstimatedBlocks}</Label>
            <Input
              type="number"
              min={0}
              value={estimatedBlocks}
              onChange={(e) => setEstimatedBlocks(e.target.value)}
              placeholder={copy.placeholderBlocks}
              className="h-11 min-h-11 rounded-xl"
            />
          </div>
        </div>
        {projects && projects.length > 0 && (
          <div className="space-y-2">
            <Label>{copy.labelProject}</Label>
            <Select
              value={projectId || NONE}
              onValueChange={(v) => {
                if (v !== null) setProjectId(v === NONE ? "" : v);
              }}
              itemToStringLabel={(v) =>
                v === NONE || v === null
                  ? copy.noProject
                  : projects.find((p) => p.id === v)?.name ?? String(v)
              }
            >
              <SelectTrigger className="h-11 min-h-11 rounded-xl">
                <SelectValue placeholder={copy.noProject} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{copy.noProject}</SelectItem>
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
          <Label>{centerCopy.labelTags}</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={centerCopy.tagsInputPlaceholder}
            className="h-11 min-h-11 rounded-xl"
          />
        </div>
      </div>

      <DialogFooter>
        {onCancel && (
          <OSControl variant="outline" onClick={onCancel}>
            {copy.cancel}
          </OSControl>
        )}
        <OSPrimaryAction onClick={handleSubmit} disabled={!title.trim() || isPending}>
          {isPending ? copy.creating : submitLabel ?? copy.createTask}
        </OSPrimaryAction>
      </DialogFooter>
    </div>
  );
}
