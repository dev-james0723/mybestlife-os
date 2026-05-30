"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogFooter } from "@/components/ui/dialog";
import type { CreateTaskInput } from "@/lib/repositories/tasks";
import type { TasksUiCopy } from "@/lib/i18n/tasks-ui";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";

interface TaskCreateQuickFormProps {
  defaultProjectId?: string;
  onSubmit: (input: CreateTaskInput) => void;
  isPending: boolean;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
}

/** Minimal title-only capture: status `todo`, priority `medium`, inherits the active project filter. */
export function TaskCreateQuickForm({
  defaultProjectId,
  onSubmit,
  isPending,
  copy,
  centerCopy,
}: TaskCreateQuickFormProps) {
  const [title, setTitle] = useState("");

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({
      title: trimmed,
      status: "todo",
      priority: "medium",
      project_id: defaultProjectId || undefined,
    });
    setTitle("");
  };

  return (
    <div className="space-y-3">
      <Input
        value={title}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={copy.placeholderTaskTitle}
      />
      <p className="text-xs text-muted-foreground">{centerCopy.quickAddHint}</p>
      <DialogFooter>
        <Button onClick={submit} disabled={!title.trim() || isPending}>
          {isPending ? copy.creating : copy.createTask}
        </Button>
      </DialogFooter>
    </div>
  );
}
