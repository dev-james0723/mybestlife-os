"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Copy,
  GitCompareArrows,
  GraduationCap,
  ListChecks,
  Loader2,
  Mic,
  Pin,
  PinOff,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  OSControl,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { useCommandLightInteraction } from "@/hooks/use-command-light-interaction";
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
import type {
  RetrievalMode,
  RetrievalResult,
  RetrievalSourceChip,
  RetrievalSourceDomain,
} from "@/lib/retrieval/types";

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
const RETRIEVAL_MODES: RetrievalMode[] = ["hybrid", "semantic", "keyword", "recent"];
const RETRIEVAL_PANEL_ID = "knowledge-source-retrieval-panel";
const RETRIEVAL_RECIPES_STORAGE_KEY = "mylifeos.ask-kb.retrieval-recipes.v1";
const PINNED_RETRIEVAL_STORAGE_KEY = "mylifeos.ask-kb.pinned-sources.v1";

type RetrievalRecipe = {
  id: string;
  name: string;
  query: string;
  mode: RetrievalMode;
  sourceDomains: RetrievalSourceDomain[];
  createdAt: string;
};

type KnowledgeWorkflowId = "changed" | "contradictions" | "tasks" | "study-pack";

const KNOWLEDGE_WORKFLOWS: Array<{
  id: KnowledgeWorkflowId;
  icon: LucideIcon;
  prompt: string;
}> = [
  {
    id: "changed",
    icon: Clock3,
    prompt:
      "Using the current retrieved knowledge, answer: what changed since last week? If the knowledge does not include dates, say so clearly. Cite each claim and call out uncertainty.",
  },
  {
    id: "contradictions",
    icon: AlertTriangle,
    prompt:
      "Using the current retrieved knowledge, find contradictions, tensions, or disagreements. Separate strong contradictions from weak tension and cite every point.",
  },
  {
    id: "tasks",
    icon: ListChecks,
    prompt:
      "Using the current retrieved knowledge, turn the useful findings into a practical task or project plan with owners, priorities, and citations.",
  },
  {
    id: "study-pack",
    icon: GraduationCap,
    prompt:
      "Using the current retrieved knowledge, build a compact study pack with key ideas, source-backed notes, recall questions, and citations.",
  },
];

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

function readStoredArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeStoredArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* local persistence is optional */
  }
}

function resultStorageKey(result: RetrievalResult): string {
  return [
    result.sourceDomain,
    result.sourceId,
    result.retrievalDocumentId ?? result.documentKind,
    result.chunkIndex,
  ].join(":");
}

function shortRecipeName(query: string) {
  const compact = query.replace(/\s+/g, " ").trim();
  return compact.length > 42 ? `${compact.slice(0, 39).trimEnd()}...` : compact;
}

function workflowLabel(
  workflow: KnowledgeWorkflowId,
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"],
) {
  if (workflow === "changed") return ui.workflowChanged;
  if (workflow === "contradictions") return ui.workflowContradictions;
  if (workflow === "tasks") return ui.workflowTasks;
  return ui.workflowStudyPack;
}

export function KnowledgeInquiryAgent() {
  const reduceMotion = useReducedMotion();
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
  const [retrievalMode, setRetrievalMode] = useState<RetrievalMode>("hybrid");
  const [serverResults, setServerResults] = useState<RetrievalResult[]>([]);
  const [sourceChips, setSourceChips] = useState<RetrievalSourceChip[]>([]);
  const [selectedSourceDomains, setSelectedSourceDomains] = useState<RetrievalSourceDomain[]>([]);
  const [retrievalWarnings, setRetrievalWarnings] = useState<string[]>([]);
  const [retrievalRunId, setRetrievalRunId] = useState<string | null>(null);
  const [isRetrievalOpen, setIsRetrievalOpen] = useState(false);
  const [retrievalRecipes, setRetrievalRecipes] = useState<RetrievalRecipe[]>([]);
  const [pinnedResultKeys, setPinnedResultKeys] = useState<string[]>([]);
  const [compareResultKeys, setCompareResultKeys] = useState<string[]>([]);
  const [retrievalStorageReady, setRetrievalStorageReady] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const retrievalRequestRef = useRef(0);
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
    (
      value: string,
      modeOverride?: RetrievalMode,
      sourceDomainOverride?: RetrievalSourceDomain[],
    ) => {
      const next = value.trim();
      const modeToUse = modeOverride ?? retrievalMode;
      const sourceDomainsToUse = sourceDomainOverride ?? selectedSourceDomains;
      const requestId = ++retrievalRequestRef.current;
      clearTimers();
      setIsRetrievalOpen(true);
      setDraftInquiry(next);
      setCommittedInquiry(next);
      setSearchQuery(next);
      setSortBy("relevance");
      setServerResults([]);
      setSourceChips([]);
      setRetrievalWarnings([]);
      setRetrievalRunId(null);

      if (!next) {
        setAgentStateValue("idle");
        return;
      }

      setAgentStateValue("analyzing");
      timersRef.current.push(
        setTimeout(() => setAgentStateValue("matching"), 180),
      );

      void (async () => {
        const localMatches = matchKnowledgeItems(items, next, smartCollections, {
          limit: 5,
          minScore: 8,
        });
        try {
          const response = await fetch("/api/knowledge/retrieve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: next,
              mode: modeToUse,
              limit: 8,
              sourceDomains: sourceDomainsToUse,
              referenceDateIso: new Date().toISOString(),
            }),
          });
          if (requestId !== retrievalRequestRef.current) return;
          if (!response.ok) {
            throw new Error(`retrieve_http_${response.status}`);
          }
          const data = (await response.json()) as {
            retrievalRunId?: string | null;
            results?: RetrievalResult[];
            sourceChips?: RetrievalSourceChip[];
            warnings?: string[];
          };
          const results = data.results ?? [];
          setServerResults(results);
          setSourceChips(data.sourceChips ?? []);
          setRetrievalWarnings(data.warnings ?? []);
          setRetrievalRunId(data.retrievalRunId ?? null);
          setAgentStateValue(
            results.length > 0 || localMatches.some((match) => match.normalizedScore >= MIN_STRONG_SCORE)
              ? "results-ready"
              : "no-strong-matches",
          );
        } catch (error) {
          if (requestId !== retrievalRequestRef.current) return;
          const nextMatches = localMatches;
          const hasStrongMatch = nextMatches.some(
            (match) => match.normalizedScore >= MIN_STRONG_SCORE,
          );
          setRetrievalWarnings([
            error instanceof Error ? error.message : "retrieval_unavailable",
          ]);
          setAgentStateValue(hasStrongMatch ? "results-ready" : "no-strong-matches");
        }
      })();
    },
    [
      clearTimers,
      items,
      retrievalMode,
      selectedSourceDomains,
      setAgentStateValue,
      setCommittedInquiry,
      setDraftInquiry,
      setIsRetrievalOpen,
      setRetrievalRunId,
      setRetrievalWarnings,
      setSearchQuery,
      setSortBy,
      setServerResults,
      setSourceChips,
      smartCollections,
    ],
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
    [clearTimers, runInquiry, setAgentStateValue, setDraftInquiry],
  );

  const speech = useSpeechRecognition({
    lang: speechLangForLocale(language),
    onTranscript: handleTranscript,
  });

  useEffect(() => {
    queueMicrotask(() => {
      setRetrievalRecipes(
        readStoredArray<RetrievalRecipe>(RETRIEVAL_RECIPES_STORAGE_KEY)
          .filter((recipe) => recipe.query && recipe.mode)
          .slice(0, 8),
      );
      setPinnedResultKeys(
        readStoredArray<string>(PINNED_RETRIEVAL_STORAGE_KEY)
          .filter((key) => typeof key === "string")
          .slice(0, 24),
      );
      setRetrievalStorageReady(true);
    });
  }, [setIsRetrievalOpen]);

  useEffect(() => {
    if (!retrievalStorageReady) return;
    writeStoredArray(RETRIEVAL_RECIPES_STORAGE_KEY, retrievalRecipes.slice(0, 8));
  }, [retrievalRecipes, retrievalStorageReady]);

  useEffect(() => {
    if (!retrievalStorageReady) return;
    writeStoredArray(PINNED_RETRIEVAL_STORAGE_KEY, pinnedResultKeys.slice(0, 24));
  }, [pinnedResultKeys, retrievalStorageReady]);

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
    retrievalRequestRef.current += 1;
    speech.reset();
    setDraftInquiry("");
    setCommittedInquiry("");
    setSearchQuery("");
    setServerResults([]);
    setSourceChips([]);
    setSelectedSourceDomains([]);
    setRetrievalWarnings([]);
    setRetrievalRunId(null);
    setAgentStateValue("idle");
  };

  function openRetrievalPanel() {
    setIsRetrievalOpen(true);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.document.getElementById("knowledge-inquiry-input")?.focus();
    });
  }

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
  const inlineStatusLabel =
    speechMessage ??
    (visibleAgentState === "idle" ? null : statusLabel(visibleAgentState, ui));

  const displayMatches =
    visibleAgentState === "no-strong-matches"
      ? matches.filter((match) => match.normalizedScore >= MIN_STRONG_SCORE)
      : matches;
  const activeResultCount = serverResults.length > 0 ? serverResults.length : displayMatches.length;
  const hasRetrievalActivity =
    committedInquiry.trim().length > 0 ||
    visibleAgentState !== "idle" ||
    serverResults.length > 0 ||
    displayMatches.length > 0 ||
    retrievalWarnings.length > 0;
  const scopeLabel =
    selectedSourceDomains.length > 0
      ? `${selectedSourceDomains.length} source${selectedSourceDomains.length === 1 ? "" : "s"}`
      : "All readable knowledge";
  const collapsedStatus = hasRetrievalActivity
    ? ui.resultsHeading(activeResultCount)
    : statusLabel(visibleAgentState, ui);
  const pinnedKeySet = useMemo(() => new Set(pinnedResultKeys), [pinnedResultKeys]);
  const compareKeySet = useMemo(() => new Set(compareResultKeys), [compareResultKeys]);
  const visibleServerResults = useMemo(
    () =>
      [...serverResults].sort((a, b) => {
        const ap = pinnedKeySet.has(resultStorageKey(a)) ? 1 : 0;
        const bp = pinnedKeySet.has(resultStorageKey(b)) ? 1 : 0;
        if (bp !== ap) return bp - ap;
        return b.scores.combined - a.scores.combined;
      }),
    [pinnedKeySet, serverResults],
  );
  const pinnedResults = visibleServerResults.filter((result) =>
    pinnedKeySet.has(resultStorageKey(result)),
  );
  const comparedResults = visibleServerResults.filter((result) =>
    compareKeySet.has(resultStorageKey(result)),
  );

  const saveCurrentRecipe = () => {
    const query = committedInquiry.trim() || draftInquiry.trim();
    if (!query) return;
    const recipe: RetrievalRecipe = {
      id: crypto.randomUUID(),
      name: shortRecipeName(query),
      query,
      mode: retrievalMode,
      sourceDomains: selectedSourceDomains,
      createdAt: new Date().toISOString(),
    };
    setRetrievalRecipes((current) => {
      const withoutDuplicate = current.filter(
        (entry) =>
          entry.query !== recipe.query ||
          entry.mode !== recipe.mode ||
          entry.sourceDomains.join(",") !== recipe.sourceDomains.join(","),
      );
      return [recipe, ...withoutDuplicate].slice(0, 8);
    });
    toast.success(ui.recipeSaved);
  };

  const applyRecipe = (recipe: RetrievalRecipe) => {
    setRetrievalMode(recipe.mode);
    setSelectedSourceDomains(recipe.sourceDomains);
    runInquiry(recipe.query, recipe.mode, recipe.sourceDomains);
  };

  const togglePinnedResult = (result: RetrievalResult) => {
    const key = resultStorageKey(result);
    setPinnedResultKeys((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [key, ...current].slice(0, 24),
    );
  };

  const toggleComparedResult = (result: RetrievalResult) => {
    const key = resultStorageKey(result);
    setCompareResultKeys((current) =>
      current.includes(key)
        ? current.filter((entry) => entry !== key)
        : [...current, key].slice(-4),
    );
  };

  const updateSourceScope = (domain: RetrievalSourceDomain, enabled: boolean) => {
    const current =
      selectedSourceDomains.length > 0
        ? selectedSourceDomains
        : sourceChips.map((chip) => chip.domain);
    const next = enabled
      ? [...new Set([...current, domain])]
      : current.filter((entry) => entry !== domain);
    const safeNext = next.length > 0 ? next : ["knowledge" as RetrievalSourceDomain];
    setSelectedSourceDomains(safeNext);
    if (committedInquiry.trim()) runInquiry(committedInquiry, retrievalMode, safeNext);
  };

  return (
    <section
      className="max-w-full"
      aria-label={ui.openRetrieval}
    >
      <RetrievalTriggerButton
        ui={ui}
        status={collapsedStatus}
        hasActivity={hasRetrievalActivity}
        isOpen={isRetrievalOpen}
        reduceMotion={Boolean(reduceMotion)}
        panelId={RETRIEVAL_PANEL_ID}
        onToggle={() => (isRetrievalOpen ? setIsRetrievalOpen(false) : openRetrievalPanel())}
      />

      <AnimatePresence initial={false}>
        {isRetrievalOpen ? (
          <motion.div
            key="retrieval-panel"
            id={RETRIEVAL_PANEL_ID}
            initial={reduceMotion ? false : { height: 0, opacity: 0, y: -10 }}
            animate={reduceMotion ? undefined : { height: "auto", opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0, y: -8 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="min-w-0 overflow-hidden"
            aria-labelledby="knowledge-inquiry-agent-title"
          >
            <div className="mt-2 rounded-xl border border-lime-900/10 bg-[linear-gradient(135deg,rgba(247,250,239,0.94)_0%,rgba(233,241,215,0.9)_48%,rgba(220,232,188,0.82)_100%)] shadow-[0_18px_54px_rgba(79,103,34,0.14),inset_0_1px_0_rgba(255,255,255,0.54)] dark:border-lime-300/18 dark:bg-[linear-gradient(135deg,#11140e_0%,#151b10_48%,#202911_100%)] dark:shadow-[0_22px_64px_rgba(6,12,4,0.48),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div
              className={cn(
                "grid gap-4 p-4 sm:p-5",
                hasRetrievalActivity
                  ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.72fr)]"
                  : "xl:grid-cols-1",
              )}
            >
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-lime-800/70 dark:text-lime-200/65">
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

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <AgentStatusBadge state={visibleAgentState} label={statusLabel(visibleAgentState, ui)} />
              <OSControl
                type="button"
                osSize="compact"
                className="gap-1.5"
                aria-expanded="true"
                aria-controls={RETRIEVAL_PANEL_ID}
                onClick={() => setIsRetrievalOpen(false)}
              >
                <ChevronDown className="h-3.5 w-3.5 rotate-180" />
                {ui.collapseRetrieval}
              </OSControl>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="knowledge-inquiry-input" className="sr-only">
              {ui.inputLabel}
            </label>
            <div className="rounded-lg border border-lime-900/10 bg-white/62 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.52),inset_0_16px_42px_rgba(85,112,39,0.08)] dark:border-lime-300/14 dark:bg-black/24 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <Textarea
                id="knowledge-inquiry-input"
                value={draftInquiry}
                onChange={(event) => setDraftInquiry(event.target.value)}
                placeholder={ui.inputPlaceholder}
                className="min-h-[88px] resize-none border-0 bg-transparent p-2 text-sm leading-6 shadow-none placeholder:text-muted-foreground/75 focus-visible:ring-0"
                aria-describedby="knowledge-inquiry-status"
              />
              {(speech.interimTranscript || speech.transcript) && speech.isListening ? (
                <p className="px-2 pb-1 text-xs text-muted-foreground" aria-live="polite">
                  {speech.interimTranscript || speech.transcript}
                </p>
              ) : null}
              <div className="flex flex-col gap-2 border-t border-lime-900/10 pt-2 dark:border-lime-300/10 sm:flex-row sm:items-center sm:justify-between">
                {inlineStatusLabel ? (
                  <div
                    id="knowledge-inquiry-status"
                    className="min-h-5 text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    {inlineStatusLabel}
                  </div>
                ) : (
                  <div id="knowledge-inquiry-status" className="sr-only">
                    {ui.idleStatus}
                  </div>
                )}

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

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mode
            </span>
            <div className="grid w-full grid-cols-2 gap-1 rounded-lg border border-lime-900/10 bg-white/48 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:border-lime-300/12 dark:bg-black/20 sm:w-auto sm:grid-cols-4">
              {RETRIEVAL_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "min-h-11 rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors sm:min-h-9",
                    retrievalMode === mode
                      ? "bg-lime-300 text-slate-950 shadow-[0_7px_18px_rgba(132,176,45,0.2)]"
                      : "text-muted-foreground hover:bg-lime-300/10 hover:text-foreground",
                  )}
                  aria-pressed={retrievalMode === mode}
                  onClick={() => {
                    setRetrievalMode(mode);
                    if (committedInquiry.trim()) runInquiry(committedInquiry, mode);
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <OSControl
                    type="button"
                    osSize="compact"
                    className="h-10 w-full min-w-0 justify-between gap-1.5 border-lime-900/10 bg-white/54 px-2.5 text-xs text-muted-foreground hover:border-lime-700/20 hover:bg-white/72 dark:border-lime-300/12 dark:bg-black/20 dark:hover:border-lime-300/22 dark:hover:bg-black/28 sm:h-8 sm:w-auto sm:justify-start"
                  />
                }
              >
                <span className="shrink-0">Scope</span>
                <span className="min-w-0 truncate text-foreground">{scopeLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Readable knowledge</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sourceChips.length > 0 ? (
                  sourceChips.map((chip) => {
                    const checked =
                      selectedSourceDomains.length > 0
                        ? selectedSourceDomains.includes(chip.domain)
                        : chip.active;
                    return (
                      <DropdownMenuCheckboxItem
                        key={chip.domain}
                        checked={checked}
                        disabled={!chip.removable}
                        onCheckedChange={(value) =>
                          updateSourceScope(chip.domain, Boolean(value))
                        }
                      >
                        <span className="truncate">{chip.label}</span>
                      </DropdownMenuCheckboxItem>
                    );
                  })
                ) : (
                  <div className="px-2 py-2 text-xs leading-5 text-muted-foreground">
                    Run retrieval to load readable knowledge scope.
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{ui.examplesLabel}</span>
            {ui.exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                className="min-h-11 w-full rounded-md border border-lime-900/10 bg-white/54 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-lime-700/25 hover:bg-lime-300/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 dark:border-lime-300/12 dark:bg-black/18 dark:hover:border-lime-300/25 sm:min-h-9 sm:w-auto"
                onClick={() => runInquiry(example)}
              >
                {example}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-1.5">
            <OSControl
              type="button"
              osSize="compact"
              className="w-full justify-center gap-1.5 sm:w-auto"
              disabled={!draftInquiry.trim() && !committedInquiry.trim()}
              onClick={saveCurrentRecipe}
            >
              <Save className="h-3.5 w-3.5" />
              {ui.saveRecipe}
            </OSControl>
            {retrievalRecipes.length > 0 ? (
              <>
                <span className="text-xs font-medium text-muted-foreground">
                  {ui.savedRecipes}
                </span>
                {retrievalRecipes.slice(0, 4).map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    className="min-h-11 max-w-full rounded-md border border-lime-900/10 bg-white/54 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-lime-700/25 hover:bg-lime-300/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 dark:border-lime-300/12 dark:bg-black/18 dark:hover:border-lime-300/25 sm:min-h-9"
                    onClick={() => applyRecipe(recipe)}
                    title={recipe.query}
                  >
                    <span className="block max-w-[220px] truncate">{recipe.name}</span>
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>

        {hasRetrievalActivity ? (
        <div className="min-w-0 border-t border-lime-900/10 bg-lime-950/[0.025] p-3 dark:border-lime-300/12 dark:bg-black/18 xl:border-l xl:border-t-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 shrink-0 text-lime-700 dark:text-lime-200" aria-hidden />
              <span className="truncate">
                {committedInquiry.trim()
                  ? ui.resultsHeading(activeResultCount)
                  : ui.resultsHeading(0)}
              </span>
            </p>
          </div>

          {sourceChips.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {sourceChips.slice(0, 8).map((chip) => (
                <span
                  key={chip.domain}
                  className="rounded-full border border-lime-900/10 bg-white/54 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:border-lime-300/12 dark:bg-black/18"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          {serverResults.length > 0 ? (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {ui.workflowsLabel}
              </span>
              {KNOWLEDGE_WORKFLOWS.map((workflow) => {
                const Icon = workflow.icon;
                return (
                  <OSControl
                    key={workflow.id}
                    type="button"
                    osSize="compact"
                    className="gap-1.5"
                    onClick={() =>
                      openAIPanel(workflow.prompt, retrievalRunId, { handoff: true })
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {workflowLabel(workflow.id, ui)}
                  </OSControl>
                );
              })}
            </div>
          ) : null}

          {pinnedResults.length > 0 ? (
            <PinnedSourcesStrip
              results={pinnedResults}
              ui={ui}
              onOpen={(result) => {
                if (result.knowledgeItemId) {
                  selectItem(result.knowledgeItemId);
                  return;
                }
                if (result.sourceUrl) {
                  window.open(result.sourceUrl, "_blank", "noopener,noreferrer");
                }
              }}
            />
          ) : null}

          {comparedResults.length >= 2 ? (
            <RetrievalCompareTray
              results={comparedResults}
              ui={ui}
              onClear={() => setCompareResultKeys([])}
              onCompare={() =>
                openAIPanel(
                  "Compare the selected knowledge. Summarize agreements, contradictions, unique points, and practical next steps. Cite every point.",
                  retrievalRunId,
                  { handoff: true },
                )
              }
            />
          ) : null}

          {visibleAgentState === "idle" && !committedInquiry.trim() ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-lime-900/15 bg-white/36 px-4 text-center text-sm leading-6 text-muted-foreground dark:border-lime-300/18 dark:bg-black/16">
              {ui.inputPlaceholder}
            </div>
          ) : serverResults.length > 0 ? (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {visibleServerResults.map((result) => (
                <RetrievalResultCard
                  key={`${result.id}:${result.sourceId}`}
                  result={result}
                  inquiry={committedInquiry}
                  ui={ui}
                  reduceMotion={Boolean(reduceMotion)}
                  isPinned={pinnedKeySet.has(resultStorageKey(result))}
                  isCompared={compareKeySet.has(resultStorageKey(result))}
                  onTogglePin={() => togglePinnedResult(result)}
                  onToggleCompare={() => toggleComparedResult(result)}
                  onOpen={() => {
                    if (result.knowledgeItemId) {
                      selectItem(result.knowledgeItemId);
                      return;
                    }
                    if (result.sourceUrl) {
                      window.open(result.sourceUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  onAskAi={() => openAIPanel(committedInquiry, retrievalRunId, { handoff: true })}
                  onApplyPrompt={
                    retrievalRunId
                      ? () => {
                          window.location.href = `/${language}/ai-knowledge?retrievalRunId=${encodeURIComponent(
                            retrievalRunId,
                          )}`;
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (visibleAgentState === "analyzing" || visibleAgentState === "matching" || visibleAgentState === "transcribing") && displayMatches.length > 0 ? (
            <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              <p className="rounded-md border border-lime-900/10 bg-white/48 px-2 py-1 text-[11px] text-muted-foreground dark:border-lime-300/12 dark:bg-black/20">
                {statusLabel(visibleAgentState, ui)}
              </p>
              {displayMatches.map((match) => (
                <InquiryResultCard
                  key={match.item.id}
                  match={match}
                  inquiry={committedInquiry}
                  ui={ui}
                  reduceMotion={Boolean(reduceMotion)}
                  onOpen={() => selectItem(match.item.id)}
                  onAskAi={() => openAIPanel(committedInquiry, retrievalRunId, { handoff: true })}
                />
              ))}
            </div>
          ) : visibleAgentState === "analyzing" || visibleAgentState === "matching" || visibleAgentState === "transcribing" ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-lime-900/15 bg-white/36 text-sm text-muted-foreground dark:border-lime-300/18 dark:bg-black/16">
              <Loader2 className="h-5 w-5 text-lime-700 motion-safe:animate-spin dark:text-lime-200" />
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
                  reduceMotion={Boolean(reduceMotion)}
                  onOpen={() => selectItem(match.item.id)}
                  onAskAi={() => openAIPanel(committedInquiry, retrievalRunId, { handoff: true })}
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-lime-900/15 bg-white/36 px-4 text-center dark:border-lime-300/18 dark:bg-black/16">
              <CheckCircle2 className="mb-3 h-5 w-5 text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-medium">{ui.noStrongMatchesTitle}</h3>
              <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
                {ui.noStrongMatchesDescription}
              </p>
              {retrievalWarnings.length > 0 ? (
                <p className="mt-2 max-w-xs text-[11px] leading-4 text-muted-foreground">
                  {retrievalWarnings[0]}
                </p>
              ) : null}
            </div>
          )}
        </div>
        ) : null}
      </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function RetrievalTriggerButton({
  ui,
  status,
  hasActivity,
  isOpen,
  reduceMotion,
  panelId,
  onToggle,
}: {
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  status: string;
  hasActivity: boolean;
  isOpen: boolean;
  reduceMotion: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  const {
    ref: commandLightRef,
    style: commandLightStyle,
    handlers: commandLightHandlers,
  } = useCommandLightInteraction(reduceMotion);

  return (
    <motion.button
      ref={commandLightRef}
      type="button"
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="knowledge-command-light-button knowledge-command-light-button--retrieve group relative flex min-h-[86px] w-full touch-pan-y isolate overflow-hidden rounded-xl border border-lime-300/55 bg-[linear-gradient(135deg,#fbfdf5_0%,#eef7da_52%,#d9ebb1_100%)] p-3 text-left text-slate-900 shadow-[0_14px_34px_rgba(79,103,34,0.13)] outline-none transition-[border-color,box-shadow,filter] hover:border-lime-400/65 hover:shadow-[0_18px_42px_rgba(79,103,34,0.18)] focus-visible:ring-2 focus-visible:ring-lime-300/50 dark:border-lime-300/24 dark:bg-[linear-gradient(135deg,#10140b_0%,#1c2a10_52%,#4f661a_100%)] dark:text-lime-50 dark:shadow-[0_18px_44px_rgba(57,80,21,0.28)] dark:hover:border-lime-200/45 dark:hover:shadow-[0_20px_52px_rgba(69,96,24,0.36)] sm:p-3.5"
      style={commandLightStyle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={onToggle}
      {...commandLightHandlers}
    >
      <span
        className="knowledge-command-light-aurora"
        data-high-stimulus="true"
        data-reduced-during-focus="true"
        aria-hidden
      />
      <span
        className="knowledge-command-light-cursor"
        data-high-stimulus="true"
        data-reduced-during-focus="true"
        aria-hidden
      />
      <span className="relative z-10 flex w-full min-w-0 items-start">
        <span className="flex min-w-0 items-start gap-3 pr-20 sm:pr-36">
          <span className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-lime-300/60 bg-white/72 shadow-inner dark:border-lime-200/20 dark:bg-black/28">
            <Image
              src="/images/knowledge/source-retrieval-mark.png"
              alt=""
              width={88}
              height={88}
              className="h-full w-full object-cover"
              aria-hidden
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-lime-700/85 dark:text-lime-100/70">
              {ui.eyebrow}
            </span>
            <span className="mt-0.5 block text-base font-semibold leading-tight text-slate-950 dark:text-lime-50">
              {ui.openRetrieval}
            </span>
            <span className="mt-1 block max-w-2xl text-xs leading-5 text-slate-600 dark:text-lime-50/75 sm:text-sm">
              {hasActivity
                ? `${status}. ${ui.openRetrievalDescription}`
                : ui.openRetrievalDescription}
            </span>
          </span>
        </span>
        <span className="absolute right-0 top-0 inline-flex h-8 max-w-[46%] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-lime-300/60 bg-white/70 px-2.5 text-[11px] font-semibold text-lime-800 shadow-sm dark:border-lime-200/25 dark:bg-black/20 dark:text-lime-50/90 sm:h-9 sm:px-3 sm:text-xs">
          <span className="truncate">{isOpen ? ui.collapseRetrieval : status}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 opacity-75 transition-transform duration-300",
              isOpen ? "rotate-180" : "-rotate-90",
            )}
            aria-hidden
          />
        </span>
      </span>
    </motion.button>
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
          ? "border-lime-500/30 bg-lime-300/15 text-lime-700 dark:border-lime-300/28 dark:text-lime-200"
          : isError
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
            : "border-lime-900/10 bg-white/58 text-muted-foreground dark:border-lime-300/12 dark:bg-black/20",
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isBusy
            ? "bg-lime-600 motion-safe:animate-pulse dark:bg-lime-300"
            : isDone
              ? "bg-lime-600 dark:bg-lime-300"
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

function PinnedSourcesStrip({
  results,
  ui,
  onOpen,
}: {
  results: RetrievalResult[];
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  onOpen: (result: RetrievalResult) => void;
}) {
  return (
    <div className="mb-2 rounded-lg border border-lime-500/20 bg-lime-300/[0.06] p-2 dark:border-lime-300/16 dark:bg-lime-300/[0.04]">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-lime-700 dark:text-lime-200">
        <Pin className="h-3.5 w-3.5" />
        {ui.pinnedSources}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {results.slice(0, 6).map((result) => (
          <button
            key={`${result.id}:${result.sourceId}`}
            type="button"
            className="min-w-[180px] max-w-[240px] rounded-md border border-lime-900/10 bg-white/64 px-2.5 py-2 text-left transition-colors hover:border-lime-600/30 dark:border-lime-300/12 dark:bg-black/22 dark:hover:border-lime-300/28"
            onClick={() => onOpen(result)}
          >
            <span className="block truncate text-xs font-medium">{result.title}</span>
            <span className="mt-1 block truncate text-[10px] capitalize text-muted-foreground">
              {result.sourceDomain.replace(/_/g, " ")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RetrievalCompareTray({
  results,
  ui,
  onClear,
  onCompare,
}: {
  results: RetrievalResult[];
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  onClear: () => void;
  onCompare: () => void;
}) {
  return (
    <div className="mb-2 rounded-lg border border-lime-900/10 bg-white/56 p-3 dark:border-lime-300/12 dark:bg-black/20">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <GitCompareArrows className="h-3.5 w-3.5 text-lime-700 dark:text-lime-200" />
            {ui.compareTrayTitle}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            {ui.compareTrayDescription}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <OSControl type="button" osSize="compact" onClick={onClear}>
            {ui.clearCompare}
          </OSControl>
          <OSPrimaryAction type="button" osSize="compact" className="gap-1.5" onClick={onCompare}>
            <Sparkles className="h-3.5 w-3.5" />
            {ui.compareWithSources}
          </OSPrimaryAction>
        </div>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {results.slice(0, 4).map((result) => (
          <div
            key={`${result.id}:${result.sourceId}`}
            className="rounded-md border border-lime-900/10 bg-lime-950/[0.035] px-2.5 py-2 dark:border-lime-300/10 dark:bg-lime-300/[0.035]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium">{result.title}</span>
              <span className="shrink-0 text-[10px] font-semibold text-lime-700 dark:text-lime-200">
                {Math.round(result.scores.combined * 100)}%
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
              {result.snippet || result.bodyPreview}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetrievalResultCard({
  result,
  inquiry,
  ui,
  reduceMotion,
  isPinned,
  isCompared,
  onTogglePin,
  onToggleCompare,
  onOpen,
  onAskAi,
  onApplyPrompt,
}: {
  result: RetrievalResult;
  inquiry: string;
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  reduceMotion: boolean;
  isPinned: boolean;
  isCompared: boolean;
  onTogglePin: () => void;
  onToggleCompare: () => void;
  onOpen: () => void;
  onAskAi: () => void;
  onApplyPrompt?: () => void;
}) {
  const score = Math.round(result.scores.combined * 100);
  const sourceLabel = result.sourceDomain.replace(/_/g, " ");
  const visibleTags = result.tags.slice(0, 3);

  const copyPrompt = async () => {
    const prompt = [
      "Use this retrieved knowledge to help answer my inquiry.",
      "",
      `Inquiry: ${inquiry}`,
      `Knowledge ${result.id}: ${result.title}`,
      `Source: ${result.sourceDomain}`,
      result.pageNumber != null ? `Page: ${result.pageNumber}` : null,
      result.sectionPath ? `Section: ${result.sectionPath}` : null,
      `Excerpt: ${result.snippet}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success(ui.promptCopied);
    } catch {
      toast.message(prompt);
    }
  };

  return (
    <motion.article
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-lime-900/10 bg-white/68 p-3 shadow-[0_10px_28px_rgba(63,82,28,0.08)] dark:border-lime-300/10 dark:bg-[#10150d]/72 dark:shadow-[0_12px_34px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-lime-900/10 bg-lime-950/[0.035] px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground dark:border-lime-300/10 dark:bg-lime-300/[0.035]">
              {sourceLabel}
            </span>
            <span className="rounded-md bg-lime-300/15 px-1.5 py-0.5 text-[10px] font-semibold text-lime-700 dark:text-lime-200">
              {result.documentKind.replace(/_/g, " ")}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {result.title}
          </h3>
        </div>
        <span className="shrink-0 tabular-nums text-xs font-semibold text-lime-700 dark:text-lime-200">
          {score}%
        </span>
      </div>

      {result.snippet ? (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
          {result.snippet}
        </p>
      ) : null}

      <div className="mt-2 space-y-1.5">
        <p className="text-[11px] font-medium text-foreground">{ui.whyThisMatches}</p>
        {result.whyMatched.slice(0, 3).map((reason) => (
          <p key={reason} className="text-xs leading-5 text-muted-foreground">
            {reason}
          </p>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {result.pageNumber != null ? (
          <span className="rounded-md border border-lime-900/10 bg-lime-950/[0.035] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-lime-300/10 dark:bg-lime-300/[0.035]">
            page {result.pageNumber}
          </span>
        ) : null}
        {result.sectionPath ? (
          <span className="rounded-md border border-lime-900/10 bg-lime-950/[0.035] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-lime-300/10 dark:bg-lime-300/[0.035]">
            {result.sectionPath}
          </span>
        ) : null}
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-lime-900/10 bg-white/54 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-lime-300/10 dark:bg-black/18"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <OSControl
          type="button"
          osSize="compact"
          onClick={onTogglePin}
          className={cn("gap-1.5", isPinned && "border-lime-500/35 text-lime-700 dark:border-lime-300/28 dark:text-lime-200")}
        >
          {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          {isPinned ? ui.unpinSource : ui.pinSource}
        </OSControl>
        <OSControl
          type="button"
          osSize="compact"
          onClick={onToggleCompare}
          className={cn("gap-1.5", isCompared && "border-lime-500/35 text-lime-700 dark:border-lime-300/28 dark:text-lime-200")}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {isCompared ? ui.removeCompareSource : ui.compareSource}
        </OSControl>
        <OSControl type="button" osSize="compact" onClick={copyPrompt} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          {ui.copyPrompt}
        </OSControl>
        <OSControl type="button" osSize="compact" onClick={onAskAi} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {ui.askAi}
        </OSControl>
        {onApplyPrompt ? (
          <OSControl type="button" osSize="compact" onClick={onApplyPrompt} className="gap-1.5">
            <Bot className="h-3.5 w-3.5" />
            {ui.applyPrompt}
          </OSControl>
        ) : null}
        <OSPrimaryAction type="button" osSize="compact" onClick={onOpen}>
          {ui.openItem}
        </OSPrimaryAction>
      </div>
    </motion.article>
  );
}

function InquiryResultCard({
  match,
  inquiry,
  ui,
  reduceMotion,
  onOpen,
  onAskAi,
}: {
  match: KnowledgeMatchResult;
  inquiry: string;
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  reduceMotion: boolean;
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
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="rounded-lg border border-lime-900/10 bg-white/68 p-3 shadow-[0_10px_28px_rgba(63,82,28,0.08)] dark:border-lime-300/10 dark:bg-[#10150d]/72 dark:shadow-[0_12px_34px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-lime-900/10 bg-lime-950/[0.035] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground dark:border-lime-300/10 dark:bg-lime-300/[0.035]">
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
        <span className="shrink-0 tabular-nums text-xs font-semibold text-lime-700 dark:text-lime-200">
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
            className="rounded-md border border-lime-500/20 bg-lime-300/12 px-1.5 py-0.5 text-[10px] text-lime-700 dark:text-lime-200"
            title={ui.matchedConcepts}
          >
            {concept}
          </span>
        ))}
        {match.matchedKeywords.slice(0, Math.max(0, 4 - match.matchedConcepts.length)).map((keyword) => (
          <span
            key={keyword}
            className="rounded-md border border-lime-900/10 bg-lime-950/[0.035] px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-lime-300/10 dark:bg-lime-300/[0.035]"
            title={ui.matchedKeywords}
          >
            {keyword}
          </span>
        ))}
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-lime-900/10 bg-white/54 px-1.5 py-0.5 text-[10px] text-muted-foreground dark:border-lime-300/10 dark:bg-black/18"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 rounded-md bg-lime-950/[0.035] px-2 py-1.5 text-[11px] leading-5 text-muted-foreground dark:bg-lime-300/[0.035]">
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
