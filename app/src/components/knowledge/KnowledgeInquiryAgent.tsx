"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Copy,
  Loader2,
  Mic,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import {
  OSControl,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useAppStore } from "@/stores/app-store";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { cn } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/knowledge/labels";
import { getCardSummaryPreview } from "@/lib/knowledge/knowledge-list-utils";
import {
  matchKnowledgeItems,
  type KnowledgeMatchResult,
} from "@/lib/knowledgeMatching";

type AgentState =
  | "idle"
  | "listening"
  | "transcribing"
  | "analyzing"
  | "matching"
  | "results-ready"
  | "no-strong-matches"
  | "error";

const MIN_STRONG_SCORE = 28;

function speechLangForLocale(locale: string): string {
  if (locale === "zh-TW") return "zh-TW";
  if (locale === "zh-CN") return "zh-CN";
  if (locale === "ja") return "ja-JP";
  if (locale === "ko") return "ko-KR";
  if (locale === "fr") return "fr-FR";
  if (locale === "it") return "it-IT";
  if (locale === "es") return "es-ES";
  if (locale === "vi") return "vi-VN";
  return "en-US";
}

function statusLabel(
  state: AgentState,
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"],
) {
  switch (state) {
    case "listening":
      return ui.listeningStatus;
    case "transcribing":
      return ui.transcribingStatus;
    case "analyzing":
      return ui.analyzingStatus;
    case "matching":
      return ui.matchingStatus;
    case "results-ready":
      return ui.resultsReadyStatus;
    case "no-strong-matches":
      return ui.noStrongMatchesStatus;
    case "error":
      return ui.errorStatus;
    case "idle":
    default:
      return ui.idleStatus;
  }
}

function isBusyState(state: AgentState) {
  return state === "listening" || state === "transcribing" || state === "analyzing" || state === "matching";
}

export function KnowledgeInquiryAgent() {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language).inquiryAgent;
  const items = useKnowledgeStore((s) => s.items);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const searchQuery = useKnowledgeStore((s) => s.searchQuery);
  const setSearchQuery = useKnowledgeStore((s) => s.setSearchQuery);
  const setSortBy = useKnowledgeStore((s) => s.setSortBy);
  const selectItem = useKnowledgeStore((s) => s.selectItem);
  const openAIPanel = useKnowledgeStore((s) => s.openAIPanel);

  const [draftInquiry, setDraftInquiry] = useState(searchQuery);
  const [committedInquiry, setCommittedInquiry] = useState(searchQuery);
  const [agentState, setAgentState] = useState<AgentState>(searchQuery.trim() ? "results-ready" : "idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const agentStateRef = useRef(agentState);

  const setAgentStateValue = useCallback((next: AgentState) => {
    agentStateRef.current = next;
    setAgentState(next);
  }, []);

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current = [];
  }, []);

  const matches = useMemo(
    () =>
      committedInquiry.trim()
        ? matchKnowledgeItems(items, committedInquiry, smartCollections, {
            limit: 5,
            minScore: 8,
          })
        : [],
    [committedInquiry, items, smartCollections],
  );

  const runInquiry = useCallback(
    (value: string) => {
      const next = value.trim();
      clearTimers();
      setDraftInquiry(next);
      setCommittedInquiry(next);
      setSearchQuery(next);
      setSortBy("relevance");

      if (!next) {
        setAgentStateValue("idle");
        return;
      }

      setAgentStateValue("analyzing");
      timersRef.current.push(
        setTimeout(() => setAgentStateValue("matching"), 180),
        setTimeout(() => {
          const nextMatches = matchKnowledgeItems(items, next, smartCollections, {
            limit: 5,
            minScore: 8,
          });
          const hasStrongMatch = nextMatches.some(
            (match) => match.normalizedScore >= MIN_STRONG_SCORE,
          );
          setAgentStateValue(hasStrongMatch ? "results-ready" : "no-strong-matches");
        }, 420),
      );
    },
    [clearTimers, items, setAgentStateValue, setSearchQuery, setSortBy, smartCollections],
  );

  const handleTranscript = useCallback(
    (transcript: string) => {
      const next = transcript.trim();
      if (!next) return;
      clearTimers();
      setDraftInquiry(next);
      setAgentStateValue("transcribing");
      timersRef.current.push(setTimeout(() => runInquiry(next), 280));
    },
    [clearTimers, runInquiry, setAgentStateValue],
  );

  const speech = useSpeechRecognition({
    lang: speechLangForLocale(language),
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    return useKnowledgeStore.subscribe((state, previousState) => {
      if (state.searchQuery === previousState.searchQuery) return;
      if (isBusyState(agentStateRef.current)) return;
      setDraftInquiry(state.searchQuery);
      setCommittedInquiry(state.searchQuery);
      setAgentStateValue(state.searchQuery.trim() ? "results-ready" : "idle");
    });
  }, [setAgentStateValue]);

  useEffect(() => clearTimers, [clearTimers]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runInquiry(draftInquiry);
  };

  const clearInquiry = () => {
    clearTimers();
    speech.reset();
    setDraftInquiry("");
    setCommittedInquiry("");
    setSearchQuery("");
    setAgentStateValue("idle");
  };

  const toggleSpeech = () => {
    if (speech.isListening) {
      speech.stopListening();
      return;
    }
    speech.startListening();
  };

  const speechMessage =
    speech.status === "unsupported"
      ? ui.speechUnsupported
      : speech.status === "permission-denied"
        ? ui.permissionDenied
        : speech.status === "error"
          ? ui.speechError
          : null;

  const visibleAgentState: AgentState =
    speech.isListening
      ? "listening"
      : speech.status === "permission-denied" ||
          speech.status === "error" ||
          speech.status === "unsupported"
        ? "error"
        : agentState;

  const displayMatches =
    visibleAgentState === "no-strong-matches"
      ? matches.filter((match) => match.normalizedScore >= MIN_STRONG_SCORE)
      : matches;

  return (
    <section
      className="rounded-lg border border-border/70 bg-card shadow-sm"
      aria-labelledby="knowledge-inquiry-agent-title"
    >
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.78fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Bot className="h-3.5 w-3.5" aria-hidden />
                {ui.eyebrow}
              </p>
              <h2
                id="knowledge-inquiry-agent-title"
                className="text-balance text-lg font-semibold leading-tight text-foreground sm:text-xl"
              >
                {ui.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {ui.description}
              </p>
            </div>

            <AgentStatusBadge state={visibleAgentState} label={statusLabel(visibleAgentState, ui)} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="knowledge-inquiry-input" className="sr-only">
              {ui.inputLabel}
            </label>
            <div className="rounded-lg border border-border/70 bg-background/80 p-2 shadow-inner">
              <Textarea
                id="knowledge-inquiry-input"
                value={draftInquiry}
                onChange={(event) => setDraftInquiry(event.target.value)}
                placeholder={ui.inputPlaceholder}
                className="min-h-[88px] resize-none border-0 bg-transparent p-2 text-sm leading-6 shadow-none focus-visible:ring-0"
                aria-describedby="knowledge-inquiry-status"
              />
              {(speech.interimTranscript || speech.transcript) && speech.isListening ? (
                <p className="px-2 pb-1 text-xs text-muted-foreground" aria-live="polite">
                  {speech.interimTranscript || speech.transcript}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 border-t border-border/50 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div
                  id="knowledge-inquiry-status"
                  className="min-h-5 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {speechMessage ?? statusLabel(visibleAgentState, ui)}
                </div>

                <div className="flex items-center justify-end gap-2">
                  {draftInquiry.trim() ? (
                    <OSIconControl
                      type="button"
                      size="icon-sm"
                      osSize="compact"
                      onClick={clearInquiry}
                      aria-label={ui.clearInquiry}
                    >
                      <X className="h-4 w-4" />
                    </OSIconControl>
                  ) : null}
                  <OSIconControl
                    type="button"
                    size="icon-sm"
                    osSize="compact"
                    onClick={toggleSpeech}
                    aria-label={speech.isListening ? ui.stopListening : ui.startListening}
                    aria-pressed={speech.isListening}
                    disabled={!speech.isSupported}
                    className={cn(
                      speech.isListening &&
                        "border-rose-300 bg-rose-50 text-rose-700 motion-safe:animate-pulse dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200",
                    )}
                  >
                    <Mic className="h-4 w-4" />
                  </OSIconControl>
                  <OSPrimaryAction
                    type="submit"
                    osSize="compact"
                    className="gap-2"
                    disabled={!draftInquiry.trim() || visibleAgentState === "analyzing" || visibleAgentState === "matching"}
                  >
                    {visibleAgentState === "analyzing" || visibleAgentState === "matching" ? (
                      <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    {ui.runInquiry}
                  </OSPrimaryAction>
                </div>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{ui.examplesLabel}</span>
            {ui.exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                className="rounded-md border border-border/60 bg-background/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => runInquiry(example)}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="truncate">
                {committedInquiry.trim()
                  ? ui.resultsHeading(displayMatches.length)
                  : ui.resultsHeading(0)}
              </span>
            </p>
          </div>

          {visibleAgentState === "idle" && !committedInquiry.trim() ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 px-4 text-center text-sm leading-6 text-muted-foreground">
              {ui.inputPlaceholder}
            </div>
          ) : visibleAgentState === "analyzing" || visibleAgentState === "matching" || visibleAgentState === "transcribing" ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 bg-background/40 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 text-primary motion-safe:animate-spin" />
              {statusLabel(visibleAgentState, ui)}
            </div>
          ) : displayMatches.length > 0 ? (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {displayMatches.map((match) => (
                <InquiryResultCard
                  key={match.item.id}
                  match={match}
                  inquiry={committedInquiry}
                  ui={ui}
                  onOpen={() => selectItem(match.item.id)}
                  onAskAi={() => openAIPanel(committedInquiry)}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 px-4 text-center">
              <CheckCircle2 className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-medium">{ui.noStrongMatchesTitle}</h3>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                {ui.noStrongMatchesDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AgentStatusBadge({ state, label }: { state: AgentState; label: string }) {
  const isBusy = isBusyState(state);
  const isDone = state === "results-ready";
  const isError = state === "error";
  return (
    <div
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium",
        isDone
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
          : isError
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            : "border-border/70 bg-background/80 text-muted-foreground",
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isBusy
            ? "bg-primary motion-safe:animate-pulse"
            : isDone
              ? "bg-emerald-500"
              : isError
                ? "bg-rose-500"
                : "bg-muted-foreground/50",
        )}
        aria-hidden
      />
      {label}
    </div>
  );
}

function InquiryResultCard({
  match,
  inquiry,
  ui,
  onOpen,
  onAskAi,
}: {
  match: KnowledgeMatchResult;
  inquiry: string;
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  onOpen: () => void;
  onAskAi: () => void;
}) {
  const summary = getCardSummaryPreview(match.item);
  const category = match.item.category ? getCategoryLabel(match.item.category) : match.item.contentType;
  const tags = [...match.item.aiTags, ...match.item.manualTags].slice(0, 3);

  const copyPrompt = async () => {
    const prompt = [
      "Use this knowledge item to help answer my inquiry.",
      "",
      `Inquiry: ${inquiry}`,
      `Knowledge item: ${match.item.title}`,
      `Why it matched: ${match.reasons.join(" ")}`,
      `Suggested next action: ${match.suggestedAction}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(ui.promptCopied);
    } catch {
      toast.message(prompt);
    }
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-border/70 bg-background/85 p-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-border/60 bg-muted/35 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {category}
            </span>
            <span className="rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {ui.confidenceLabels[match.confidence]}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {match.item.title}
          </h3>
        </div>
        <span className="shrink-0 tabular-nums text-xs font-semibold text-primary">
          {ui.relevanceScore(match.normalizedScore)}
        </span>
      </div>

      {summary ? (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {summary}
        </p>
      ) : null}

      <div className="mt-2 space-y-1.5">
        <p className="text-[11px] font-medium text-foreground">{ui.whyThisMatches}</p>
        {match.reasons.map((reason) => (
          <p key={reason} className="text-xs leading-5 text-muted-foreground">
            {reason}
          </p>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {match.matchedConcepts.slice(0, 3).map((concept) => (
          <span
            key={concept}
            className="rounded-md border border-emerald-200/60 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
            title={ui.matchedConcepts}
          >
            {concept}
          </span>
        ))}
        {match.matchedKeywords.slice(0, Math.max(0, 4 - match.matchedConcepts.length)).map((keyword) => (
          <span
            key={keyword}
            className="rounded-md border border-border/60 bg-muted/35 px-1.5 py-0.5 text-[10px] text-muted-foreground"
            title={ui.matchedKeywords}
          >
            {keyword}
          </span>
        ))}
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border/50 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-md bg-muted/35 px-2 py-1.5 text-[11px] leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">{ui.suggestedAction}:</span>{" "}
        {match.suggestedAction}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <OSControl type="button" osSize="compact" onClick={copyPrompt} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          {ui.copyPrompt}
        </OSControl>
        <OSControl type="button" osSize="compact" onClick={onAskAi} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {ui.askAi}
        </OSControl>
        <OSPrimaryAction type="button" osSize="compact" onClick={onOpen}>
          {ui.openItem}
        </OSPrimaryAction>
      </div>
    </motion.article>
  );
}
