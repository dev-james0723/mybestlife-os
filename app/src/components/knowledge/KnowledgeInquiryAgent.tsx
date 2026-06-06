"use client";

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

type EvidenceWorkflowId = "changed" | "contradictions" | "tasks" | "study-pack";

const EVIDENCE_WORKFLOWS: Array<{
  id: EvidenceWorkflowId;
  icon: LucideIcon;
  prompt: string;
}> = [
  {
    id: "changed",
    icon: Clock3,
    prompt:
      "Using the current retrieved evidence, answer: what changed since last week? If the evidence does not include dates, say so clearly. Cite each claim and call out uncertainty.",
  },
  {
    id: "contradictions",
    icon: AlertTriangle,
    prompt:
      "Using the current retrieved evidence, find contradictions, tensions, or disagreements. Separate strong contradictions from weak tension and cite every point.",
  },
  {
    id: "tasks",
    icon: ListChecks,
    prompt:
      "Using the current retrieved evidence, turn the useful findings into a practical task or project plan with owners, priorities, and source citations.",
  },
  {
    id: "study-pack",
    icon: GraduationCap,
    prompt:
      "Using the current retrieved evidence, build a compact study pack with key ideas, source-backed notes, recall questions, and citations.",
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
  workflow: EvidenceWorkflowId,
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
      setSearchQuery,
      setSortBy,
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
    [clearTimers, runInquiry, setAgentStateValue],
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
  }, []);

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

  const openRetrievalPanel = useCallback(() => {
    setIsRetrievalOpen(true);
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      window.document.getElementById("knowledge-inquiry-input")?.focus();
    });
  }, []);

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
      : "All readable sources";
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

  const runEvidenceWorkflow = (workflow: EvidenceWorkflowId) => {
    const config = EVIDENCE_WORKFLOWS.find((entry) => entry.id === workflow);
    openAIPanel(config?.prompt ?? committedInquiry, retrievalRunId);
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
      <AnimatePresence initial={false} mode="wait">
        {!isRetrievalOpen ? (
          <RetrievalTriggerButton
            key="retrieval-trigger"
            ui={ui}
            status={collapsedStatus}
            hasActivity={hasRetrievalActivity}
            reduceMotion={Boolean(reduceMotion)}
            panelId={RETRIEVAL_PANEL_ID}
            onOpen={openRetrievalPanel}
          />
        ) : (
          <motion.div
            key="retrieval-panel"
            id={RETRIEVAL_PANEL_ID}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="rounded-xl border border-border/70 bg-card/70 shadow-sm"
            aria-labelledby="knowledge-inquiry-agent-title"
          >
            <div
              className={cn(
                "grid gap-4 p-4 max-[480px]:pb-24 sm:p-5",
                hasRetrievalActivity
                  ? "xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.72fr)]"
                  : "xl:grid-cols-1",
              )}
            >
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

          <div className="flex flex-wrap items-center gap-2 max-[480px]:pr-20">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mode
            </span>
            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-background/60 p-1">
              {RETRIEVAL_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "min-h-11 rounded-md px-3 py-2 text-xs font-medium capitalize transition-colors sm:min-h-9",
                    retrievalMode === mode
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
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
                    className="h-8 gap-1.5 border-border/60 bg-background/70 px-2.5 text-xs text-muted-foreground max-[480px]:ml-10 max-[480px]:max-w-[calc(100%-5rem)]"
                  />
                }
              >
                Scope
                <span className="text-foreground">{scopeLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Readable sources</DropdownMenuLabel>
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
                    Run a retrieval to load readable source scope.
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 max-[480px]:pl-10 max-[480px]:pr-20">
            <span className="text-xs font-medium text-muted-foreground">{ui.examplesLabel}</span>
            {ui.exampleQueries.map((example) => (
              <button
                key={example}
                type="button"
                className="min-h-11 rounded-md border border-border/60 bg-background/70 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-9"
                onClick={() => runInquiry(example)}
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 max-[480px]:pr-20">
            <OSControl
              type="button"
              osSize="compact"
              className="gap-1.5"
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
                    className="min-h-11 max-w-full rounded-md border border-border/60 bg-background/70 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:min-h-9"
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
        <div className="min-w-0 border-t border-border/60 bg-muted/15 p-3 xl:border-l xl:border-t-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
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
                  className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
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
              {EVIDENCE_WORKFLOWS.map((workflow) => {
                const Icon = workflow.icon;
                return (
                  <OSControl
                    key={workflow.id}
                    type="button"
                    osSize="compact"
                    className="gap-1.5"
                    onClick={() => runEvidenceWorkflow(workflow.id)}
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
                  "Compare the selected Ask Your KB sources. Summarize agreements, contradictions, unique evidence, and practical next steps. Cite every point.",
                  retrievalRunId,
                )
              }
            />
          ) : null}

          {visibleAgentState === "idle" && !committedInquiry.trim() ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/40 px-4 text-center text-sm leading-6 text-muted-foreground">
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
                  onAskAi={() => openAIPanel(committedInquiry, retrievalRunId)}
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
              <p className="rounded-md border border-border/60 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground">
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
                  onAskAi={() => openAIPanel(committedInquiry)}
                />
              ))}
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
                  reduceMotion={Boolean(reduceMotion)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function RetrievalTriggerButton({
  ui,
  status,
  hasActivity,
  reduceMotion,
  panelId,
  onOpen,
}: {
  ui: ReturnType<typeof getKnowledgeUiCopy>["inquiryAgent"];
  status: string;
  hasActivity: boolean;
  reduceMotion: boolean;
  panelId: string;
  onOpen: () => void;
}) {
  const sparkles = [
    { top: "20%", right: "15%", delay: 0 },
    { top: "58%", right: "7%", delay: 0.55 },
    { top: "36%", right: "27%", delay: 1.05 },
  ];

  return (
    <motion.button
      type="button"
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      whileHover={reduceMotion ? undefined : { y: -1 }}
      whileTap={reduceMotion ? undefined : { scale: 0.995 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group relative flex min-h-[76px] w-full overflow-hidden rounded-xl border border-amber-300/25 bg-[linear-gradient(135deg,#1b1206_0%,#3f2b0c_52%,#7b5517_100%)] p-3 text-left text-amber-50 shadow-[0_18px_44px_rgba(83,52,12,0.26)] outline-none transition-[border-color,box-shadow,filter] hover:border-amber-200/45 hover:shadow-[0_20px_52px_rgba(83,52,12,0.34)] focus-visible:ring-2 focus-visible:ring-amber-300/45 sm:p-3.5"
      aria-expanded="false"
      aria-controls={panelId}
      onClick={onOpen}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,229,156,0.18),transparent_28%),linear-gradient(90deg,transparent,rgba(255,222,144,0.12),transparent)] opacity-75 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
      {!reduceMotion ? (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          {sparkles.map((sparkle) => (
            <motion.span
              key={`${sparkle.top}-${sparkle.right}`}
              className="absolute h-1.5 w-1.5 rounded-full bg-amber-200/90 shadow-[0_0_14px_rgba(252,211,77,0.9)]"
              style={{ top: sparkle.top, right: sparkle.right }}
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.75, 1.35, 0.75] }}
              transition={{
                duration: 1.9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: sparkle.delay,
              }}
            />
          ))}
        </span>
      ) : null}
      <span className="relative z-10 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/20 bg-black/25 text-amber-200 shadow-inner">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-amber-100/70">
              {ui.eyebrow}
            </span>
            <span className="mt-0.5 block text-base font-semibold leading-tight text-amber-50">
              {ui.openRetrieval}
            </span>
            <span className="mt-1 block max-w-2xl text-xs leading-5 text-amber-50/75 sm:text-sm">
              {hasActivity
                ? `${status}. ${ui.openRetrievalDescription}`
                : ui.openRetrievalDescription}
            </span>
          </span>
        </span>
        <span className="inline-flex h-9 max-w-full shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-amber-200/25 bg-black/20 px-3 text-xs font-semibold text-amber-50/90 sm:self-center">
          <span className="truncate">{status}</span>
          <ChevronDown className="h-3.5 w-3.5 -rotate-90 opacity-75" aria-hidden />
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
          ? "border-primary/25 bg-primary/10 text-primary"
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
              ? "bg-primary"
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
    <div className="mb-2 rounded-lg border border-amber-300/20 bg-amber-950/10 p-2 dark:bg-amber-300/[0.04]">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-200">
        <Pin className="h-3.5 w-3.5" />
        {ui.pinnedSources}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {results.slice(0, 6).map((result) => (
          <button
            key={`${result.id}:${result.sourceId}`}
            type="button"
            className="min-w-[180px] max-w-[240px] rounded-md border border-border/60 bg-background/75 px-2.5 py-2 text-left transition-colors hover:border-amber-300/40"
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
    <div className="mb-2 rounded-lg border border-border/70 bg-background/65 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <GitCompareArrows className="h-3.5 w-3.5 text-primary" />
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
            className="rounded-md border border-border/60 bg-muted/25 px-2.5 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium">{result.title}</span>
              <span className="shrink-0 text-[10px] font-semibold text-primary">
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
      "Use this Ask Your KB evidence to help answer my inquiry.",
      "",
      `Inquiry: ${inquiry}`,
      `Evidence ${result.id}: ${result.title}`,
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
      className="rounded-lg border border-border/70 bg-background/85 p-3 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-border/60 bg-muted/35 px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
              {sourceLabel}
            </span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {result.documentKind.replace(/_/g, " ")}
            </span>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
            {result.title}
          </h3>
        </div>
        <span className="shrink-0 tabular-nums text-xs font-semibold text-primary">
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
          <span className="rounded-md border border-border/60 bg-muted/35 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            page {result.pageNumber}
          </span>
        ) : null}
        {result.sectionPath ? (
          <span className="rounded-md border border-border/60 bg-muted/35 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {result.sectionPath}
          </span>
        ) : null}
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-border/50 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
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
          className={cn("gap-1.5", isPinned && "border-amber-300/40 text-amber-700 dark:text-amber-200")}
        >
          {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          {isPinned ? ui.unpinSource : ui.pinSource}
        </OSControl>
        <OSControl
          type="button"
          osSize="compact"
          onClick={onToggleCompare}
          className={cn("gap-1.5", isCompared && "border-primary/35 text-primary")}
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
            className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
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
