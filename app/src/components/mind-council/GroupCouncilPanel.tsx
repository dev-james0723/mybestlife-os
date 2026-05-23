"use client";

import { useState } from "react";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { CouncilSynthesisPanel } from "@/components/mind-council/CouncilSynthesisPanel";

export type GroupAdvisorPayload = {
  skillId: string;
  lensTitle: string;
  reply: string;
  source?: string;
};

type GroupCouncilPanelProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ui: MindCouncilUiCopy;
  locale: AppLocale;
  councilSkillIds: string[];
  defaultQuestion: string;
};

export function GroupCouncilPanel({
  open,
  onOpenChange,
  ui,
  locale,
  councilSkillIds,
  defaultQuestion,
}: GroupCouncilPanelProps) {
  const [question, setQuestion] = useState(defaultQuestion);
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<GroupAdvisorPayload[]>([]);
  const [synthesis, setSynthesis] = useState("");

  const run = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setReplies([]);
    setSynthesis("");
    try {
      const res = await fetch("/api/mind-council/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillIds: councilSkillIds,
          userMessage: q,
          locale,
        }),
      });
      const json = (await res.json()) as {
        replies?: GroupAdvisorPayload[];
        synthesis?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Council failed");
      setReplies(json.replies ?? []);
      setSynthesis(json.synthesis ?? "");
    } catch {
      setSynthesis("The council session failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-border/60 bg-card/40 p-4 backdrop-blur-xl">
          <SheetTitle>{ui.groupPanelTitle}</SheetTitle>
          <SheetDescription>{ui.groupPanelSubtitle}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100dvh-200px)]">
          <div className="space-y-4 p-4">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              className="rounded-2xl"
              placeholder={ui.heroPlaceholder}
            />
            <Button
              type="button"
              className="w-full rounded-2xl sm:w-auto"
              onClick={() => void run()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {ui.groupRunning}
                </>
              ) : (
                ui.groupRun
              )}
            </Button>
            <div className="space-y-3">
              {replies.map((r) => (
                <article
                  key={r.skillId}
                  className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm backdrop-blur-md"
                >
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {r.lensTitle}
                  </h3>
                  <div className="max-w-none whitespace-pre-wrap text-sm leading-relaxed">{r.reply}</div>
                </article>
              ))}
            </div>
            {(synthesis || loading) && (
              <CouncilSynthesisPanel ui={ui} text={synthesis} loading={loading && !synthesis} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
