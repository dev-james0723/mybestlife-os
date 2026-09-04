"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MindSkill, MindCouncilChatMessage } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  OSDialogSurface,
  OSIconControl,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Clipboard,
  Loader2,
  RefreshCcw,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import { AdvisorPortrait } from "@/components/mind-council/AdvisorPortrait";
import { MindCouncilRichText } from "@/components/mind-council/MindCouncilRichText";

type SkillChatRoomProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  skill: MindSkill | null;
  ui: MindCouncilUiCopy;
  locale: AppLocale;
  /** Optional first-message prefill, e.g. from a "Challenge Me" deep link. */
  initialPrompt?: string;
};

function getStarterPrompts(skill: MindSkill, ui: MindCouncilUiCopy): string[] {
  const tailored = (skill.starterPrompts ?? [])
    .map((prompt) => prompt.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (tailored.length > 0) return tailored;

  switch (skill.category) {
    case "builders":
      return [ui.chipShipProduct, ui.chipScienceTruth, ui.chipAthleteDiscipline];
    case "investors":
      return [ui.chipInvestLongTerm, ui.chipScienceTruth, ui.chipInnerCalm];
    case "artists":
      return [ui.chipInnerCalm, ui.chipShipProduct, ui.chipScienceTruth];
    case "athletes":
      return [ui.chipAthleteDiscipline, ui.chipInnerCalm, ui.chipShipProduct];
    case "scientists":
      return [ui.chipScienceTruth, ui.chipShipProduct, ui.chipInvestLongTerm];
    case "leaders":
      return [ui.chipShipProduct, ui.chipAthleteDiscipline, ui.chipInvestLongTerm];
    case "philosophy":
      return [ui.chipInnerCalm, ui.chipScienceTruth, ui.chipInvestLongTerm];
  }
}

export function SkillChatRoom({
  open,
  onOpenChange,
  skill,
  ui,
  locale,
  initialPrompt,
}: SkillChatRoomProps) {
  const [messages, setMessages] = useState<MindCouncilChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedHistory, setFailedHistory] = useState<MindCouncilChatMessage[] | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const copyResetRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }

    // Prefill rather than auto-send so the user controls the first turn.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed composer from deep-link prompt on open
    if (open && initialPrompt) setDraft(initialPrompt);
    const focusTimer = window.setTimeout(() => composerRef.current?.focus(), 180);
    return () => window.clearTimeout(focusTimer);
  }, [open, initialPrompt]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({
      behavior: messages.length > 1 ? "smooth" : "auto",
      block: "end",
    });
  }, [messages.length, loading, error, open]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
    },
    [],
  );

  const requestReply = useCallback(
    async (history: MindCouncilChatMessage[]) => {
      if (!skill) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setFailedHistory(null);

      try {
        const res = await fetch("/api/mind-council/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            skillId: skill.skillId,
            locale,
            messages: history.map(({ role, content }) => ({ role, content })),
            ...(skill.skillId.startsWith("custom-")
              ? { customLensTitle: skill.lensTitle, customSystemHint: skill.systemPromptHint }
              : {}),
          }),
        });
        const json = (await res.json()) as { reply?: string; error?: string; detail?: string };
        if (!res.ok) throw new Error(json.detail ?? json.error ?? "Request failed");

        const reply = json.reply?.trim();
        if (!reply) throw new Error("The lens returned an empty response");

        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: "assistant", content: reply },
        ]);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(ui.chatError);
        setFailedHistory(history);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setLoading(false);
        }
      }
    },
    [locale, skill, ui.chatError],
  );

  const send = useCallback(
    async (value = draft) => {
      const text = value.trim();
      if (!text || loading || !skill) return;

      const userMessage: MindCouncilChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setDraft("");
      await requestReply(nextMessages);
    },
    [draft, loading, messages, requestReply, skill],
  );

  const startNewConversation = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setDraft("");
    setError(null);
    setFailedHistory(null);
    setLoading(false);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, []);

  const copyMessage = useCallback(async (message: MindCouncilChatMessage) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      if (copyResetRef.current !== null) window.clearTimeout(copyResetRef.current);
      copyResetRef.current = window.setTimeout(() => setCopiedMessageId(null), 1600);
    } catch {
      // Clipboard access can be blocked; the response remains selectable.
    }
  }, []);

  if (!skill) return null;

  const starterPrompts = getStarterPrompts(skill, ui);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <OSDialogSurface
        size="4xl"
        className="flex h-[min(84dvh,800px)] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-[1.4rem] p-0 sm:w-[min(860px,calc(100vw-2rem))]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-50"
          style={{
            background: `radial-gradient(70% 100% at 10% 0%, ${skill.avatarGradient[0]}4d, transparent 72%), radial-gradient(60% 100% at 88% 0%, ${skill.avatarGradient[1]}33, transparent 75%)`,
          }}
        />

        <DialogHeader className="relative shrink-0 border-b border-slate-200/70 px-4 py-3.5 pr-28 dark:border-white/10 sm:px-6 sm:py-4 sm:pr-28">
          <div className="flex min-w-0 items-center gap-3">
            <AdvisorPortrait
              skill={skill}
              className="h-11 w-11 shrink-0 shadow-[0_8px_22px_rgba(15,23,42,0.16)] ring-1 ring-white/40"
              pixelSize={44}
              rounded="rounded-2xl"
            />
            <div className="min-w-0">
              <div className="mb-1 flex min-w-0 items-center gap-2">
                <DialogTitle className="truncate text-left text-base font-semibold sm:text-lg">
                  {skill.lensTitle}
                </DialogTitle>
                <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-lime-400/30 bg-lime-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-700 dark:text-lime-200 sm:inline-flex">
                  <span className="size-1.5 rounded-full bg-lime-400" aria-hidden />
                  {ui.lensBadge}
                </span>
              </div>
              <DialogDescription className="truncate text-left text-xs">
                {ui.disclaimerShort}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {messages.length > 0 || loading ? (
          <OSIconControl
            type="button"
            osSize="compact"
            className="absolute right-16 top-3 z-10 rounded-xl sm:top-3.5"
            aria-label={ui.chatNewConversation}
            title={ui.chatNewConversation}
            onClick={startNewConversation}
          >
            <RefreshCcw className="size-4" aria-hidden />
          </OSIconControl>
        ) : null}

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/45 dark:bg-slate-950/28">
          <ScrollArea className="min-h-0 flex-1">
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-busy={loading}
              className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-5 sm:px-7 sm:py-7"
            >
              {messages.length === 0 && !loading ? (
                <div className="my-auto flex flex-col items-center py-6 text-center sm:py-10">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_12px_32px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-white/[0.06]">
                    <Sparkles className="size-5 text-lime-600 dark:text-lime-300" aria-hidden />
                  </div>
                  <h2 className="font-heading text-lg font-semibold text-foreground sm:text-xl">
                    {ui.chatTitle}
                  </h2>
                  <p className="mt-2 max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
                    {ui.chatEmpty}
                  </p>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">
                    {ui.chatSuggestionsLabel}
                  </p>
                  <div className="mt-2.5 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="min-h-12 rounded-2xl border border-slate-200/80 bg-white/72 px-3 py-2.5 text-left text-xs font-medium leading-snug text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition hover:-translate-y-0.5 hover:border-lime-400/60 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 motion-reduce:transform-none motion-reduce:transition-none dark:border-white/10 dark:bg-white/[0.045] dark:text-white/78 dark:hover:border-lime-300/35 dark:hover:bg-white/[0.075]"
                        onClick={() => {
                          setDraft(prompt);
                          composerRef.current?.focus();
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) =>
                    message.role === "user" ? (
                      <div key={message.id} className="flex justify-end">
                        <div className="max-w-[min(86%,38rem)] whitespace-pre-wrap break-words rounded-[1.35rem] rounded-br-md bg-lime-300 px-4 py-2.5 text-sm leading-6 text-slate-950 shadow-[0_10px_28px_rgba(132,204,22,0.12)]">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <div key={message.id} className="group flex items-start gap-2.5 sm:gap-3">
                        <AdvisorPortrait
                          skill={skill}
                          className="mt-0.5 size-8 shrink-0 shadow-sm"
                          pixelSize={32}
                          rounded="rounded-xl"
                        />
                        <article className="relative min-w-0 flex-1 rounded-[1.35rem] rounded-tl-md border border-slate-200/80 bg-white/82 px-4 py-3 pr-11 text-foreground shadow-[0_12px_35px_rgba(15,23,42,0.07)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_16px_40px_rgba(2,8,23,0.2)]">
                          <MindCouncilRichText source={message.content} />
                          <button
                            type="button"
                            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-slate-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-white/10"
                            aria-label={
                              copiedMessageId === message.id ? ui.chatCopied : ui.chatCopyResponse
                            }
                            title={
                              copiedMessageId === message.id ? ui.chatCopied : ui.chatCopyResponse
                            }
                            onClick={() => void copyMessage(message)}
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="size-3.5 text-lime-600 dark:text-lime-300" aria-hidden />
                            ) : (
                              <Clipboard className="size-3.5" aria-hidden />
                            )}
                          </button>
                        </article>
                      </div>
                    ),
                  )}

                  {loading ? (
                    <div className="flex items-start gap-2.5 sm:gap-3" role="status">
                      <AdvisorPortrait
                        skill={skill}
                        className="mt-0.5 size-8 shrink-0 shadow-sm"
                        pixelSize={32}
                        rounded="rounded-xl"
                      />
                      <div className="flex min-h-12 items-center gap-2 rounded-[1.35rem] rounded-tl-md border border-slate-200/80 bg-white/72 px-4 py-3 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.045]">
                        <Loader2 className="size-3.5 animate-spin text-lime-600 motion-reduce:animate-none dark:text-lime-300" aria-hidden />
                        {ui.chatThinking}
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <div
                      role="alert"
                      className="ml-10 flex flex-col gap-3 rounded-2xl border border-red-400/25 bg-red-500/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
                        <span>{error}</span>
                      </div>
                      {failedHistory ? (
                        <button
                          type="button"
                          className="min-h-11 shrink-0 self-start rounded-xl px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 sm:self-auto"
                          onClick={() => void requestReply(failedHistory)}
                        >
                          {ui.chatRetry}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t border-slate-200/70 bg-white/72 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/66 sm:px-6 sm:pb-4 sm:pt-4">
            <form
              className="mx-auto max-w-3xl"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <div className="rounded-2xl border border-slate-300/70 bg-white/86 shadow-[0_10px_30px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.8)] transition focus-within:border-lime-400/60 focus-within:ring-2 focus-within:ring-lime-300/25 dark:border-white/12 dark:bg-white/[0.06] dark:shadow-[0_12px_34px_rgba(2,8,23,0.28)]">
                <Textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={ui.heroPlaceholder}
                  aria-label={ui.heroPlaceholder}
                  rows={1}
                  className="max-h-32 min-h-12 resize-none border-0 bg-transparent px-4 py-3 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent"
                  disabled={loading}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                />
                <div className="flex items-center justify-between gap-3 border-t border-slate-200/60 px-2.5 py-2 dark:border-white/8">
                  <span className="hidden truncate px-1 text-[10px] text-muted-foreground/75 sm:block">
                    {ui.chatInputHint}
                  </span>
                  <span className="truncate px-1 text-[10px] text-muted-foreground/75 sm:hidden">
                    {ui.disclaimerShort}
                  </span>
                  <OSPrimaryAction
                    type="submit"
                    osSize="none"
                    className={cn(
                      "h-11 min-h-11 shrink-0 rounded-xl px-3 text-xs",
                      loading && "cursor-wait",
                    )}
                    disabled={loading || !draft.trim()}
                  >
                    {loading ? (
                      <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <SendHorizontal className="size-3.5" aria-hidden />
                    )}
                    {ui.chatSend}
                  </OSPrimaryAction>
                </div>
              </div>
            </form>
          </div>
        </div>
      </OSDialogSurface>
    </Dialog>
  );
}
