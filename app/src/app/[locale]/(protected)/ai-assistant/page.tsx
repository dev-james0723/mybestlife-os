"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { getMiscUiCopy } from "@/lib/i18n/misc-ui";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export default function AiAssistantPage() {
  const language = useAppStore((s) => s.language);
  const ui = getMiscUiCopy(language).aiAssistant;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: text },
      { id: assistantId, role: "assistant", content: ui.localPlaceholderReply },
    ]);
    setDraft("");
  }, [draft, ui.localPlaceholderReply]);

  return (
    <PageShell
      title={ui.pageTitle}
      description={ui.pageDescription}
    >
      <OSFrostedPanel className="flex min-h-[min(70dvh,640px)] max-w-3xl flex-col p-2 sm:p-3">
        <div className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="h-[min(56dvh,520px)] pr-2">
            <div className="space-y-3 p-2 pb-3">
              {messages.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center px-4 text-center">
                  <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                    {ui.emptyState}
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors duration-150",
                        m.role === "user"
                          ? "rounded-br-md bg-lime-300 text-slate-950 shadow-[0_10px_30px_rgba(190,242,100,0.12),inset_0_1px_0_rgba(255,255,255,0.38)]"
                          : "rounded-bl-md border border-slate-200/70 bg-white/72 text-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]"
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </div>
        <div className="flex gap-2 border-t border-slate-200/70 p-2 pt-3 dark:border-white/10">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={ui.inputPlaceholder}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="flex-1"
          />
          <OSPrimaryAction type="button" onClick={send} aria-label={ui.sendMessageAria}>
            <SendHorizontal className="h-4 w-4" />
            {ui.send}
          </OSPrimaryAction>
        </div>
      </OSFrostedPanel>
    </PageShell>
  );
}
