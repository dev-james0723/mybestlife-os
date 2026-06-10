"use client";

import { CheckCircle2, ClipboardList, FileText, HelpCircle, MessageSquareText, Vote } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OSFrostedPanel } from "@/components/ui/os-primitives";
import type { NoteAiResponse } from "@/lib/ai/note-ai";
import type { NoteActionCandidate, NoteAiMode } from "@/lib/ai/schemas/notes";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { Note } from "@/types/database";
import { NoteMeetingReviewPanel } from "./NoteMeetingReviewPanel";

export function MeetingReviewWorkflow({
  note,
  locale,
  copy,
  currentContent,
  onAcceptAction,
  onAppendRecap,
  onAiResult,
}: {
  note: Note;
  locale: AppLocale;
  copy: NotesUiCopy;
  currentContent: string;
  onAcceptAction: (action: NoteActionCandidate) => Promise<void>;
  onAppendRecap: (recapMarkdown: string) => Promise<void>;
  onAiResult?: (
    mode: NoteAiMode,
    result: NoteAiResponse<NoteAiMode>,
  ) => void | Promise<void>;
}) {
  const steps = [
    { label: copy.meetingWorkflow.transcript, icon: FileText },
    { label: copy.meetingWorkflow.recap, icon: MessageSquareText },
    { label: copy.meetingWorkflow.decisions, icon: Vote },
    { label: copy.meetingWorkflow.actions, icon: ClipboardList },
    { label: copy.meetingWorkflow.questions, icon: HelpCircle },
  ];

  return (
    <div className="space-y-3">
      <OSFrostedPanel className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-foreground">
            {copy.meetingWorkflow.title}
          </div>
          <Badge variant="outline" className="w-fit bg-background/55">
            <CheckCircle2 className="h-3 w-3" />
            {copy.meetingWorkflow.approval}
          </Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-1 2xl:grid-cols-5">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.label}
                className="rounded-lg border border-black/8 bg-background/40 p-2 dark:border-white/10 dark:bg-white/[0.035]"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="mt-2 text-xs font-medium text-foreground">
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </OSFrostedPanel>

      <NoteMeetingReviewPanel
        note={note}
        locale={locale}
        copy={copy}
        currentContent={currentContent}
        onAcceptAction={onAcceptAction}
        onAppendRecap={onAppendRecap}
        onAiResult={onAiResult}
      />
    </div>
  );
}
