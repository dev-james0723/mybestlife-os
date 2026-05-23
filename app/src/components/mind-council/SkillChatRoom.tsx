"use client";

import { useEffect, useRef, useState } from "react";
import type { MindSkill, MindCouncilChatMessage } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SendHorizontal, Loader2 } from "lucide-react";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";

type SkillChatRoomProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  skill: MindSkill | null;
  ui: MindCouncilUiCopy;
  locale: AppLocale;
};

export function SkillChatRoom({ open, onOpenChange, skill, ui, locale }: SkillChatRoomProps) {
  const [messages, setMessages] = useState<MindCouncilChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!skill) return null;

  const send = async () => {
    const text = draft.trim();
    if (!text || loading) return;
    const userMsg: MindCouncilChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setDraft("");
    setLoading(true);
    const history = [...messages, userMsg].map((x) => ({ role: x.role, content: x.content }));
    try {
      const res = await fetch("/api/mind-council/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillId: skill.skillId,
          locale,
          messages: history,
          ...(skill.skillId.startsWith("custom-")
            ? { customLensTitle: skill.lensTitle, customSystemHint: skill.systemPromptHint }
            : {}),
        }),
      });
      const json = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Request failed");
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: json.reply ?? "" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 border-l border-border/60 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 bg-card/40 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <AdvisorPortrait
              skill={skill}
              className="h-11 w-11 shadow-inner"
              pixelSize={44}
              rounded="rounded-2xl"
            />
            <div className="min-w-0">
              <SheetTitle className="truncate text-left">{skill.lensTitle}</SheetTitle>
              <SheetDescription className="text-left text-xs">{ui.disclaimerShort}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-220px)] px-4">
          <div className="space-y-3 py-4">
            {messages.length === 0 && !loading && (
              <p className="text-center text-sm text-muted-foreground">{ui.chatEmpty}</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {ui.chatThinking}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <SheetFooter className="border-t border-border/60 bg-background/80 p-3 backdrop-blur-xl">
          <div className="flex w-full gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={ui.heroPlaceholder}
              className="rounded-2xl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button type="button" className="rounded-2xl" onClick={() => void send()} disabled={loading}>
              <SendHorizontal className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">{ui.chatSend}</span>
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
