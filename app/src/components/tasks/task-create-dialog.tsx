"use client";

import { useState } from "react";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  OSDialogSurface,
  OSSegmentedControl,
} from "@/components/ui/os-primitives";
import type { CreateTaskInput } from "@/lib/repositories/tasks";
import type { TasksUiCopy } from "@/lib/i18n/tasks-ui";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import { buildLocalTaskDraft, type TaskDraft } from "@/lib/tasks/task-create";
import { TaskCreateQuickForm } from "./task-create-quick-form";
import { TaskCreateManualForm } from "./task-create-manual-form";
import { TaskCreateAiForm } from "./task-create-ai-form";

export type TaskCreateMode = "quick" | "manual" | "ai";

interface TaskCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: { id: string; name: string }[] | undefined;
  defaultProjectId?: string;
  onCreate: (input: CreateTaskInput, opts?: { subtasks?: string[] }) => void;
  isPending: boolean;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
  initialMode?: TaskCreateMode;
  /** Override the draft generator (wave 8 wires the real `/api/ai/tasks`). */
  onAiGenerate?: (prompt: string) => Promise<TaskDraft>;
}

export function TaskCreateDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  onCreate,
  isPending,
  copy,
  centerCopy,
  initialMode = "manual",
  onAiGenerate,
}: TaskCreateDialogProps) {
  const [mode, setMode] = useState<TaskCreateMode>(initialMode);

  const generate = async (prompt: string): Promise<TaskDraft> => {
    if (onAiGenerate) return onAiGenerate(prompt);
    return buildLocalTaskDraft(prompt, copy);
  };

  const handleAiCreate = (input: CreateTaskInput, draft: TaskDraft) => {
    onCreate(
      {
        ...input,
        ai_generated: true,
        ai_metadata: draft.suggestions ?? undefined,
        source: input.source ?? "ai:tasks",
      },
      { subtasks: draft.subtasks },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <OSDialogSurface size="lg">
        <DialogHeader>
          <DialogTitle>{copy.createTask}</DialogTitle>
          <DialogDescription className="sr-only">
            {copy.createTask}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <OSSegmentedControl<TaskCreateMode>
            items={[
              { id: "quick", label: centerCopy.createTabQuick },
              { id: "manual", label: centerCopy.createTabManual },
              { id: "ai", label: centerCopy.createTabAi },
            ]}
            value={mode}
            onValueChange={setMode}
            ariaLabel={copy.createTask}
            layoutId="tasks-create-mode-pill"
          />

          {mode === "quick" ? (
            <TaskCreateQuickForm
              defaultProjectId={defaultProjectId}
              onSubmit={onCreate}
              isPending={isPending}
              copy={copy}
              centerCopy={centerCopy}
            />
          ) : null}

          {mode === "manual" ? (
            <TaskCreateManualForm
              projects={projects}
              defaultProjectId={defaultProjectId}
              onSubmit={onCreate}
              isPending={isPending}
              copy={copy}
              centerCopy={centerCopy}
            />
          ) : null}

          {mode === "ai" ? (
            <TaskCreateAiForm
              projects={projects}
              defaultProjectId={defaultProjectId}
              onGenerate={generate}
              onSubmit={handleAiCreate}
              isPending={isPending}
              copy={copy}
              centerCopy={centerCopy}
            />
          ) : null}
        </div>
      </OSDialogSurface>
    </Dialog>
  );
}
