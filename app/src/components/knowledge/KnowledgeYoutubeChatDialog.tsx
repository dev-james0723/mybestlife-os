"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KnowledgeItem } from "@/types/knowledge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KnowledgeUiCopy } from "@/lib/i18n/knowledge-ui-copy-type";
import { friendlyAuthError } from "@/lib/knowledge/auth-error-copy";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  item: KnowledgeItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: KnowledgeUiCopy["detail"];
};

export function KnowledgeYoutubeChatDialog({ item, open, onOpenChange, copy }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const starters = useMemo(() => {
    const fromAi = (item?.aiVideoChatStarters ?? []).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    const seen = new Set<string>();
    for (const q of fromAi) {
      const k = q.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(q);
      if (out.length >= 6) return out;
    }
    for (const q of copy.videoChatFallbackQuestions) {
      const t = q.trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
      if (out.length >= 6) break;
    }
    return out;
  }, [item?.aiVideoChatStarters, copy.videoChatFallbackQuestions]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
      setError(null);
      setLoading(false);
    }
  }, [open, item?.id]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  const sendTurn = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || !item || loading) return;
      setError(null);
      const nextMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/knowledge/youtube-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId: item.id, messages: nextMessages }),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          reason?: string;
          detail?: string;
        };
        if (!res.ok) {
          const friendly = friendlyAuthError(data, copy);
          throw new Error(
            friendly ?? data.detail ?? data.error ?? copy.videoChatError,
          );
        }
        const reply = typeof data.reply === "string" ? data.reply : "";
        if (!reply) throw new Error(copy.videoChatError);
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : copy.videoChatError;
        setError(msg);
        setMessages((m) => m.slice(0, -1));
      } finally {
        setLoading(false);
      }
    },
    [item, loading, messages, copy],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="2xl" className="flex max-h-[85vh] flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle className="text-base leading-snug pr-2">
            {copy.videoChatTitle}
            {item?.title ? (
              <span className="mt-1 block text-xs font-normal text-muted-foreground line-clamp-2">
                {item.title}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-2 border-b bg-muted/20 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {copy.videoChatQuickPicks}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {starters.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-auto max-w-full whitespace-normal rounded-full px-3 py-1.5 text-left text-xs font-normal"
                  disabled={loading || !item}
                  onClick={() => void sendTurn(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground leading-relaxed">{copy.videoChatIntro}</p>
            )}
            {messages.map((m, i) => (
              <div
                key={`${i}-${m.role}`}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-6 bg-primary/10 text-foreground"
                    : "mr-6 border bg-card text-muted-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {copy.videoChatThinking}
              </div>
            )}
            {error && (
              <p className="text-xs text-destructive whitespace-pre-wrap break-words">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t p-3 space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={copy.videoChatPlaceholder}
              rows={2}
              className="min-h-[60px] resize-none text-sm"
              disabled={loading || !item}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendTurn(input);
                }
              }}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={loading || !input.trim() || !item}
                onClick={() => void sendTurn(input)}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {copy.videoChatSend}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
