"use client";

import type { LucideIcon } from "lucide-react";
import { Brain, GitBranch, ListTodo, NotebookPen } from "lucide-react";
import { OSFrostedPanel } from "@/components/ui/os-primitives";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";

type WorkflowStep = {
  key: keyof Pick<
    NotesUiCopy["workflow"],
    "capture" | "clarify" | "connect" | "convert"
  >;
  descriptionKey: keyof Pick<
    NotesUiCopy["workflow"],
    | "captureDescription"
    | "clarifyDescription"
    | "connectDescription"
    | "convertDescription"
  >;
  icon: LucideIcon;
};

const STEPS: WorkflowStep[] = [
  {
    key: "capture",
    descriptionKey: "captureDescription",
    icon: NotebookPen,
  },
  {
    key: "clarify",
    descriptionKey: "clarifyDescription",
    icon: Brain,
  },
  {
    key: "connect",
    descriptionKey: "connectDescription",
    icon: GitBranch,
  },
  {
    key: "convert",
    descriptionKey: "convertDescription",
    icon: ListTodo,
  },
];

export function NotesWorkflowRail({ copy }: { copy: NotesUiCopy }) {
  return (
    <OSFrostedPanel className="overflow-hidden p-0" data-notes-reveal>
      <div className="grid gap-0 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.8fr)]">
        <div className="border-b border-black/5 p-4 dark:border-white/10 lg:border-b-0 lg:border-r">
          <div className="text-sm font-semibold text-foreground">
            {copy.workflow.title}
          </div>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            {copy.workflow.description}
          </p>
        </div>
        <div className="grid grid-cols-1 divide-y divide-black/5 dark:divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="min-w-0 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-background/55 text-primary shadow-inner shadow-white/20 dark:border-white/10 dark:bg-white/[0.045]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {copy.workflow[step.key]}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {copy.workflow[step.descriptionKey]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </OSFrostedPanel>
  );
}
