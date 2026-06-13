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
  const items = useKnowledgeStore((s) => s.items);
  const smartCollections = useKnowledgeStore((s) => s.smartCollections);
  const selectItem = useKnowledgeStore((s) => s.selectItem);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState(aiPanelQuery);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const evidenceReadyCount = useMemo(
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
    if (aiPanelQuery && messages.length === 0) {
      queueMicrotask(() => setInput(aiPanelQuery));
    }
  }, [aiPanelQuery, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    try {
      window.localStorage.removeItem(storageKey(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);

  const startNewConversation = useCallback(() => {
    clearConversation();
    setInput("");
  }, [clearConversation]);

  const seedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
  }, []);

  const seedCollectionPrompt = useCallback((name: string) => {
    setInput(`Focus this Ask My Knowledge Base answer on "${name}". `);
  }, []);

  const seedWorkflowPrompt = useCallback((workflow: string) => {
    setInput(workflow);
  }, []);

  const workflowPrompts = useMemo(
    () => [
      {
        label: "Synthesize",
        description: "Turn related knowledge into one cited brief.",
        prompt:
          "Synthesize the most relevant saved knowledge into a concise brief. Group the answer by themes, cite the strongest sources, and call out uncertainty.",
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

  const handleSend = useCallback(
    async (query?: string) => {
      const q = (query || input).trim();
      if (!q) return;

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
    <div
      className={cn(
        "space-y-4",
        isTopLayout &&
          "grid gap-5 space-y-0 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.22fr)] xl:items-stretch",
      )}
    >
      <div
        className={cn(
          "py-6 text-center",
          isTopLayout &&
            "relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_24%_18%,rgba(119,170,255,0.16),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]",
        )}
      >
        {isTopLayout ? (
          <>
            <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30 shadow-[0_18px_48px_rgba(38,88,160,0.28),inset_0_1px_0_rgba(255,255,255,0.14)]">
                <Image
                  src="/images/knowledge/ask-my-kb-mark.png"
                  alt="Ask My KB knowledge core mark"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                  priority={false}
                />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200/80">
                  Knowledge intelligence
                </p>
                <h3 className="text-balance text-lg font-semibold leading-tight text-foreground">
                  Ask across memory, evidence, and projects
                </h3>
                <p className="mt-2 max-w-[36rem] text-xs leading-5 text-muted-foreground">
                  {ui.welcomeDescription}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Items", value: items.length },
                { label: "Evidence", value: evidenceReadyCount },
                { label: "Domains", value: sourceDomainCount },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                >
                  <div className="text-base font-semibold tabular-nums text-foreground">
                    {metric.value}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-3 h-12 w-12 overflow-hidden rounded-xl">
              <Image
                src="/images/knowledge/ask-my-kb-mark.png"
                alt="Ask My KB knowledge core mark"
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            </div>
            <h3 className="text-sm font-medium mb-1">{ui.welcomeTitle}</h3>
            <p className="text-xs text-muted-foreground">{ui.welcomeDescription}</p>
          </>
        )}
      </div>
      {isTopLayout ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {workflowPrompts.map((workflow) => (
            <button
              key={workflow.label}
              type="button"
              className="group relative overflow-hidden rounded-[1.1rem] border border-border/60 bg-background/64 p-3 text-left shadow-[0_14px_36px_rgba(0,0,0,0.10),inset_0_1px_0_rgba(255,255,255,0.08)] transition-[border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-background/90"
              onClick={() => seedWorkflowPrompt(workflow.prompt)}
              disabled={isThinking}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{workflow.label}</div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {workflow.description}
                  </p>
                </div>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cyan-200">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </button>
          ))}
          {ui.suggestedQueries.slice(0, 2).map((sq) => (
            <button
              key={sq}
              type="button"
              className="group flex w-full items-center justify-between rounded-[1.1rem] border border-border/60 bg-muted/25 px-3 py-2.5 text-left text-xs shadow-sm transition-colors hover:bg-muted/50"
              onClick={() => handleSend(sq)}
              disabled={isThinking}
            >
              <span>{sq}</span>
              <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : (
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
              <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const messageList = (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "max-w-[88%] rounded-lg px-3 py-2 text-sm break-words",
            isTopLayout && "max-w-[min(860px,92%)]",
            msg.role === "user"
              ? "ml-auto bg-primary text-primary-foreground"
              : "bg-muted",
            isTopLayout &&
              msg.role === "user" &&
              "max-w-[min(680px,82%)]",
          )}
        >
          {msg.role === "user" ? (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                {isTopLayout ? (
                  <div className="mt-0.5 h-5 w-5 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                    <Image
                      src="/images/knowledge/ask-my-kb-mark.png"
                      alt="Ask My KB knowledge core mark"
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <Sparkles className="mt-1 h-3 w-3 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_ul]:list-disc">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div className={cn("space-y-1.5", isTopLayout && "grid gap-1.5 space-y-0 md:grid-cols-2")}>
                  {msg.citations.slice(0, 4).map((citation) => (
                    <div
                      key={`${msg.id}:${citation.resultId}:${citation.quote ?? ""}`}
                      className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2 text-[11px] leading-snug"
                    >
                      <div className="flex items-center gap-1.5 font-medium">
                        <BookOpen className="h-3 w-3 text-primary" />
                        <span>{citation.resultId}</span>
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
                <div className={cn("space-y-1.5", isTopLayout && "grid gap-1.5 space-y-0 md:grid-cols-3")}>
                  {msg.sources.some(isConnectedContextSource) ? (
                    <div className={cn("rounded-md border border-primary/20 bg-primary/10 px-2.5 py-2 text-[11px] leading-snug", isTopLayout && "md:col-span-3")}>
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
                      className="rounded-md border border-border/60 bg-background/60 px-2.5 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 animate-pulse text-primary" />
          {ui.thinking}
        </div>
      )}
    </div>
  );

  const topLayoutRail = (
    <aside className="flex max-h-60 min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] lg:max-h-none">
      <div className="rounded-[1.05rem] border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <Image
              src="/images/knowledge/ask-my-kb-mark.png"
              alt="Ask My KB knowledge core mark"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight text-foreground">Workspace</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Evidence console</p>
          </div>
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-left text-xs font-medium text-cyan-50 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-cyan-300/16"
          onClick={startNewConversation}
        >
          <span className="inline-flex items-center gap-2">
            <MessageSquarePlus className="h-3.5 w-3.5" />
            New inquiry
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-background/35 px-3 py-2">
          <p className="text-base font-semibold tabular-nums">{messages.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Turns</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-background/35 px-3 py-2">
          <p className="text-base font-semibold tabular-nums">{smartCollections.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Projects</p>
        </div>
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
                Evidence
              </span>
              <span className="font-medium tabular-nums text-foreground">{evidenceReadyCount}</span>
            </div>
            <div className="rounded-xl bg-background/35 px-2.5 py-2">
              {aiPanelRetrievalRunId ? "Retrieved evidence attached" : "Hybrid retrieval ready"}
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
                    {knowledgeUi.typeLabels[item.contentType]}
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 bg-background/25 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
                Add knowledge to unlock source-aware prompts.
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

  const panelBody = isTopLayout ? (
    <div className="grid min-h-full min-w-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      {topLayoutRail}
      <div className="min-w-0">
        {messages.length === 0 ? emptyState : messageList}
      </div>
    </div>
  ) : messages.length === 0 ? (
    emptyState
  ) : (
    messageList
  );

  return (
    <div className={cn("flex h-full min-w-0 flex-col", isTopLayout && "bg-[radial-gradient(circle_at_12%_8%,rgba(77,151,255,0.12),transparent_34%),radial-gradient(circle_at_94%_22%,rgba(190,242,100,0.10),transparent_32%)]")}>
      {!hideHeader ? (
      <div className={cn("flex shrink-0 flex-col gap-1 border-b border-border/70 p-4", isTopLayout && "border-white/10 px-4 py-3")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3 text-sm font-medium">
            <div className={cn("relative h-8 w-8 shrink-0 overflow-hidden rounded-lg", isTopLayout && "h-9 w-9 rounded-xl border border-white/10 bg-black/30 shadow-[0_10px_28px_rgba(30,90,170,0.24)]")}>
              <Image
                src="/images/knowledge/ask-my-kb-mark.png"
                alt="Ask My KB knowledge core mark"
                width={72}
                height={72}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate">{ui.title}</span>
              {isTopLayout ? (
                <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground">
                  {aiPanelRetrievalRunId ? "Answering with selected evidence" : "Cited answers over saved knowledge"}
                </span>
              ) : null}
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
        {!isTopLayout ? (
          <p className="text-[10px] leading-snug text-muted-foreground">{ui.historyPersistHint}</p>
        ) : null}
      </div>
      ) : null}

      <ScrollArea className={cn("flex-1 p-4", isTopLayout && "px-4 py-3 sm:px-5")} ref={scrollRef}>
        {panelBody}
      </ScrollArea>

      <div className={cn("shrink-0 border-t border-border/70 p-4", isTopLayout && "border-white/10 p-3 sm:p-4")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className={cn(
            "flex gap-2",
            isTopLayout &&
              "rounded-2xl border border-white/10 bg-black/20 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
          )}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ui.inputPlaceholder}
            className={cn(
              "flex-1 border-border/70 bg-muted/25 text-sm shadow-sm",
              isTopLayout &&
                "h-10 border-transparent bg-transparent shadow-none focus-visible:ring-cyan-300/35",
            )}
            disabled={isThinking}
            aria-label={ui.inputAria}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isThinking}
            aria-label={ui.sendAria}
            className={cn(
              "h-9 shrink-0 border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50",
              isTopLayout &&
                "h-10 rounded-xl bg-cyan-300 text-slate-950 shadow-[0_10px_24px_rgba(103,232,249,0.18)] hover:bg-cyan-200",
            )}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
