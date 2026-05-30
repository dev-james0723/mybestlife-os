"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [category, setCategory] = useState<string>(NONE);
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [estimatedBlocks, setEstimatedBlocks] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // Seed from an AI draft when one is supplied (and reseed when it changes).
  useEffect(() => {
    if (!initialDraft) return;
    setTitle(initialDraft.title ?? "");
    setDescription(initialDraft.description ?? "");
    setStatus(initialDraft.status ?? "todo");
    setPriority(initialDraft.priority ?? "medium");
    setDueDate(initialDraft.due_date ?? "");
    setScheduledDate(initialDraft.scheduled_date ?? "");
    setCategory(initialDraft.category ?? NONE);
    setEstimatedBlocks(
      initialDraft.estimated_blocks != null
        ? String(initialDraft.estimated_blocks)
        : "",
    );
    setTagsInput((initialDraft.tags ?? []).join(", "));
  }, [initialDraft]);

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
              <SelectTrigger>
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
              <SelectTrigger>
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
          />
        </div>
      </div>

      <DialogFooter>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            {copy.cancel}
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>
          {isPending ? copy.creating : submitLabel ?? copy.createTask}
        </Button>
      </DialogFooter>
    </div>
  );
}
