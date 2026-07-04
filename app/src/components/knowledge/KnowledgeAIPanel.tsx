"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  X,
  Send,
  ArrowRight,
  Trash2,
  Copy,
  ExternalLink,
  BookOpen,
  Search,
  BrainCircuit,
  FolderKanban,
  History,
  Layers3,
  MessageSquarePlus,
  Route,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import type { KnowledgeItem } from "@/types/knowledge";
import { friendlyAuthError } from "@/lib/knowledge/auth-error-copy";
import { getKnowledgeDisplayContentType } from "@/lib/knowledge/display-content-type";
import type { RetrievalCitation, RetrievalResult } from "@/lib/retrieval/types";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  retrievalRunId?: string | null;
  citations?: RetrievalCitation[];
  sources?: RetrievalResult[];
  warnings?: string[];
};

function storageKey(userId: string) {
  return `mylifeos.kb-assistant.v1:${userId}`;
}

function loadStoredMessages(userId: string): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: Message[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      if (
        typeof o.id === "string" &&
        (o.role === "user" || o.role === "assistant") &&
        typeof o.content === "string"
      ) {
        out.push({
          id: o.id,
          role: o.role,
          content: o.content,
          retrievalRunId:
            typeof o.retrievalRunId === "string" ? o.retrievalRunId : null,
          citations: Array.isArray(o.citations)
            ? (o.citations as RetrievalCitation[])
            : [],
          sources: Array.isArray(o.sources) ? (o.sources as RetrievalResult[]) : [],
          warnings: Array.isArray(o.warnings)
            ? o.warnings.filter((x): x is string => typeof x === "string")
            : [],
        });
      }
    }
    return out.slice(-80);
  } catch {
    return [];
  }
}

function saveMessages(userId: string, messages: Message[]) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(messages.slice(-80)));
  } catch {
    /* ignore quota */
  }
}

function itemSearchBlob(item: KnowledgeItem): string {
  return [
    item.title,
    item.aiSummary,
    item.aiTldr,
    item.sourceUrl,
    item.sourceDomain,
    ...item.aiTags,
    ...item.manualTags,
    ...item.aiKeyInsights,
    ...item.aiKeyQuotes,
    ...item.aiQuestionsAnswered,
    ...item.aiActionItems,
    (item.rawContent ?? "").slice(0, 24000),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function buildLocalFallbackReply(
  q: string,
  items: KnowledgeItem[],
  ui: ReturnType<typeof getKnowledgeUiCopy>["aiPanel"],
  knowledgeUi: ReturnType<typeof getKnowledgeUiCopy>,
): string {
  const lower = q.toLowerCase();
  const matches = items.filter((i) => {
    const blob = itemSearchBlob(i);
    return lower.split(/\s+/).some((w) => w.length >= 2 && blob.includes(w.toLowerCase()));
  });

  if (lower.includes("recent") || lower.includes("this week") || /最近|本週|這週|本周/.test(q)) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const inWeek = items.filter((i) => new Date(i.dateAdded).getTime() > weekAgo);
    if (inWeek.length > 0) {
      return ui.recentItems(
        inWeek
          .slice(0, 8)
          .map(
            (i) =>
              `• **${i.title}** (${knowledgeUi.typeLabels[i.contentType]})${
                i.aiSummary ? ` — ${i.aiSummary.slice(0, 100)}${i.aiSummary.length > 100 ? "…" : ""}` : ""
              }`,
          )
          .join("\n"),
      );
    }
    return ui.noRecentItems;
  }

  if (lower.includes("connection") || lower.includes("related") || /關聯|連結/.test(q)) {
    const withConnections = items.filter((i) => i.connections && i.connections.length > 0);
    if (withConnections.length > 0) {
      return ui.connectionsFound(
        withConnections.length,
        withConnections
          .slice(0, 6)
          .map((i) => `• **${i.title}** — ${knowledgeUi.connectionsCount(i.connections!.length)}`)
          .join("\n"),
      );
    }
    return ui.noConnectionsFound;
  }

  if (lower.includes("summarize") || lower.includes("summary") || /摘要|總結|整理/.test(q)) {
    const notes = items.filter((i) => i.contentType === "note" || (i.aiSummary && i.aiSummary.length > 20));
    if (notes.length > 0) {
      return ui.summariesFound(
        notes.length,
        notes
          .slice(0, 8)
          .map((i) => {
            const body = i.aiSummary ?? i.aiTldr ?? (i.rawContent ?? "").slice(0, 160);
            return `• **${i.title}**: ${body}${body.length >= 160 ? "…" : ""}`;
          })
          .join("\n"),
      );
    }
    return ui.noSummariesFound;
  }

  if (matches.length > 0) {
    return ui.matchesFound(
      matches.length,
      matches
        .slice(0, 8)
        .map(
          (i) =>
            `• **${i.title}** (${knowledgeUi.typeLabels[i.contentType]})${
              i.aiSummary ? ` — ${i.aiSummary.slice(0, 90)}${i.aiSummary.length > 90 ? "…" : ""}` : ""
            }`,
        )
        .join("\n"),
      Math.max(matches.length - 8, 0),
    );
  }

  return ui.noMatchesFound(q);
}

function isConnectedContextSource(source: RetrievalResult): boolean {
  return source.sourceDomain !== "knowledge" && source.sourceDomain !== "doc_oracle";
}

function getScrollViewport(root: HTMLDivElement | null): HTMLElement | null {
  return (
    root?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport], [data-slot="scroll-area-viewport"]',
    ) ?? root
  );
}

interface KnowledgeAIPanelProps {
  userId: string;
  layout?: "drawer" | "top";
  hideHeader?: boolean;
}

type RetrieveResponse = {
  retrievalRunId?: string | null;
  results?: RetrievalResult[];
  warnings?: string[];
};

type AssistantResponse = {
  reply?: string;
  retrievalRunId?: string | null;
  citations?: RetrievalCitation[];
  sources?: RetrievalResult[];
  warnings?: string[];
  error?: string;
  reason?: string;
  detail?: string;
};

export function KnowledgeAIPanel({ userId, layout = "drawer", hideHeader = false }: KnowledgeAIPanelProps) {
  const isTopLayout = layout === "top";
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language).aiPanel;
  const knowledgeUi = getKnowledgeUiCopy(language);
  const closeAIPanel = useKnowledgeStore((s) => s.closeAIPanel);
  const aiPanelQuery = useKnowledgeStore((s) => s.aiPanelQuery);
  const aiPanelRetrievalRunId = useKnowledgeStore((s) => s.aiPanelRetrievalRunId);
  const aiPanelHandoffId = useKnowledgeStore((s) => s.aiPanelHandoffId);
  const aiPanelHandoffQuery = useKnowledgeStore((s) => s.aiPanelHandoffQuery);
  const items = useKnowledgeStore((s) => s.items);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const selectItem = useKnowledgeStore((s) => s.selectItem);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState(
    aiPanelHandoffQuery?.trim() ? "" : aiPanelQuery,
  );
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const lastHandledHandoffRef = useRef(0);
  const [isTypingHandoff, setIsTypingHandoff] = useState(false);
  const [sendHintActive, setSendHintActive] = useState(false);
  const recentUserMessages = useMemo(
    () => messages.filter((msg) => msg.role === "user").slice(-6).reverse(),
    [messages],
  );
  const recentKnowledgeItems = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
        .slice(0, 4),
    [items],
  );
  const sourceDomainCount = useMemo(
    () => new Set(items.map((item) => item.sourceDomain).filter(Boolean)).size,
    [items],
  );
  const knowledgeReadyCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.aiSummary ||
          item.aiTldr ||
          item.aiKeyInsights.length > 0 ||
          item.rawContent,
      ).length,
    [items],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setMessages(loadStoredMessages(userId));
      setHydrated(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(userId, messages);
  }, [hydrated, userId, messages]);

  useEffect(() => {
    if (aiPanelQuery && messages.length === 0 && !isTypingHandoff && !aiPanelHandoffQuery) {
      queueMicrotask(() => setInput(aiPanelQuery));
    }
  }, [aiPanelHandoffQuery, aiPanelQuery, isTypingHandoff, messages.length]);

  useEffect(() => {
    const viewport = getScrollViewport(scrollRef.current);
    viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    try {
      window.localStorage.removeItem(storageKey(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const prompt = (aiPanelHandoffQuery ?? aiPanelQuery).trim();
    if (!prompt || aiPanelHandoffId === 0 || lastHandledHandoffRef.current === aiPanelHandoffId) {
      return;
    }

    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    setSendHintActive(false);
    setIsTypingHandoff(true);

    const bootstrapTimer = window.setTimeout(() => {
      lastHandledHandoffRef.current = aiPanelHandoffId;
      clearConversation();
      setInput("");
      const viewport = getScrollViewport(scrollRef.current);
      viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus({ preventScroll: true });

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (prefersReducedMotion) {
        setInput(prompt);
        setIsTypingHandoff(false);
        setSendHintActive(true);
        inputRef.current?.focus({ preventScroll: true });
        return;
      }

      let index = 0;
      const stepSize = Math.max(2, Math.ceil(prompt.length / 72));
      const typeNext = () => {
        index = Math.min(prompt.length, index + stepSize);
        setInput(prompt.slice(0, index));
        if (index < prompt.length) {
          typingTimerRef.current = window.setTimeout(typeNext, 18);
          return;
        }
        setIsTypingHandoff(false);
        setSendHintActive(true);
        inputRef.current?.focus({ preventScroll: true });
      };

      typingTimerRef.current = window.setTimeout(typeNext, 180);
    }, 0);

    return () => window.clearTimeout(bootstrapTimer);
  }, [aiPanelHandoffId, aiPanelHandoffQuery, aiPanelQuery, clearConversation]);

  const startNewConversation = useCallback(() => {
    clearConversation();
    setInput("");
    setIsTypingHandoff(false);
    setSendHintActive(false);
  }, [clearConversation]);

  const seedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    setSendHintActive(false);
  }, []);

  const seedCollectionPrompt = useCallback((name: string) => {
    setInput(`Focus this Ask My Knowledge Base answer on "${name}". `);
    setSendHintActive(false);
  }, []);

  const seedWorkflowPrompt = useCallback((workflow: string) => {
    setInput(workflow);
    setSendHintActive(false);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setSendHintActive(false);
  }, []);

  const workflowPrompts = useMemo(
    () => [
      {
        label: "Synthesize",
        description: "Turn related knowledge into one cited brief.",
        prompt:
          "Synthesize the most relevant saved knowledge into a concise brief. Group the answer by themes, cite the strongest knowledge, and call out uncertainty.",
      },
      {
        label: "Contradictions",
        description: "Find tension, disagreement, and weak support.",
        prompt:
          "Find contradictions, tensions, and weak support across my saved knowledge. Separate strong contradictions from softer disagreements and cite each point.",
      },
      {
        label: "Action plan",
        description: "Convert knowledge into next steps.",
        prompt:
          "Using my saved knowledge, turn the useful findings into a practical action plan with priorities, next steps, and source-backed rationale.",
      },
      {
        label: "Study pack",
        description: "Create notes and recall questions.",
        prompt:
          "Build a compact study pack from my saved knowledge with key ideas, source-backed notes, recall questions, and citations.",
      },
    ],
    [],
  );
  const showSendHint = sendHintActive && input.trim().length > 0 && !isThinking;
  const hasConversation = messages.length > 0;

  const handleSend = useCallback(
    async (query?: string) => {
      const q = (query || input).trim();
      if (!q) return;

      setSendHintActive(false);
      const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: q };
      const nextThread = [...messages, userMsg];
      setMessages(nextThread);
      setInput("");
      setIsThinking(true);

      const payload = {
        messages: nextThread.map(({ role, content }) => ({ role, content })),
        locale: language,
        referenceDateIso: new Date().toISOString(),
      };

      try {
        let retrievalRunId: string | null =
          aiPanelRetrievalRunId && q === aiPanelQuery ? aiPanelRetrievalRunId : null;
        let retrievalSources: RetrievalResult[] = [];
        let retrievalWarnings: string[] = [];

        const retrieveRes = retrievalRunId
          ? null
          : await fetch("/api/knowledge/retrieve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: q,
                mode: "hybrid",
                limit: 12,
                locale: language,
                referenceDateIso: payload.referenceDateIso,
              }),
            });

        if (retrieveRes?.status === 401) {
          const data = (await retrieveRes.json().catch(() => ({}))) as AssistantResponse;
          const friendly = friendlyAuthError(data, knowledgeUi.detail);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: friendly ?? data.detail ?? ui.genericError,
            },
          ]);
          setIsThinking(false);
          return;
        }

        if (retrieveRes?.ok) {
          const retrieveData = (await retrieveRes.json()) as RetrieveResponse;
          retrievalRunId = retrieveData.retrievalRunId ?? null;
          retrievalSources = retrieveData.results ?? [];
          retrievalWarnings = retrieveData.warnings ?? [];
        }

        const res = await fetch("/api/knowledge/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            retrievalRunId,
            mode: "hybrid",
            limit: 12,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as AssistantResponse;
          const reply = typeof data.reply === "string" ? data.reply : "";
          if (!reply) {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "assistant", content: ui.genericError },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: reply,
                retrievalRunId: data.retrievalRunId ?? retrievalRunId,
                citations: data.citations ?? [],
                sources: data.sources ?? retrievalSources,
                warnings: [...retrievalWarnings, ...(data.warnings ?? [])],
              },
            ]);
          }
          setIsThinking(false);
          return;
        }

        if (res.status === 503) {
          const local = buildLocalFallbackReply(q, items, ui, knowledgeUi);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: `${ui.assistantUnavailable}\n\n---\n\n${local}`,
            },
          ]);
          setIsThinking(false);
          return;
        }

        if (res.status === 401) {
          const data = (await res.json().catch(() => ({}))) as AssistantResponse;
          const friendly = friendlyAuthError(data, knowledgeUi.detail);
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: friendly ?? data.detail ?? ui.genericError,
            },
          ]);
          setIsThinking(false);
          return;
        }

        const local = buildLocalFallbackReply(q, items, ui, knowledgeUi);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `${ui.genericError}\n\n---\n\n${local}`,
          },
        ]);
      } catch {
        const local = buildLocalFallbackReply(q, items, ui, knowledgeUi);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `${ui.genericError}\n\n---\n\n${local}`,
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [
      aiPanelQuery,
      aiPanelRetrievalRunId,
      input,
      items,
      knowledgeUi,
      language,
      messages,
      ui,
    ],
  );

  const emptyState = (
    <div className="space-y-4">
      <div className="py-6 text-center">
        <div className="mx-auto mb-3 h-12 w-12 overflow-hidden rounded-xl">
          <Image
            src="/images/knowledge/ask-my-kb-mark.png"
            alt="Ask My Knowledge Base knowledge core mark"
            width={96}
            height={96}
            className="h-full w-full object-cover"
          />
        </div>
        <h3 className="mb-1 text-sm font-medium">{ui.welcomeTitle}</h3>
        <p className="text-xs text-muted-foreground">{ui.welcomeDescription}</p>
      </div>
      <div className="space-y-2">
        {ui.suggestedQueries.map((sq) => (
          <button
            key={sq}
            type="button"
            className="group flex w-full items-center justify-between rounded-lg border border-border/70 bg-muted/25 px-3 py-2 text-left text-xs shadow-sm transition-colors hover:bg-muted/50"
            onClick={() => handleSend(sq)}
            disabled={isThinking}
          >
            <span>{sq}</span>
            <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );

  const messageList = (
    <div className={cn("min-w-0 space-y-3", isTopLayout && "mx-auto w-full max-w-4xl px-0 py-4 sm:px-1")}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "min-w-0 break-words rounded-lg px-3 py-2 text-sm",
            isTopLayout &&
              "max-w-[min(860px,92%)] rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
            msg.role === "user"
              ? "ml-auto max-w-[88%] bg-primary text-primary-foreground"
              : "max-w-[88%] bg-muted",
            isTopLayout &&
              msg.role === "user" &&
              "max-w-[calc(100%-2.25rem)] border-cyan-200/30 bg-cyan-300 text-slate-950 shadow-[0_12px_32px_rgba(103,232,249,0.16)] sm:max-w-[min(680px,82%)]",
            isTopLayout &&
              msg.role === "assistant" &&
              "w-full max-w-full overflow-hidden bg-white/[0.055] text-foreground sm:max-w-[min(860px,92%)]",
          )}
        >
          {msg.role === "user" ? (
            <div className="min-w-0 max-w-full whitespace-pre-wrap break-words">{msg.content}</div>
          ) : (
            <div className="min-w-0 max-w-full space-y-3">
              <div className="flex min-w-0 max-w-full gap-2">
                {isTopLayout ? (
                  <div className="mt-0.5 h-5 w-5 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                    <Image
                      src="/images/knowledge/ask-my-kb-mark.png"
                      alt="Ask My Knowledge Base knowledge core mark"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <Sparkles className="mt-1 h-3 w-3 shrink-0 text-primary" />
                )}
                <div className="min-w-0 max-w-full flex-1 overflow-hidden space-y-2 text-sm leading-relaxed [&_a]:underline [&_code]:break-words [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:list-disc">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className={cn("space-y-1.5", isTopLayout && "grid min-w-0 max-w-full grid-cols-1 gap-1.5 space-y-0 sm:grid-cols-2")}>
                  {msg.citations.slice(0, 4).map((citation) => (
                    <div
                      key={`${msg.id}:${citation.resultId}:${citation.quote ?? ""}`}
                      className="min-w-0 max-w-full overflow-hidden rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-[11px] leading-snug"
                    >
                      <div className="flex min-w-0 items-center gap-1.5 font-medium">
                        <BookOpen className="h-3 w-3 text-primary" />
                        <span className="shrink-0">{citation.resultId}</span>
                        <span className="truncate text-muted-foreground">
                          {citation.title}
                        </span>
                      </div>
                      {citation.quote && (
                        <p className="mt-1 text-muted-foreground">
                          {citation.quote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {msg.sources && msg.sources.length > 0 && (
                <div className={cn("space-y-1.5", isTopLayout && "grid min-w-0 max-w-full grid-cols-1 gap-1.5 space-y-0 sm:grid-cols-2 md:grid-cols-3")}>
                  {msg.sources.some(isConnectedContextSource) ? (
                    <div className={cn("min-w-0 max-w-full overflow-hidden rounded-md border border-primary/20 bg-primary/10 px-2.5 py-2 text-[11px] leading-snug", isTopLayout && "sm:col-span-2 md:col-span-3")}>
                      <div className="flex items-center gap-1.5 font-medium text-primary">
                        <Search className="h-3 w-3" />
                        {ui.connectedContextTitle}
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {ui.connectedContextDescription}
                      </p>
                    </div>
                  ) : null}
                  {msg.sources.slice(0, 3).map((source) => (
                    <div
                      key={`${msg.id}:${source.id}:${source.sourceId}`}
                      className="min-w-0 max-w-full overflow-hidden rounded-md border border-border/60 bg-background/60 px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium">
                            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
                              {source.id}
                            </span>
                            <span className="truncate">{source.title}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                            {source.snippet}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 shrink-0 p-0"
                          aria-label="Open source"
                          onClick={() => {
                            if (source.knowledgeItemId) {
                              selectItem(source.knowledgeItemId);
                              return;
                            }
                            if (source.sourceUrl) {
                              window.open(source.sourceUrl, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => void navigator.clipboard?.writeText(msg.content)}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
                {msg.retrievalRunId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => {
                      window.location.href = `/${language}/ai-knowledge?retrievalRunId=${encodeURIComponent(
                        msg.retrievalRunId ?? "",
                      )}`;
                    }}
                  >
                    <Search className="mr-1 h-3 w-3" />
                    AI Knowledge
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      {isThinking && (
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isTopLayout && "mx-auto max-w-4xl px-1",
          )}
        >
          <Sparkles className="h-3 w-3 animate-pulse text-primary" />
          {ui.thinking}
        </div>
      )}
    </div>
  );

  const topEmptyState = (
    <div className="flex min-h-[340px] flex-1 flex-col items-center justify-center px-4 py-7 text-center sm:min-h-[360px] sm:py-8">
      <div className="mb-6 h-16 w-16 overflow-hidden rounded-2xl border border-cyan-200/20 bg-cyan-300/10 shadow-[0_18px_46px_rgba(103,232,249,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <Image
          src="/images/knowledge/ask-my-kb-mark.png"
          alt="Ask My Knowledge Base knowledge core mark"
          width={112}
          height={112}
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200/75">
        Knowledge Base Intelligence
      </p>
      <h3 className="text-balance text-2xl font-semibold leading-tight text-foreground">
        Ask My Knowledge Base
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Ask across saved knowledge, projects, and notes. Answers draw from the knowledge they use and keep citations close.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {ui.suggestedQueries.slice(0, 2).map((sq) => (
          <button
            key={sq}
            type="button"
            className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-cyan-200/30 hover:bg-cyan-300/10 hover:text-foreground"
            onClick={() => handleSend(sq)}
            disabled={isThinking}
          >
            {sq}
          </button>
        ))}
      </div>
    </div>
  );

  const topQuickActions = (
    <div
      className={cn(
        hasConversation
          ? "mb-1 flex gap-2 overflow-x-auto pb-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
          : "mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4",
      )}
    >
      {workflowPrompts.map((workflow) => (
        <button
          key={workflow.label}
          type="button"
          className={cn(
            "group relative min-h-[68px] overflow-hidden rounded-xl border border-white/10 bg-white/[0.045] p-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[76px] sm:p-3 lg:min-h-[56px] lg:p-2.5 min-[1440px]:min-h-[76px] min-[1440px]:p-3",
            hasConversation &&
              "max-[480px]:min-h-9 max-[480px]:min-w-[9rem] max-[480px]:shrink-0 max-[480px]:rounded-full max-[480px]:px-3 max-[480px]:py-1.5",
          )}
          onClick={() => seedWorkflowPrompt(workflow.prompt)}
          disabled={isThinking}
        >
          <div className="flex h-full items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold leading-5 text-foreground sm:text-sm">
                {workflow.label}
              </div>
              <p
                className={cn(
                  "mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground sm:mt-1 sm:text-xs sm:leading-5 lg:hidden min-[1440px]:block",
                  hasConversation && "max-[480px]:hidden",
                )}
              >
                {workflow.description}
              </p>
            </div>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-muted-foreground transition-[background-color,color,transform] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-cyan-300 group-hover:text-slate-950">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  const topLayoutRail = (
    <aside className="hidden min-h-0 flex-col overflow-hidden border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] lg:flex lg:h-full lg:max-h-none lg:w-[292px] lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="rounded-xl border border-slate-900/10 bg-white/75 p-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:border-white/10 dark:bg-black/22 dark:text-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-900/10 bg-white/80 shadow-[0_12px_32px_rgba(30,90,170,0.18)] dark:border-white/10 dark:bg-black/40">
            <Image
              src="/images/knowledge/ask-my-kb-mark.png"
              alt="Ask My Knowledge Base knowledge core mark"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-slate-950 dark:text-foreground">Workspace</p>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-muted-foreground">Knowledge console</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-slate-900/10 bg-slate-950/[0.06] p-1.5 dark:border-white/10 dark:bg-black/24">
          {[
            { label: "Items", value: items.length },
            { label: "Knowledge", value: knowledgeReadyCount },
            { label: "Domains", value: sourceDomainCount },
          ].map((metric) => (
            <div key={metric.label} className="rounded-lg bg-white/65 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-white/[0.035] dark:shadow-none">
              <p className="text-sm font-semibold tabular-nums text-slate-950 dark:text-foreground">{metric.value}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-slate-600 dark:text-muted-foreground">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-cyan-700/20 bg-cyan-100/80 px-3 py-2 text-left text-xs font-semibold text-slate-800 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-50 dark:hover:bg-cyan-300/16"
          onClick={startNewConversation}
        >
          <span className="inline-flex items-center gap-2">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New inquiry
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            History
          </div>
          <div className="space-y-1">
            {recentUserMessages.length > 0 ? (
              recentUserMessages.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  className="block w-full rounded-xl border border-transparent bg-background/30 px-2.5 py-2 text-left text-xs leading-4 text-muted-foreground transition-colors hover:border-border/70 hover:bg-background/70 hover:text-foreground"
                  onClick={() => seedPrompt(msg.content)}
                  title={msg.content}
                >
                  <span className="line-clamp-2">{msg.content}</span>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 bg-background/25 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
                Recent questions will appear here.
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <BrainCircuit className="h-3.5 w-3.5" />
            Context
          </div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between rounded-xl bg-background/35 px-2.5 py-2">
              <span className="inline-flex items-center gap-1.5">
                <Layers3 className="h-3.5 w-3.5" />
                Saved items
              </span>
              <span className="font-medium tabular-nums text-foreground">{items.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background/35 px-2.5 py-2">
              <span className="inline-flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5" />
                Knowledge ready
              </span>
              <span className="font-medium tabular-nums text-foreground">{knowledgeReadyCount}</span>
            </div>
            <div className="rounded-xl bg-background/35 px-2.5 py-2">
              {aiPanelRetrievalRunId ? "Knowledge attached" : "Hybrid retrieval ready"}
            </div>
            {aiPanelQuery ? (
              <button
                type="button"
                className="block w-full rounded-xl bg-background/35 px-2.5 py-2 text-left transition-colors hover:bg-background/70"
                onClick={() => seedPrompt(aiPanelQuery)}
              >
                <span className="line-clamp-2">{aiPanelQuery}</span>
              </button>
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <WandSparkles className="h-3.5 w-3.5" />
            Recent knowledge
          </div>
          <div className="space-y-1">
            {recentKnowledgeItems.length > 0 ? (
              recentKnowledgeItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="block w-full rounded-xl border border-transparent bg-background/30 px-2.5 py-2 text-left transition-colors hover:border-border/70 hover:bg-background/70"
                  onClick={() => seedPrompt(`Use "${item.title}" as the starting point. `)}
                  title={item.title}
                >
                  <span className="line-clamp-1 text-xs font-medium text-foreground">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {knowledgeUi.typeLabels[getKnowledgeDisplayContentType(item)]}
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 bg-background/25 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
                Add knowledge to unlock knowledge-aware prompts.
              </p>
            )}
          </div>
        </section>

        {smartCollections.length > 0 ? (
          <section>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <FolderKanban className="h-3.5 w-3.5" />
              Projects
            </div>
            <div className="flex flex-wrap gap-1.5">
              {smartCollections.slice(0, 8).map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className="rounded-full border border-border/60 bg-background/45 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-cyan-300/40 hover:text-foreground"
                  onClick={() => seedCollectionPrompt(collection.name)}
                >
                  {collection.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );

  const panelBody = messages.length === 0 ? (
    emptyState
  ) : (
    messageList
  );

  if (isTopLayout) {
    return (
      <div className="flex h-full min-w-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(77,151,255,0.12),transparent_34%),radial-gradient(circle_at_94%_22%,rgba(190,242,100,0.10),transparent_32%)] lg:flex-row">
        {topLayoutRail}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!hideHeader ? (
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3 text-sm font-medium">
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-[0_10px_28px_rgba(30,90,170,0.24)]">
                  <Image
                    src="/images/knowledge/ask-my-kb-mark.png"
                    alt="Ask My Knowledge Base knowledge core mark"
                    width={72}
                    height={72}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <span className="block truncate">{ui.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                    {aiPanelRetrievalRunId ? "Answering with selected knowledge" : "Cited answers over saved knowledge"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={clearConversation}
                    aria-label={ui.clearConversation}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {ui.clearConversation}
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={closeAIPanel} aria-label={ui.closePanel}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <ScrollArea className="min-h-0 flex-1 px-3 py-3 sm:px-5" ref={scrollRef}>
            {messages.length === 0 ? topEmptyState : messageList}
          </ScrollArea>

          <div
            className={cn(
              "shrink-0 border-t border-white/10 bg-background/45 p-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] backdrop-blur-xl max-[480px]:pr-[calc(env(safe-area-inset-right,0px)+4.75rem)] max-[480px]:pb-[calc(env(safe-area-inset-bottom,0px)+0.875rem)] sm:p-4 lg:p-3",
              hasConversation && "max-[480px]:pt-2",
            )}
          >
            {topQuickActions}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className={cn(
                "mx-auto flex max-w-4xl gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]",
                hasConversation && "max-[480px]:p-1",
              )}
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={ui.inputPlaceholder}
                className={cn(
                  "h-10 flex-1 border-transparent bg-transparent text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-cyan-300/35",
                  hasConversation && "max-[480px]:h-9",
                )}
                disabled={isThinking}
                aria-label={ui.inputAria}
              />
              <div className="relative shrink-0">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isThinking}
                  aria-label={ui.sendAria}
                  className={cn(
                    "relative z-10 h-10 shrink-0 rounded-xl border-transparent bg-cyan-300 text-slate-950 shadow-[0_10px_24px_rgba(103,232,249,0.18)] hover:bg-cyan-200 disabled:opacity-50",
                    hasConversation && "max-[480px]:h-9",
                    showSendHint && "knowledge-send-hint-button",
                  )}
                >
                  <Send className="h-4 w-4" />
                </Button>
                {showSendHint ? (
                  <>
                    <span className="knowledge-send-hint-ring" aria-hidden />
                    <span className="pointer-events-none absolute -top-11 right-0 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan-200/50 bg-cyan-950/90 px-2 py-1 text-[11px] font-semibold text-cyan-50 shadow-lg">
                      <ArrowRight className="knowledge-send-hint-arrow h-3.5 w-3.5 rotate-90 text-cyan-200" />
                      {ui.send}
                    </span>
                  </>
                ) : null}
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      {!hideHeader ? (
      <div className="flex shrink-0 flex-col gap-1 border-b border-border/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3 text-sm font-medium">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg">
              <Image
                src="/images/knowledge/ask-my-kb-mark.png"
                alt="Ask My Knowledge Base knowledge core mark"
                width={72}
                height={72}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate">{ui.title}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={clearConversation}
                aria-label={ui.clearConversation}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                {ui.clearConversation}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={closeAIPanel} aria-label={ui.closePanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">{ui.historyPersistHint}</p>
      </div>
      ) : null}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {panelBody}
      </ScrollArea>

      <div className="shrink-0 border-t border-border/70 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={ui.inputPlaceholder}
            className="flex-1 border-border/70 bg-muted/25 text-sm shadow-sm"
            disabled={isThinking}
            aria-label={ui.inputAria}
          />
          <div className="relative shrink-0">
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isThinking}
              aria-label={ui.sendAria}
              className={cn(
                "relative z-10 h-9 shrink-0 border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50",
                showSendHint && "knowledge-send-hint-button",
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
            {showSendHint ? (
              <>
                <span className="knowledge-send-hint-ring" aria-hidden />
                <span className="pointer-events-none absolute -top-10 right-0 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/35 bg-popover px-2 py-1 text-[11px] font-semibold text-foreground shadow-lg">
                  <ArrowRight className="knowledge-send-hint-arrow h-3.5 w-3.5 rotate-90 text-primary" />
                  {ui.send}
                </span>
              </>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
