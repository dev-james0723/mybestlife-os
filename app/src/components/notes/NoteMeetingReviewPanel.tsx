"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  FilePlus2,
  Loader2,
  MessageSquareText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { postNoteAi, type NoteAiResponse } from "@/lib/ai/note-ai";
import type {
  NoteActionCandidate,
  NoteAiMode,
} from "@/lib/ai/schemas/notes";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { Note } from "@/types/database";

type MeetingRecapResponse = NoteAiResponse<"meeting-recap">;

function listOrEmpty(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function actionList(value: unknown): NoteActionCandidate[] {
  return Array.isArray(value) ? (value as NoteActionCandidate[]) : [];
}

function bulletSection(title: string, items: string[]) {
  if (items.length === 0) return "";
  return [`### ${title}`, ...items.map((item) => `- ${item}`)].join("\n");
}

function actionSection(title: string, actions: NoteActionCandidate[]) {
  if (actions.length === 0) return "";
  return [
    `### ${title}`,
    ...actions.map((action) => {
      const details = [action.description, action.dueDate ? `Due: ${action.dueDate}` : ""]
        .filter(Boolean)
        .join(" ");
      return `- [ ] ${action.title}${details ? ` — ${details}` : ""}`;
    }),
  ].join("\n");
}

function formatRecap(result: MeetingRecapResponse, copy: NotesUiCopy) {
  const agenda = listOrEmpty(result.agenda);
  const decisions = listOrEmpty(result.decisions);
  const openQuestions = listOrEmpty(result.openQuestions);
  const actions = actionList(result.actions);
  return [
    `## ${copy.meetingReview.title}`,
    result.summary ? `### ${copy.meetingReview.recap}\n${result.summary}` : "",
    bulletSection(copy.meetingReview.agenda, agenda),
    bulletSection(copy.meetingReview.decisions, decisions),
    bulletSection(copy.meetingReview.openQuestions, openQuestions),
    actionSection(copy.meetingReview.actionQueue, actions),
  ]
    .filter(Boolean)
    .join("\n\n");
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg bg-background/55 px-2.5 py-1.5 text-sm leading-6 text-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NoteMeetingReviewPanel({
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
  const [result, setResult] = useState<MeetingRecapResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [appending, setAppending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set());

  const agenda = useMemo(() => listOrEmpty(result?.agenda), [result]);
  const decisions = useMemo(() => listOrEmpty(result?.decisions), [result]);
  const openQuestions = useMemo(() => listOrEmpty(result?.openQuestions), [result]);
  const actions = useMemo(() => actionList(result?.actions), [result]);
  const hasResult = Boolean(result);

  async function runReview() {
    setRunning(true);
    setError(null);
    try {
      const response = await postNoteAi("meeting-recap", {
        locale,
        noteId: note.id,
        noteTitle: note.title,
        noteContent: currentContent || note.content || note.title,
        scope: "current-note",
        activeProjectId: note.project_id,
        activeProjectName: note.project?.name ?? null,
      });
      setResult(response);
      void onAiResult?.("meeting-recap", response);
    } catch {
      setError(copy.aiUnavailable);
    } finally {
      setRunning(false);
    }
  }

  async function appendRecap() {
    if (!result || appending) return;
    setAppending(true);
    try {
      await onAppendRecap(formatRecap(result, copy));
      toast.success(copy.meetingReview.recapAppended);
    } finally {
      setAppending(false);
    }
  }

  return (
    <OSFrostedPanel className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {copy.meetingReview.title}
            </h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.meetingReview.subtitle}
          </p>
        </div>
        {result?.source ? (
          <Badge variant="outline" className="shrink-0 bg-background/55">
            {result.source === "gemini" ? copy.aiSourceGemini : copy.aiSourceFallback}
          </Badge>
        ) : null}
      </div>

      <div className="rounded-lg border border-black/8 bg-background/40 p-3 text-xs leading-5 text-muted-foreground dark:border-white/10 dark:bg-white/[0.035]">
        {hasResult ? copy.meetingReview.preserveNotice : copy.meetingReview.runHint}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <OSPrimaryAction
          type="button"
          onClick={() => void runReview()}
          disabled={running || appending}
          className="justify-center"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {hasResult ? copy.meetingReview.rerun : copy.meetingReview.processMeeting}
        </OSPrimaryAction>
        <OSControl
          type="button"
          onClick={() => void appendRecap()}
          disabled={!result || running || appending}
          className="justify-center"
        >
          {appending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          {appending ? copy.meetingReview.appending : copy.meetingReview.appendRecap}
        </OSControl>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4 rounded-xl border border-black/8 bg-background/45 p-3 dark:border-white/10">
          {result.summary ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.meetingReview.recap}
              </h4>
              <p className="text-sm leading-6 text-foreground">{result.summary}</p>
            </section>
          ) : null}

          <SummaryList title={copy.meetingReview.agenda} items={agenda} />
          <SummaryList title={copy.meetingReview.decisions} items={decisions} />
          <SummaryList title={copy.meetingReview.openQuestions} items={openQuestions} />

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.meetingReview.actionQueue}
              </h4>
            </div>
            {actions.length > 0 ? (
              <div className="space-y-2">
                {actions.map((action) => (
                  <div
                    key={action.title}
                    className="rounded-lg border border-black/8 bg-background/60 p-3 dark:border-white/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">
                          {action.title}
                        </div>
                        {action.description ? (
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {action.description}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="outline">{action.priority}</Badge>
                    </div>
                    {action.sourceQuote ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {action.sourceQuote}
                      </p>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <OSPrimaryAction
                        type="button"
                        osSize="compact"
                        disabled={accepted.has(action.title)}
                        onClick={async () => {
                          await onAcceptAction(action);
                          setAccepted((prev) => new Set(prev).add(action.title));
                        }}
                      >
                        <Check className="h-4 w-4" />
                        {copy.acceptAsTask}
                      </OSPrimaryAction>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {copy.meetingReview.noMeetingActions}
              </p>
            )}
          </section>
        </div>
      ) : null}
    </OSFrostedPanel>
  );
}
