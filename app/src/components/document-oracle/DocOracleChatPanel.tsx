"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { DocOracleMarkdown } from "@/components/document-oracle/DocOracleMarkdown";
import { cn } from "@/lib/utils";

const limeBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8E53A] px-4 py-2 text-[13px] font-semibold text-[#0d0d0d] shadow-sm transition-[filter,transform] duration-[120ms] ease-out hover:scale-[1.02] hover:brightness-[1.12] disabled:opacity-50";

export type ChatCitation = {
  chunk_id?: string;
  page?: number | null;
  section?: string | null;
  excerpt?: string;
};

type Msg = { role: "user" | "assistant"; content: string; citations?: ChatCitation[] };

export function DocOracleChatPanel(props: {
  documentId: string;
  suggestedPrompts: string[];
}) {
  const { documentId, suggestedPrompts } = props;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starters = useMemo(() => suggestedPrompts.slice(0, 6), [suggestedPrompts]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      setLoading(true);
      setError(null);
      const previous = messages;
      const nextMsgs: Msg[] = [...previous, { role: "user", content: trimmed }];
      setMessages(nextMsgs);
      setInput("");
      try {
        const res = await fetch(`/api/document-brain/${encodeURIComponent(documentId)}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
            sessionId,
          }),
        });
        const data = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "request_failed");
        }
        const answer = typeof data.answer === "string" ? data.answer : "";
        const citations = Array.isArray(data.citations) ? (data.citations as ChatCitation[]) : [];
        if (typeof data.sessionId === "string") setSessionId(data.sessionId);
        setMessages([...nextMsgs, { role: "assistant", content: answer, citations }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "chat_failed");
        setMessages(previous);
      } finally {
        setLoading(false);
      }
    },
    [documentId, loading, messages, sessionId],
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] text-white/50">
        Answers use retrieved passages from this document only. Citations show page and chunk references.
      </p>
      {starters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {starters.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => void send(s)}
              className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-left text-[11.5px] text-white/75 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-[min(52vh,520px)] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/25 p-3">
        {messages.length === 0 ? (
          <p className="text-[12px] text-white/45">Ask a question about this document.</p>
        ) : null}
        {messages.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={cn(
              "rounded-xl px-3 py-2 text-[13px]",
              m.role === "user" ? "ml-6 bg-white/[0.08] text-white/90" : "mr-4 bg-[#C8E53A]/12 text-white/90",
            )}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{m.role}</p>
            <div className="mt-1">
              {m.role === "assistant" ? (
                <DocOracleMarkdown className="text-[12.5px]" source={m.content} />
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
            {m.role === "assistant" && m.citations && m.citations.length > 0 ? (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Citations</p>
                {m.citations.map((c, j) => (
                  <div key={j} className="rounded-lg bg-black/30 px-2 py-1.5 text-[11px] text-white/70">
                    {c.page != null ? <span className="text-[#C8E53A]">p.{c.page} </span> : null}
                    {c.section ? <span className="text-white/55">{c.section} · </span> : null}
                    {c.chunk_id ? (
                      <span className="font-mono text-[10px] text-white/40">{c.chunk_id.slice(0, 8)}… </span>
                    ) : null}
                    {c.excerpt ? <span className="italic text-white/60">“{c.excerpt}”</span> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {loading ? (
          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Thinking…
          </div>
        ) : null}
      </div>

      {error ? <p className="text-[12px] text-rose-300/90">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          maxLength={12000}
          placeholder="Ask Doc Oracle…"
          className="min-h-[88px] flex-1 resize-y rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-[13px] text-white outline-none ring-0 placeholder:text-white/35 focus:border-[#C8E53A]/45"
        />
        <button type="button" disabled={loading} className={limeBtn} onClick={() => void send(input)}>
          <Send className="h-4 w-4" aria-hidden />
          Send
        </button>
      </div>
    </div>
  );
}
