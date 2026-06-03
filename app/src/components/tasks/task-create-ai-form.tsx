"use client";

import { useState } from "react";
import { Sparkles, Lightbulb, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { OSPrimaryAction } from "@/components/ui/os-primitives";
import type { CreateTaskInput } from "@/lib/repositories/tasks";
import type { TasksUiCopy } from "@/lib/i18n/tasks-ui";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";
import type { TaskDraft } from "@/lib/tasks/task-create";
import { TaskCreateManualForm } from "./task-create-manual-form";

interface TaskCreateAiFormProps {
  projects: { id: string; name: string }[] | undefined;
  defaultProjectId?: string;
  onGenerate: (prompt: string) => Promise<TaskDraft>;
  onSubmit: (input: CreateTaskInput, draft: TaskDraft) => void;
  isPending: boolean;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
}

export function TaskCreateAiForm({
  projects,
  defaultProjectId,
  onGenerate,
  onSubmit,
  isPending,
  copy,
  centerCopy,
}: TaskCreateAiFormProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<TaskDraft | null>(null);

  const generate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setGenerating(true);
    try {
      const result = await onGenerate(trimmed);
      setDraft(result);
    } finally {
      setGenerating(false);
    }
  };

  if (draft) {
    const suggestions = draft.suggestions;
    return (
      <div className="space-y-4">
        {suggestions &&
          ((suggestions.reminders?.length ?? 0) > 0 ||
            (suggestions.webResources?.length ?? 0) > 0) && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <div className="mb-2 flex items-center gap-1.5 font-medium text-primary">
                <Lightbulb className="h-4 w-4" />
                {copy.aiSuggestionsHeading}
              </div>
              {(suggestions.reminders?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{copy.aiRemindersLabel} </span>
                  {suggestions.reminders?.join(" · ")}
                </p>
              )}
              {(suggestions.webResources?.length ?? 0) > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium">{copy.aiResourcesLabel} </span>
                  {suggestions.webResources?.map((r) => r.label).join(" · ")}
                </p>
              )}
            </div>
          )}
        <TaskCreateManualForm
          projects={projects}
          initialDraft={draft}
          defaultProjectId={defaultProjectId}
          onSubmit={(input) => onSubmit(input, draft)}
          isPending={isPending}
          copy={copy}
          centerCopy={centerCopy}
          submitLabel={centerCopy.aiUseDraft}
          onCancel={() => setDraft(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={prompt}
        autoFocus
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={centerCopy.aiPromptPlaceholder}
        rows={4}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void generate();
          }
        }}
      />
      <DialogFooter>
        <OSPrimaryAction onClick={() => void generate()} disabled={!prompt.trim() || generating}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {copy.createGenerating}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {centerCopy.aiGenerate}
            </>
          )}
        </OSPrimaryAction>
      </DialogFooter>
    </div>
  );
}
