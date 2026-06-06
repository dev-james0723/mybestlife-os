"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

interface KnowledgeAIPanelProps {
  userId: string;
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

export function KnowledgeAIPanel({ userId }: KnowledgeAIPanelProps) {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language).aiPanel;
  const knowledgeUi = getKnowledgeUiCopy(language);
  const closeAIPanel = useKnowledgeStore((s) => s.closeAIPanel);
  const aiPanelQuery = useKnowledgeStore((s) => s.aiPanelQuery);
  const aiPanelRetrievalRunId = useKnowledgeStore((s) => s.aiPanelRetrievalRunId);
  const items = useKnowledgeStore((s) => s.items);
  const selectItem = useKnowledgeStore((s) => s.selectItem);

  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState(aiPanelQuery);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(loadStoredMessages(userId));
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    if (!hydrated) return;
    saveMessages(userId, messages);
  }, [hydrated, userId, messages]);

  useEffect(() => {
    if (aiPanelQuery && messages.length === 0) {
      setInput(aiPanelQuery);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex shrink-0 flex-col gap-1 border-b border-border/70 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium min-w-0">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{ui.title}</span>
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

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-6">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-medium mb-1">{ui.welcomeTitle}</h3>
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
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[88%] rounded-lg px-3 py-2 text-sm break-words",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {msg.role === "user" ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Sparkles className="mt-1 h-3 w-3 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1 space-y-2 text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-background/70 [&_code]:px-1 [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-1 [&_ul]:list-disc">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="space-y-1.5">
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
                      <div className="space-y-1.5">
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
        )}
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={ui.inputPlaceholder}
            className="flex-1 border-border/70 bg-muted/25 text-sm shadow-sm"
            disabled={isThinking}
            aria-label={ui.inputAria}
          />
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isThinking}
            aria-label={ui.sendAria}
            className="h-9 shrink-0 border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
