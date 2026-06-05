"use client";

import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ExternalLink, ImageIcon, RefreshCw, Send } from "lucide-react";
import { DocOracleMarkdown } from "@/components/document-oracle/DocOracleMarkdown";
import { knowledgeFilesApiHref, sourcePdfHref } from "@/components/document-oracle/docOraclePaths";
import { displayVisualDescription, displayVisualTitle } from "@/components/document-oracle/docOracleVisualLabels";
import { cn } from "@/lib/utils";

const primaryActionBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-[background,transform,box-shadow] duration-150 ease-out hover:bg-primary/90 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const secondaryActionBtn =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2 text-[12px] font-semibold text-foreground transition hover:border-primary/30 hover:bg-primary/8 disabled:pointer-events-none disabled:opacity-50";

export type ChatCitation = {
  chunk_id?: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string | null;
};

export type RelatedVisual = {
  id: string;
  title: string;
  type?: string | null;
  page?: number | null;
  image_path?: string | null;
  description?: string | null;
  semantic_category?: string | null;
};

export type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  related_pages?: number[];
  related_visuals?: RelatedVisual[];
  generated_image_url?: string | null;
  generated_image_prompt?: string | null;
  userQuestion?: string | null;
  created_at?: string;
};

export type DocOracleChatRetrievalFocus = {
  pageStart: number | null;
  pageEnd: number | null;
  sectionTitle: string | null;
};

export type DocOracleChatPanelHandle = {
  sendMessage: (text: string, retrievalFocus?: DocOracleChatRetrievalFocus | null) => void;
  setInputAndFocus: (text: string) => void;
};

export type DocOraclePendingChatRequest = {
  id: string;
  prompt: string;
  retrievalFocus: DocOracleChatRetrievalFocus | null;
};

export type DocOracleChatPanelProps = {
  documentId: string;
  suggestedPrompts: string[];
  panelRef: RefObject<DocOracleChatPanelHandle | null>;
  filePath?: string | null;
  onOpenSourcePage?: (page: number) => void;
  onOpenVisualById?: (id: string) => void;
  pendingChatRequest?: DocOraclePendingChatRequest | null;
  onPendingChatConsumed?: (id: string) => void;
};

type SessionBrief = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message: string;
};

function parseRelatedVisuals(raw: unknown): RelatedVisual[] {
  if (!Array.isArray(raw)) return [];
  const out: RelatedVisual[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : null;
    if (!id) continue;
    const pageRaw = o.page ?? o.source_page_number;
    const page = typeof pageRaw === "number" && Number.isFinite(pageRaw) ? pageRaw : null;
    out.push({
      id,
      title: typeof o.title === "string" ? o.title : "Visual",
      type: typeof o.type === "string" ? o.type : null,
      page,
      image_path: typeof o.image_path === "string" ? o.image_path : null,
      description: typeof o.description === "string" ? o.description : null,
      semantic_category: typeof o.semantic_category === "string" ? o.semantic_category : null,
    });
  }
  return out;
}

function uniquePages(citations: ChatCitation[], related: number[] | undefined): number[] {
  const s = new Set<number>();
  for (const c of citations) {
    if (typeof c.page === "number" && Number.isFinite(c.page) && c.page > 0) s.add(Math.floor(c.page));
  }
  for (const p of related ?? []) {
    if (typeof p === "number" && Number.isFinite(p) && p > 0) s.add(Math.floor(p));
  }
  return Array.from(s).sort((a, b) => a - b);
}

function ChatBubble({
  role,
  children,
  className,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  className?: string;
}) {
  const user = role === "user";
  return (
    <div
      className={cn(
        "relative isolate w-full min-w-0",
        user
          ? "ml-auto max-w-[90%] md:max-w-[76%] lg:max-w-[76%]"
          : "mr-auto w-full max-w-full md:max-w-[96%] lg:max-w-[92%]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full min-w-0 overflow-hidden rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
          user
            ? "rounded-br-sm bg-primary px-4 py-3 text-[13px] leading-relaxed text-primary-foreground"
            : "rounded-bl-sm border border-border bg-card/70 px-4 py-4 text-[15px] leading-7 text-foreground backdrop-blur-xl [-webkit-backdrop-filter:blur(14px)] sm:px-5 sm:py-5 sm:text-[15.5px]",
        )}
      >
        {!user ? (
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-transparent"
            aria-hidden
          />
        ) : null}
        <span
          className={cn(
            "pointer-events-none absolute z-0 h-3 w-3 rotate-45 shadow-sm",
            user ? "bottom-1.5 right-3 bg-primary" : "bottom-1.5 left-3 border-b border-l border-border bg-card",
          )}
          aria-hidden
        />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

function BouncingDots({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 px-0.5 py-0.5", className)} aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="inline-block h-2 w-2 rounded-full bg-primary motion-safe:animate-bounce"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function OracleThinkingBubble() {
  return (
    <div className="mr-auto flex w-full min-w-0 max-w-full flex-col gap-1.5 md:max-w-[96%] lg:max-w-[92%]">
      <ChatBubble role="assistant">
        <BouncingDots />
      </ChatBubble>
      <p className="pl-1 text-[11px] text-muted-foreground/90">Oracle is thinking…</p>
    </div>
  );
}

function AssistantMeta(props: {
  citations: ChatCitation[];
  related_pages?: number[];
  related_visuals?: RelatedVisual[];
  filePath: string | null | undefined;
  onOpenSourcePage?: (page: number) => void;
  onOpenVisualById?: (id: string) => void;
}) {
  const { citations, related_pages, related_visuals, filePath, onOpenSourcePage, onOpenVisualById } = props;
  const sourcePages = uniquePages(citations, related_pages);

  const openPage = (page: number) => {
    if (onOpenSourcePage) onOpenSourcePage(page);
    else {
      const href = sourcePdfHref(filePath ?? null, page);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-4 md:max-w-[96%] lg:max-w-[92%]">
      {sourcePages.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Sources used</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sourcePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => openPage(p)}
                className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[12px] font-medium text-primary transition hover:bg-primary/15"
              >
                p.{p}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {citations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Evidence</p>
          <ul className="space-y-2">
            {citations.slice(0, 10).map((c, j) => (
              <li
                key={j}
                className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {c.page != null ? (
                    <button
                      type="button"
                      onClick={() => openPage(c.page as number)}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      p.{c.page}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">Page n/a</span>
                  )}
                  {c.section ? <span className="text-foreground/70">{c.section}</span> : null}
                  {filePath && c.page != null ? (
                    <a
                      href={sourcePdfHref(filePath, c.page) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      New tab
                    </a>
                  ) : null}
                </div>
                {c.excerpt ? (
                  <p className="mt-1.5 border-l-2 border-primary/30 pl-2 italic text-muted-foreground/95">
                    “{c.excerpt}”
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {related_pages && related_pages.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Related pages</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {related_pages.map((p) => (
              <button
                key={`r-${p}`}
                type="button"
                onClick={() => openPage(p)}
                className="rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-[11.5px] text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
              >
                p.{p}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {related_visuals && related_visuals.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Related visuals</p>
          <div className="mt-2 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            {related_visuals.map((v) => {
              const thumb = v.image_path ? knowledgeFilesApiHref(v.image_path) : null;
              const label = displayVisualTitle({
                title: v.title ?? null,
                source_page_number: v.page ?? null,
                semantic_category: v.semantic_category ?? null,
                type: v.type ?? null,
              });
              const desc = displayVisualDescription({ description: v.description ?? null });
              const badge = v.semantic_category || v.type || "visual";
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onOpenVisualById?.(v.id)}
                  disabled={!onOpenVisualById}
                  className={cn(
                    "flex min-w-0 w-full gap-2 overflow-hidden rounded-xl border border-border bg-muted/30 p-2 text-left transition",
                    onOpenVisualById ? "hover:border-primary/30" : "opacity-80",
                  )}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-[10px] text-muted-foreground">
                      No preview
                    </div>
                  )}
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="line-clamp-2 text-[12px] font-medium text-foreground">{label}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      <span className="rounded bg-muted/60 px-1.5 py-0.5">{badge}</span>
                      {v.page != null ? <span className="ml-1">· p.{v.page}</span> : null}
                    </p>
                    {desc ? <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground/90">{desc}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
  try {
    const j = (await res.json()) as unknown;
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function DocOracleChatPanel({
  documentId,
  suggestedPrompts,
  panelRef,
  filePath,
  onOpenSourcePage,
  onOpenVisualById,
  pendingChatRequest,
  onPendingChatConsumed,
}: DocOracleChatPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionBrief[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgBusyIdx, setImgBusyIdx] = useState<number | null>(null);
  const [imgErrByIdx, setImgErrByIdx] = useState<Record<number, string>>({});
  const imgBusyIdxRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionRef = useRef<string | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const inFlightRef = useRef(false);
  const consumedPendingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    consumedPendingIdsRef.current.clear();
  }, [documentId]);

  useEffect(() => {
    sessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const starters = suggestedPrompts.slice(0, 6);

  const fetchSessions = useCallback(async (): Promise<SessionBrief[]> => {
    const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/chat/sessions`);
    const data = await readJsonSafe(res);
    if (!res.ok) return [];
    const raw = data.sessions;
    if (!Array.isArray(raw)) return [];
    const out: SessionBrief[] = [];
    for (const x of raw) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : null;
      if (!id) continue;
      out.push({
        id,
        title: typeof o.title === "string" ? o.title : "Doc Oracle",
        created_at: typeof o.created_at === "string" ? o.created_at : "",
        updated_at: typeof o.updated_at === "string" ? o.updated_at : "",
        message_count: typeof o.message_count === "number" ? o.message_count : 0,
        last_message: typeof o.last_message === "string" ? o.last_message : "",
      });
    }
    return out;
  }, [documentId]);

  const loadSessionMessages = useCallback(
    async (sid: string) => {
      const res = await fetch(
        `/api/document-brain/${encodeURIComponent(documentId)}/chat/sessions/${encodeURIComponent(sid)}`,
      );
      const data = await readJsonSafe(res);
      if (!res.ok) return;
      const raw = data.messages;
      if (!Array.isArray(raw)) return;
      const next: Msg[] = [];
      for (const x of raw) {
        if (!x || typeof x !== "object") continue;
        const o = x as Record<string, unknown>;
        const role = o.role === "assistant" || o.role === "user" ? (o.role as "user" | "assistant") : null;
        if (!role || typeof o.content !== "string") continue;
        next.push({
          id: typeof o.id === "string" ? o.id : undefined,
          role,
          content: o.content,
          citations: Array.isArray(o.citations) ? (o.citations as ChatCitation[]) : [],
          related_pages: Array.isArray(o.related_pages)
            ? (o.related_pages as unknown[]).filter((p): p is number => typeof p === "number" && Number.isFinite(p))
            : [],
          related_visuals: parseRelatedVisuals(o.related_visuals),
          userQuestion: typeof o.userQuestion === "string" ? o.userQuestion : undefined,
          created_at: typeof o.created_at === "string" ? o.created_at : undefined,
        });
      }
      messagesRef.current = next;
      setMessages(next);
      setSessionId(sid);
    },
    [documentId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const list = await fetchSessions();
        if (cancelled) return;
        setSessions(list);
        if (list.length > 0) {
          await loadSessionMessages(list[0]!.id);
        } else {
          setSessionId(null);
          setMessages([]);
          messagesRef.current = [];
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, fetchSessions, loadSessionMessages]);

  const runVisualExplanation = useCallback(
    async (msgIndex: number) => {
      const list = messagesRef.current;
      const m = list[msgIndex];
      if (!m || m.role !== "assistant" || imgBusyIdxRef.current !== null) return;
      const session = sessionRef.current;
      if (!session) return;
      const priorUser = m.userQuestion?.trim();
      if (!priorUser) return;

      imgBusyIdxRef.current = msgIndex;
      setImgBusyIdx(msgIndex);
      setImgErrByIdx((prev) => {
        const n = { ...prev };
        delete n[msgIndex];
        return n;
      });
      try {
        const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/chat/visual-explanation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session,
            answer: m.content,
            question: priorUser,
            citations: m.citations ?? [],
            related_pages: m.related_pages ?? [],
            related_visuals: m.related_visuals ?? [],
          }),
        });
        const data = await readJsonSafe(res);
        if (!res.ok) {
          const err = typeof data.error === "string" ? data.error : "image_failed";
          if (err === "image_generation_not_configured") {
            setImgErrByIdx((prev) => ({
              ...prev,
              [msgIndex]: "Image explanation is not configured yet.",
            }));
            return;
          }
          if (err === "image_generation_failed") {
            const detail = typeof data.detail === "string" ? data.detail : "";
            setImgErrByIdx((prev) => ({
              ...prev,
              [msgIndex]: detail
                ? `Image explanation could not be generated (${detail.slice(0, 120)}).`
                : "Image explanation could not be generated. Please check Gemini image model configuration.",
            }));
            return;
          }
          setImgErrByIdx((prev) => ({
            ...prev,
            [msgIndex]: "Image explanation could not be generated. Please check Gemini image model configuration.",
          }));
          return;
        }
        const imageUrl = typeof data.image_url === "string" ? data.image_url : "";
        const promptUsed = typeof data.prompt_used === "string" ? data.prompt_used : "";
        if (!imageUrl) {
          setImgErrByIdx((prev) => ({
            ...prev,
            [msgIndex]: "Image explanation could not be generated (missing image URL).",
          }));
          return;
        }

        setMessages((prev) => {
          const next = [...prev];
          const cur = next[msgIndex];
          if (cur && cur.role === "assistant") {
            next[msgIndex] = {
              ...cur,
              generated_image_url: imageUrl,
              generated_image_prompt: promptUsed || null,
            };
          }
          messagesRef.current = next;
          return next;
        });
      } catch {
        setImgErrByIdx((prev) => ({
          ...prev,
          [msgIndex]: "Image explanation could not be generated. Please try again.",
        }));
      } finally {
        imgBusyIdxRef.current = null;
        setImgBusyIdx(null);
      }
    },
    [documentId],
  );

  const runSend = useCallback(
    async (rawText: string, retrievalFocus: DocOracleChatRetrievalFocus | null) => {
      const trimmed = rawText.trim();
      if (!trimmed || inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      setError(null);

      const previous = messagesRef.current;
      const nextMsgs: Msg[] = [...previous, { role: "user", content: trimmed }];
      messagesRef.current = nextMsgs;
      setMessages(nextMsgs);

      try {
        const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
            sessionId: sessionRef.current,
            retrievalFocus:
              retrievalFocus &&
              (retrievalFocus.sectionTitle || retrievalFocus.pageStart != null || retrievalFocus.pageEnd != null)
                ? {
                    pageStart: retrievalFocus.pageStart,
                    pageEnd: retrievalFocus.pageEnd,
                    sectionTitle: retrievalFocus.sectionTitle,
                  }
                : undefined,
          }),
        });
        const data = await readJsonSafe(res);
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "request_failed");
        }
        const answer = typeof data.answer === "string" ? data.answer : "";
        const citations = Array.isArray(data.citations) ? (data.citations as ChatCitation[]) : [];
        const related_pages = Array.isArray(data.related_pages)
          ? (data.related_pages as unknown[]).filter((x): x is number => typeof x === "number" && Number.isFinite(x))
          : [];
        const related_visuals = parseRelatedVisuals(data.related_visuals);
        if (typeof data.sessionId === "string") setSessionId(data.sessionId);

        const withAssistant: Msg[] = [
          ...nextMsgs,
          {
            role: "assistant" as const,
            content: answer,
            citations,
            related_pages,
            related_visuals,
            userQuestion: trimmed,
          },
        ];
        messagesRef.current = withAssistant;
        setMessages(withAssistant);
        setInput("");

        void fetchSessions().then(setSessions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "chat_failed");
        messagesRef.current = previous;
        setMessages(previous);
      } finally {
        setLoading(false);
        inFlightRef.current = false;
      }
    },
    [documentId, fetchSessions],
  );

  useImperativeHandle(
    panelRef,
    () => ({
      sendMessage: (text, retrievalFocus) => {
        void runSend(text, retrievalFocus ?? null);
      },
      setInputAndFocus: (text: string) => {
        setInput(text);
        requestAnimationFrame(() => textareaRef.current?.focus());
      },
    }),
    [runSend],
  );

  useLayoutEffect(() => {
    if (!pendingChatRequest) return;
    const { id, prompt, retrievalFocus } = pendingChatRequest;
    if (consumedPendingIdsRef.current.has(id)) return;
    consumedPendingIdsRef.current.add(id);
    onPendingChatConsumed?.(id);
    queueMicrotask(() => {
      void runSend(prompt, retrievalFocus);
    });
  }, [pendingChatRequest, onPendingChatConsumed, runSend]);

  const newChat = () => {
    setSessionId(null);
    sessionRef.current = null;
    setMessages([]);
    messagesRef.current = [];
    setError(null);
    setImgErrByIdx({});
  };

  const onSessionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sid = e.target.value;
    if (!sid) {
      newChat();
      return;
    }
    void (async () => {
      setHistoryLoading(true);
      try {
        await loadSessionMessages(sid);
      } finally {
        setHistoryLoading(false);
      }
    })();
  };

  return (
    <div className="flex w-full max-w-none flex-1 flex-col min-h-[72dvh] sm:min-h-[640px]">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
        <div className="shrink-0 rounded-2xl border border-border bg-card/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-[12px] leading-relaxed text-muted-foreground">
              Grounded answers from this document only.
            </p>
            <button type="button" onClick={newChat} className={cn(secondaryActionBtn, "h-9 min-h-9 shrink-0 px-3")}>
              New
            </button>
          </div>
          <label className="mt-2 block text-[11px] font-medium text-muted-foreground">
            <span className="sr-only">Conversation history</span>
            <select
              className="h-10 w-full max-w-full rounded-xl border border-border bg-background/55 px-2.5 text-[13px] text-foreground outline-none focus:border-primary/45"
              value={sessionId ?? ""}
              disabled={historyLoading}
              onChange={onSessionSelect}
            >
              <option value="">{sessions.length === 0 ? "No saved conversations yet" : "New chat (unsaved)"}</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {(s.title || "Doc Oracle").slice(0, 48)}
                  {s.last_message ? ` — ${s.last_message.slice(0, 56)}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

      {starters.length > 0 && messages.length === 0 && !historyLoading ? (
        <div className="flex w-full max-w-none shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => void runSend(s, null)}
              className="min-w-[14rem] max-w-[18rem] shrink-0 rounded-full border border-border bg-muted/40 px-3 py-2 text-left text-[12px] leading-snug text-muted-foreground transition hover:border-primary/25 hover:bg-primary/8 hover:text-foreground sm:min-w-0 sm:max-w-[min(100%,28rem)] sm:py-1.5 sm:text-[11.5px]"
            >
              <span className="line-clamp-2 sm:line-clamp-none">{s}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
        <div className="flex w-full min-w-0 max-w-none flex-col gap-4 pb-32 sm:pb-24">
          {historyLoading ? (
            <p className="text-[12px] text-muted-foreground">Loading conversation…</p>
          ) : null}

          {messages.length === 0 && !historyLoading ? (
            <p className="text-[12px] text-muted-foreground">Ask Doc Oracle about this document.</p>
          ) : null}

          {messages.map((m, i) => {
            const key = m.id ? m.id : `${m.role}-${i}-${m.created_at ?? ""}`;
            return m.role === "user" ? (
              <div key={key} className="flex w-full justify-end">
                <ChatBubble role="user">
                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                </ChatBubble>
              </div>
            ) : (
              <div key={key} className="flex w-full min-w-0 flex-col gap-1">
                <ChatBubble role="assistant">
                  <DocOracleMarkdown
                    className="w-full max-w-none text-[15px] leading-7 sm:text-[15.5px] [&_blockquote]:max-w-none [&_li]:max-w-none [&_ol]:max-w-none [&_p]:max-w-none [&_ul]:max-w-none"
                    source={m.content}
                  />
                </ChatBubble>

                <AssistantMeta
                  citations={m.citations ?? []}
                  related_pages={m.related_pages}
                  related_visuals={m.related_visuals}
                  filePath={filePath}
                  onOpenSourcePage={onOpenSourcePage}
                  onOpenVisualById={onOpenVisualById}
                />

                <div className="mt-1 flex w-full max-w-full flex-wrap gap-2 md:max-w-[96%] lg:max-w-[92%]">
                  <button
                    type="button"
                    disabled={!m.userQuestion || imgBusyIdx !== null || loading}
                    onClick={() => void runVisualExplanation(i)}
                    className={cn(primaryActionBtn, "text-[12px]")}
                  >
                    {imgBusyIdx === i ? (
                      <>
                        <BouncingDots className="py-0" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4" aria-hidden />
                        Turn into image explanation
                      </>
                    )}
                  </button>
                  {m.generated_image_url ? (
                    <>
                      <button
                        type="button"
                        className={secondaryActionBtn}
                        onClick={() => window.open(m.generated_image_url ?? "", "_blank", "noopener,noreferrer")}
                      >
                        Open image
                      </button>
                      <button
                        type="button"
                        className={secondaryActionBtn}
                        disabled={imgBusyIdx !== null || loading}
                        onClick={() => {
                          setMessages((prev) => {
                            const next = [...prev];
                            const cur = next[i];
                            if (cur && cur.role === "assistant") {
                              next[i] = { ...cur, generated_image_url: null, generated_image_prompt: null };
                            }
                            messagesRef.current = next;
                            return next;
                          });
                          setImgErrByIdx((prev) => {
                            const n = { ...prev };
                            delete n[i];
                            return n;
                          });
                          queueMicrotask(() => void runVisualExplanation(i));
                        }}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        Regenerate
                      </button>
                    </>
                  ) : null}
                </div>

                {imgErrByIdx[i] ? (
                  <p className="w-full max-w-full text-[11.5px] text-rose-600 md:max-w-[96%] lg:max-w-[92%] dark:text-rose-300/90">
                    {imgErrByIdx[i]}
                  </p>
                ) : null}

                {m.generated_image_url ? (
                  <div className="mt-2 w-full max-w-full space-y-2 rounded-xl border border-border bg-muted/30 p-3 md:max-w-[96%] lg:max-w-[92%]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Image explanation
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.generated_image_url}
                      alt="Generated explanation diagram"
                      className="max-h-[min(65dvh,560px)] w-full rounded-lg object-contain"
                    />
                  </div>
                ) : null}
              </div>
            );
          })}

          {loading ? <OracleThinkingBubble /> : null}
        </div>
      </div>

      {error ? <p className="shrink-0 text-[12px] text-rose-600 dark:text-rose-300/90">{error}</p> : null}

      <div className="sticky bottom-0 z-30 w-full shrink-0 border-t border-border bg-background/88 px-3 pt-3 backdrop-blur-xl [-webkit-backdrop-filter:blur(14px)] pb-[calc(env(safe-area-inset-bottom,0px)+0.85rem)] max-sm:pr-[max(0.75rem,calc(env(safe-area-inset-right,0px)+4.75rem))] sm:bg-background/80 sm:px-0 sm:pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:backdrop-blur-sm">
        <div className="flex w-full min-w-0 items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            maxLength={12000}
            placeholder="Ask Doc Oracle…"
            className="min-h-[72px] max-h-[180px] w-full min-w-0 flex-1 resize-y rounded-xl border border-border bg-muted/60 px-3 py-2.5 text-[13px] text-foreground outline-none ring-0 placeholder:text-muted-foreground focus:border-primary/45"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void runSend(input, null);
              }
            }}
          />
          <button
            type="button"
            disabled={loading}
            className={cn(primaryActionBtn, "h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-4")}
            onClick={() => void runSend(input, null)}
          >
            <Send className="h-4 w-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Send</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
