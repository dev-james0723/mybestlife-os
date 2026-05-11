"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <Card className="flex flex-col min-h-[min(70vh,640px)] max-w-3xl">
        <CardContent className="flex-1 flex flex-col min-h-0 pt-4 pb-0">
          <ScrollArea className="h-[min(52vh,520px)] pr-3">
            <div className="space-y-3 pb-2">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  {ui.emptyState}
                </p>
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
                        "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
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
        </CardContent>
        <CardFooter className="gap-2">
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
          <Button type="button" onClick={send} aria-label={ui.sendMessageAria}>
            <SendHorizontal className="h-4 w-4" />
            {ui.send}
          </Button>
        </CardFooter>
      </Card>
    </PageShell>
  );
}
