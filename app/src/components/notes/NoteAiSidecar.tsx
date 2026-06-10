"use client";

import { useMemo, useState } from "react";
import {
  Bot,
  Check,
  GitBranch,
  ListChecks,
  Loader2,
  MessageSquareText,
  Network,
  Route,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OSControl, OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { postNoteAi, type NoteAiResponse } from "@/lib/ai/note-ai";
import type {
  NoteActionCandidate,
  NoteAiMode,
  NoteConnectionHint,
} from "@/lib/ai/schemas/notes";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { Note } from "@/types/database";

type AnyNoteAiResponse = NoteAiResponse<NoteAiMode>;

type ActionConfig = {
  key: string;
  mode: Exclude<NoteAiMode, "capture" | "ask">;
  label: string;
  icon: typeof Sparkles;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function candidateArray(value: unknown): NoteActionCandidate[] {
  return Array.isArray(value) ? (value as NoteActionCandidate[]) : [];
}

function connectionArray(value: unknown): NoteConnectionHint[] {
  return Array.isArray(value) ? (value as NoteConnectionHint[]) : [];
}

export function NoteAiSidecar({
  note,
  locale,
  copy,
  onAcceptAction,
  onAiResult,
}: {
  note: Note;
  locale: AppLocale;
  copy: NotesUiCopy;
  onAcceptAction: (action: NoteActionCandidate) => Promise<void>;
  onAiResult?: (mode: NoteAiMode, result: AnyNoteAiResponse) => void | Promise<void>;
}) {
  const [scope, setScope] = useState<"current-note" | "current-project-notes" | "all-notes">("current-note");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [result, setResult] = useState<AnyNoteAiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [accepted, setAccepted] = useState<Set<string>>(() => new Set());
  const [question, setQuestion] = useState("");

  const actions: ActionConfig[] = useMemo(
    () => [
      { key: "summarize", mode: "summarize", label: copy.aiActions.summarize, icon: Sparkles },
      { key: "route", mode: "route", label: copy.aiActions.route, icon: Route },
      { key: "cleanup", mode: "organize", label: copy.aiActions.cleanup, icon: Wand2 },
      { key: "extract", mode: "extract-actions", label: copy.aiActions.extractActions, icon: ListChecks },
      { key: "connect", mode: "connect", label: copy.aiActions.connect, icon: Network },
      { key: "outline", mode: "organize", label: copy.aiActions.outline, icon: GitBranch },
      { key: "meeting", mode: "meeting-recap", label: copy.aiActions.meetingRecap, icon: MessageSquareText },
      { key: "research", mode: "research-distill", label: copy.aiActions.researchDistill, icon: Bot },
    ],
    [copy],
  );

  async function runAction(action: ActionConfig) {
    setActiveKey(action.key);
    setError(null);
    try {
      const response = await postNoteAi(action.mode, {
        locale,
        noteId: note.id,
        noteTitle: note.title,
        noteContent: note.content ?? note.title,
        scope,
        activeProjectId: note.project_id,
        activeProjectName: note.project?.name ?? null,
      });
      setResult(response);
      void onAiResult?.(action.mode, response);
    } catch {
      setError(copy.aiUnavailable);
    } finally {
      setActiveKey(null);
    }
  }

  async function askNote() {
    const q = question.trim();
    if (!q) return;
    setActiveKey("ask");
    setError(null);
    try {
      const response = await postNoteAi("ask", {
        locale,
        noteId: note.id,
        noteTitle: note.title,
        noteContent: note.content ?? note.title,
        question: q,
        scope,
        activeProjectId: note.project_id,
        activeProjectName: note.project?.name ?? null,
      });
      setResult(response);
      void onAiResult?.("ask", response);
    } catch {
      setError(copy.aiUnavailable);
    } finally {
      setActiveKey(null);
    }
  }

  const record = asRecord(result);
  const summary = typeof record.summary === "string" ? record.summary : "";
  const answer = typeof record.answer === "string" ? record.answer : "";
  const routeDestination = typeof record.destination === "string" ? record.destination : "";
  const routeNextBestAction = typeof record.nextBestAction === "string" ? record.nextBestAction : "";
  const routeRationale = typeof record.rationale === "string" ? record.rationale : "";
  const routeEvidence = stringArray(record.evidence);
  const keyPoints = stringArray(record.keyPoints);
  const outline = stringArray(record.outline);
  const claims = stringArray(record.claims);
  const sources = stringArray(record.sources);
  const questions = stringArray(record.questions);
  const decisions = stringArray(record.decisions);
  const openQuestions = stringArray(record.openQuestions);
  const citations = stringArray(record.citations);
  const actionCandidates = [
    ...candidateArray(record.actions),
    ...candidateArray(record.actionCandidates),
    ...candidateArray(record.nextSteps),
  ].filter((action) => !dismissed.has(action.title));
  const connections = connectionArray(record.connections);

  return (
    <OSFrostedPanel className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{copy.aiSidecar}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copy.originalPreserved}
          </p>
        </div>
        {result?.source ? (
          <Badge variant="outline">
            {result.source === "gemini" ? copy.aiSourceGemini : copy.aiSourceFallback}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="note-ai-scope">
          {copy.aiScope}
        </label>
        <select
          id="note-ai-scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as typeof scope)}
          className="h-9 w-full rounded-lg border border-input bg-background/45 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="current-note">{copy.scopeCurrent}</option>
          <option value="current-project-notes">{copy.scopeProject}</option>
          <option value="all-notes">{copy.scopeAll}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const busy = activeKey === action.key;
          return (
            <OSControl
              key={action.key}
              type="button"
              osSize="compact"
              onClick={() => void runAction(action)}
              disabled={Boolean(activeKey)}
              className="justify-start"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="truncate">{busy ? copy.aiRunning : action.label}</span>
            </OSControl>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void askNote();
            }
          }}
          placeholder={copy.askPlaceholder}
          className="bg-background/45"
        />
        <OSPrimaryAction
          type="button"
          osSize="compact"
          onClick={() => void askNote()}
          disabled={!question.trim() || Boolean(activeKey)}
        >
          {activeKey === "ask" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {copy.ask}
        </OSPrimaryAction>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4 rounded-xl border border-black/8 bg-background/45 p-3 dark:border-white/10">
          {summary ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.summary}
              </h4>
              <p className="text-sm leading-6 text-foreground">{summary}</p>
            </section>
          ) : null}

          {answer ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.answer}
              </h4>
              <p className="text-sm leading-6 text-foreground">{answer}</p>
            </section>
          ) : null}

          {routeDestination && routeNextBestAction ? (
            <section className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.routeSuggestion.title}
              </h4>
              <div className="rounded-lg border border-black/8 bg-background/60 p-3 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-background/55">
                    {copy.routeSuggestion.destinations[
                      routeDestination as keyof typeof copy.routeSuggestion.destinations
                    ] ?? routeDestination}
                  </Badge>
                  {typeof record.confidence === "number" ? (
                    <Badge variant="ghost" className="bg-background/55">
                      {Math.round(record.confidence * 100)}% {copy.confidence}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {routeNextBestAction}
                </p>
                {routeRationale ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {routeRationale}
                  </p>
                ) : null}
                {routeEvidence.length > 0 ? (
                  <div className="mt-3 space-y-1.5">
                    {routeEvidence.map((item) => (
                      <p
                        key={item}
                        className="rounded-lg bg-background/55 px-2.5 py-1.5 text-xs leading-5 text-muted-foreground"
                      >
                        {item}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {[keyPoints, outline, claims, sources, questions, decisions, openQuestions, citations].map(
            (items, index) =>
              items.length > 0 ? (
                <section key={index} className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {index === 0 || index === 1 ? copy.keyPoints : copy.metadata}
                  </h4>
                  <ul className="space-y-1.5 text-sm leading-6 text-foreground">
                    {items.map((item) => (
                      <li key={item} className="rounded-lg bg-background/55 px-2.5 py-1.5">
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
          )}

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.actionCandidates}
            </h4>
            {actionCandidates.length > 0 ? (
              <div className="space-y-2">
                {actionCandidates.map((action) => (
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
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <OSControl
                        type="button"
                        osSize="compact"
                        onClick={() => {
                          setDismissed((prev) => new Set(prev).add(action.title));
                        }}
                      >
                        <X className="h-4 w-4" />
                        {copy.dismiss}
                      </OSControl>
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
              <p className="text-sm text-muted-foreground">{copy.noActionCandidates}</p>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.connections}
            </h4>
            {connections.length > 0 ? (
              <div className="space-y-2">
                {connections.map((connection) => (
                  <div
                    key={`${connection.targetType}-${connection.targetId}-${connection.targetTitle}`}
                    className="rounded-lg border border-black/8 bg-background/60 p-3 text-sm dark:border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground">
                        {connection.targetTitle}
                      </span>
                      <Badge variant="outline">{connection.targetType}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {connection.rationale}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.noConnections}</p>
            )}
          </section>
        </div>
      ) : null}
    </OSFrostedPanel>
  );
}
