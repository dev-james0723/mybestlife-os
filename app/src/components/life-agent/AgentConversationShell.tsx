"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import {
  parseMessageActionPreviews,
  parseMessageMemoryUsed,
} from "@/lib/life-agent/message-metadata";
import type { CharacterAvatarState } from "@/lib/life-agent/companion-presence-types";
import type { LifeAgentCharacterPreset, LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentPermissionDomain } from "@/types/life-agent";
import type { LifeAgentMessage } from "@/types/life-agent";
import { AgentActionReviewDrawer } from "@/components/life-agent/AgentActionReviewDrawer";
import { AgentCommandBar } from "@/components/life-agent/AgentCommandBar";
import { AgentMemoryUsedPanel } from "@/components/life-agent/AgentMemoryUsedPanel";
import { AgentUploadDropzone } from "@/components/life-agent/AgentUploadDropzone";
import { UploadAnalysisReview } from "@/components/life-agent/UploadAnalysisReview";
import {
  useAnalyzeLifeAgentUpload,
  useRouteLifeAgentUploadIntent,
} from "@/hooks/use-life-agent-uploads";
import type { AnalyzeUploadResponse, LifeAgentUploadIntent } from "@/lib/life-agent/upload-types";
import { CharacterAvatar } from "@/components/life-agent/CharacterAvatar";
import { GentleCelebrationCard } from "@/components/life-agent/GentleCelebrationCard";
import { cn } from "@/lib/utils";

type AgentConversationShellProps = {
  ui: LifeAgentUiCopy;
  character: LifeAgentCharacterPreset;
  draft: string;
  onDraftChange: (value: string) => void;
  showPrefillHint: boolean;
  messages: LifeAgentMessage[];
  messagesLoading: boolean;
  onSend: () => void;
  canSend: boolean;
  isSending: boolean;
  chatError: string | null;
  onRetry?: () => void;
  latestMemoryUsed?: LifeAgentMemoryUsedItem[];
  actionPreviews: LifeAgentActionPreviewCard[];
  onConfirmAction: (id: string, domain: LifeAgentPermissionDomain) => Promise<void>;
  onConfirmAllActions: (ids: string[]) => Promise<void>;
  onCancelAction: (id: string) => Promise<void>;
  onCancelAllActions: (ids: string[]) => Promise<void>;
  conversationId: string | null;
  onUploadActionPreviews: (previews: LifeAgentActionPreviewCard[]) => void;
  onUploadMemoryUsed?: (items: LifeAgentMemoryUsedItem[]) => void;
  mode?: LifeAgentMode;
  avatarState?: CharacterAvatarState;
  calmMode?: boolean;
  celebrationMessage?: string | null;
  hasOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
  isLoadingOlderMessages?: boolean;
};

export function AgentConversationShell({
  ui,
  character,
  draft,
  onDraftChange,
  showPrefillHint,
  messages,
  messagesLoading,
  onSend,
  canSend,
  isSending,
  chatError,
  onRetry,
  latestMemoryUsed = [],
  actionPreviews,
  onConfirmAction,
  onConfirmAllActions,
  onCancelAction,
  onCancelAllActions,
  conversationId,
  onUploadActionPreviews,
  onUploadMemoryUsed,
  mode = "companion",
  avatarState = "listening",
  calmMode = false,
  celebrationMessage = null,
  hasOlderMessages = false,
  onLoadOlderMessages,
  isLoadingOlderMessages = false,
}: AgentConversationShellProps) {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const analyzeUpload = useAnalyzeLifeAgentUpload();
  const routeIntent = useRouteLifeAgentUploadIntent();
  const [uploadResult, setUploadResult] = useState<AnalyzeUploadResponse | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<LifeAgentUploadIntent | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  const hasMessages = messages.length > 0;
  const uploadBusy = analyzeUpload.isPending || routeIntent.isPending;

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setRouteError(null);
      setSelectedIntent(null);
      try {
        const result = await analyzeUpload.mutateAsync(file);
        setUploadResult(result);
      } catch (e) {
        setUploadResult(null);
        setUploadError(e instanceof Error ? e.message : ui.uploadAnalyzeFailed);
      }
    },
    [analyzeUpload, ui.uploadAnalyzeFailed],
  );

  const handleDismissUpload = useCallback(() => {
    setUploadResult(null);
    setSelectedIntent(null);
    setUploadError(null);
    setRouteError(null);
  }, []);

  const handleConfirmIntent = useCallback(async () => {
    if (!uploadResult || !selectedIntent) return;
    setRouteError(null);
    try {
      const routed = await routeIntent.mutateAsync({
        uploadId: uploadResult.uploadId,
        intent: selectedIntent,
        conversationId: conversationId ?? undefined,
      });
      onUploadActionPreviews(routed.actionPreviews);
      if (onUploadMemoryUsed && routed.memoryUsed.length) {
        onUploadMemoryUsed(routed.memoryUsed);
      }
      handleDismissUpload();
    } catch (e) {
      setRouteError(e instanceof Error ? e.message : ui.workflowError);
    }
  }, [
    conversationId,
    handleDismissUpload,
    onUploadActionPreviews,
    onUploadMemoryUsed,
    routeIntent,
    selectedIntent,
    ui.workflowError,
    uploadResult,
  ]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const memoryFromMessage = lastAssistant ? parseMessageMemoryUsed(lastAssistant) : [];
  const previewsFromMessage = lastAssistant ? parseMessageActionPreviews(lastAssistant) : [];
  const memoryUsed = latestMemoryUsed.length ? latestMemoryUsed : memoryFromMessage;
  const previews = actionPreviews.length ? actionPreviews : previewsFromMessage;

  useEffect(() => {
    if (!scrollRef.current || !hasMessages) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, isSending, hasMessages]);

  return (
    <section
      className={cn(
        "flex min-h-[22rem] flex-col rounded-3xl border shadow-sm backdrop-blur-sm",
        calmMode
          ? "border-rose-200/40 bg-gradient-to-b from-rose-50/50 to-card/60 dark:border-rose-900/30 dark:from-rose-950/20"
          : "border-border/60 bg-card/40",
      )}
      aria-labelledby="life-agent-conversation-heading"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
        <div>
          <h2 id="life-agent-conversation-heading" className="text-base font-semibold">
            {ui.conversationTitle}
          </h2>
          <p className="text-xs text-muted-foreground">{ui.conversationSubtitle}</p>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
          {ui.conversationPhaseBadge}
        </Badge>
      </header>

      <div
        ref={scrollRef}
        className={cn(
          "flex max-h-[min(52dvh,32rem)] flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5",
          !hasMessages && !isSending && "items-center justify-center py-8 text-center",
        )}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasOlderMessages && onLoadOlderMessages && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mx-auto rounded-full text-xs"
            disabled={isLoadingOlderMessages}
            onClick={onLoadOlderMessages}
          >
            {ui.loadOlderMessages}
          </Button>
        )}
        {!hasMessages && !messagesLoading && !isSending && (
          <>
            <CharacterAvatar
              character={character}
              ui={ui}
              size="lg"
              selected
              state={avatarState}
              mode={mode}
              showStatus
            />
            <div className="mx-auto max-w-md space-y-2">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4" aria-hidden />
                <p className="text-sm font-medium text-foreground">{ui.conversationEmptyTitle}</p>
              </div>
              <p className="text-sm text-muted-foreground">{ui.conversationEmptyBody}</p>
            </div>
          </>
        )}

        {messagesLoading && !hasMessages && (
          <p className="text-sm text-muted-foreground">{ui.messagesLoading}</p>
        )}

        {hasMessages && (
          <ul className="flex w-full flex-col gap-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-primary/10 text-foreground"
                    : "mr-auto bg-muted/50 text-foreground",
                )}
              >
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {message.role === "user" ? ui.messageListYou : character.name}
                </span>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </li>
            ))}
          </ul>
        )}

        {isSending && (
          <p className="mr-auto max-w-[92%] rounded-2xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <span className="text-[10px] font-medium uppercase tracking-wide">{character.name}</span>
            <span
              className={cn("mt-1 block", !reduceMotion && "animate-pulse motion-reduce:animate-none")}
            >
              {ui.chatThinking}
            </span>
          </p>
        )}

        {chatError && (
          <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <p>{ui.chatError}</p>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 rounded-lg text-xs"
                onClick={onRetry}
              >
                {ui.chatErrorRetry}
              </Button>
            )}
          </div>
        )}

        {!calmMode && !isSending && memoryUsed.length > 0 && (
          <AgentMemoryUsedPanel ui={ui} items={memoryUsed} className="w-full" />
        )}

        {celebrationMessage && (
          <GentleCelebrationCard ui={ui} message={celebrationMessage} className="w-full" />
        )}

        {!calmMode && !isSending && previews.length > 0 && (
          <AgentActionReviewDrawer
            ui={ui}
            previews={previews}
            onConfirm={onConfirmAction}
            onConfirmAll={onConfirmAllActions}
            onCancel={onCancelAction}
            onCancelAll={onCancelAllActions}
            className="w-full"
          />
        )}
      </div>

      <footer className="space-y-3 border-t border-border/50 p-3 sm:p-4">
        {!calmMode && !uploadResult && !uploadBusy && (
          <AgentUploadDropzone ui={ui} onFile={handleFile} isBusy={uploadBusy} />
        )}
        {uploadBusy && !uploadResult && (
          <p className="text-center text-sm text-muted-foreground">{ui.uploadAnalyzing}</p>
        )}
        {uploadError && (
          <p className="text-center text-sm text-destructive" role="alert">
            {uploadError === "analyze_failed" ? ui.uploadAnalyzeFailed : uploadError}
          </p>
        )}
        {uploadResult && (
          <UploadAnalysisReview
            ui={ui}
            result={uploadResult}
            selectedIntent={selectedIntent}
            onSelectIntent={setSelectedIntent}
            onConfirmIntent={() => void handleConfirmIntent()}
            onDismiss={handleDismissUpload}
            isRouting={routeIntent.isPending}
            routeError={routeError}
          />
        )}
        <AgentCommandBar
          ui={ui}
          value={draft}
          onChange={onDraftChange}
          onSend={onSend}
          onFileSelected={handleFile}
          canSend={canSend}
          isSending={isSending}
          uploadBusy={uploadBusy}
          showPrefillHint={showPrefillHint}
        />
      </footer>
    </section>
  );
}
