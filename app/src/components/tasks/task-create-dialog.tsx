"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Reset to the requested entry mode whenever the dialog (re)opens.
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

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
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{copy.createTask}</DialogTitle>
          <DialogDescription className="sr-only">
            {copy.createTask}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as TaskCreateMode)}
          className="gap-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="quick">{centerCopy.createTabQuick}</TabsTrigger>
            <TabsTrigger value="manual">
              {centerCopy.createTabManual}
            </TabsTrigger>
            <TabsTrigger value="ai">{centerCopy.createTabAi}</TabsTrigger>
          </TabsList>

          <TabsContent value="quick">
            <TaskCreateQuickForm
              defaultProjectId={defaultProjectId}
              onSubmit={onCreate}
              isPending={isPending}
              copy={copy}
              centerCopy={centerCopy}
            />
          </TabsContent>

          <TabsContent value="manual">
            <TaskCreateManualForm
              projects={projects}
              defaultProjectId={defaultProjectId}
              onSubmit={onCreate}
              isPending={isPending}
              copy={copy}
              centerCopy={centerCopy}
            />
          </TabsContent>

          <TabsContent value="ai">
            <TaskCreateAiForm
              projects={projects}
              defaultProjectId={defaultProjectId}
              onGenerate={generate}
              onSubmit={handleAiCreate}
              isPending={isPending}
              copy={copy}
              centerCopy={centerCopy}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
