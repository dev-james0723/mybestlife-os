"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Shield } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useProfile } from "@/hooks/use-settings";
import {
  useCancelLifeAgentAction,
  useConfirmLifeAgentAction,
  useLifeAgentChat,
  useLifeAgentConversations,
  useLifeAgentMemories,
  useLifeAgentMessages,
  useLoadOlderLifeAgentMessages,
  useLifeAgentPermissions,
  useLifeAgentProfile,
  useUpdateLifeAgentConversation,
  useUpsertLifeAgentPermission,
  useUpsertLifeAgentProfile,
} from "@/hooks/use-life-agent";
import { useCompanionPresence } from "@/hooks/use-companion-presence";
import { getLifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import { parseAppLocale } from "@/lib/i18n/app-locale";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import type { LifeAgentMemoryUsedItem } from "@/lib/life-agent/context-types";
import {
  getDefaultLifeAgentCharacter,
  getLifeAgentCharacterById,
  LIFE_AGENT_CHARACTER_PRESETS,
} from "@/lib/life-agent/character-presets";
import { buildCelebrationMessage } from "@/lib/life-agent/celebration";
import {
  isCalmArrivalState,
  resolveAvatarState,
  resolveDisplayCharacter,
} from "@/lib/life-agent/character-state";
import { buildContinuityFromMemories } from "@/lib/life-agent/continuity";
import { profileInputFromCharacterId } from "@/lib/life-agent/profile-from-preset";
import { readLifeAgentShellState } from "@/lib/life-agent/shell-storage";
import type { LifeAgentMode } from "@/lib/life-agent/types";
import type { LifeAgentAccessLevel, LifeAgentPermissionDomain } from "@/types/life-agent";
import { CharacterCustomizer } from "@/components/life-agent/CharacterCustomizer";
import { CompanionCheckIn } from "@/components/life-agent/CompanionCheckIn";
import { LifeAgentHero } from "@/components/life-agent/LifeAgentHero";
import { CharacterPicker } from "@/components/life-agent/CharacterPicker";
import { WarmContinuityCard } from "@/components/life-agent/WarmContinuityCard";
import { AgentModeSwitcher } from "@/components/life-agent/AgentModeSwitcher";
import { AgentConversationShell } from "@/components/life-agent/AgentConversationShell";
import { AgentPermissionPanel } from "@/components/life-agent/AgentPermissionPanel";
import { LifeAgentIntelligenceHub } from "@/components/life-agent/LifeAgentIntelligenceHub";
import { LifeAgentOrchestrationHub } from "@/components/life-agent/LifeAgentOrchestrationHub";
import { SuggestedWorkflowCards } from "@/components/life-agent/SuggestedWorkflowCards";
import { mergeActionPreviews } from "@/hooks/use-life-agent-workflows";
import { cn } from "@/lib/utils";

const CELEBRATION_MS = 6000;

export function LifeAgentPage() {
  const language = useAppStore((s) => s.language);
  const ui = useMemo(() => getLifeAgentUiCopy(language), [language]);
  const { data: settingsProfile } = useProfile();

  const { data: agentProfile, isLoading: profileLoading } = useLifeAgentProfile();
  const { data: memories = [] } = useLifeAgentMemories();
  const upsertProfile = useUpsertLifeAgentProfile();
  const presence = useCompanionPresence();
  const { data: permissions, isLoading: permissionsLoading } = useLifeAgentPermissions();
  const upsertPermission = useUpsertLifeAgentPermission();
  const { data: conversations } = useLifeAgentConversations();
  const updateConversation = useUpdateLifeAgentConversation();
  const lifeAgentChat = useLifeAgentChat();
  const confirmAction = useConfirmLifeAgentAction();
  const cancelAction = useCancelLifeAgentAction();

  const [mode, setMode] = useState<LifeAgentMode>("companion");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [prefillActive, setPrefillActive] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [latestMemoryUsed, setLatestMemoryUsed] = useState<LifeAgentMemoryUsedItem[]>([]);
  const [actionPreviews, setActionPreviews] = useState<LifeAgentActionPreviewCard[]>([]);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);
  const didMigrateShell = useRef(false);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const characterId = agentProfile?.character_id ?? getDefaultLifeAgentCharacter().id;
  const preset = useMemo(
    () => getLifeAgentCharacterById(characterId) ?? getDefaultLifeAgentCharacter(),
    [characterId],
  );
  const character = useMemo(
    () => resolveDisplayCharacter(preset, agentProfile),
    [preset, agentProfile],
  );

  const arrival = clientReady ? presence.arrival : null;
  const dismissedContinuityId = clientReady ? presence.dismissedContinuityId : null;

  const calmMode = clientReady && isCalmArrivalState(arrival);
  const showCheckIn = arrival === null;

  const continuity = useMemo(() => buildContinuityFromMemories(memories), [memories]);
  const showContinuity =
    clientReady &&
    continuity &&
    continuity.id !== dismissedContinuityId &&
    arrival !== null;

  const avatarState = useMemo(
    () =>
      resolveAvatarState({
        mode,
        isSending: lifeAgentChat.isPending,
        isChatPending: lifeAgentChat.isPending,
        celebrating: Boolean(celebrationMessage),
        arrival,
      }),
    [mode, lifeAgentChat.isPending, celebrationMessage, arrival],
  );

  useEffect(() => {
    return () => {
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    };
  }, []);

  const userDisplayName = settingsProfile?.full_name ?? null;

  const { data: messagesData, isLoading: messagesLoading } =
    useLifeAgentMessages(activeConversationId);
  const loadOlderMessages = useLoadOlderLifeAgentMessages(activeConversationId);
  const messages = messagesData?.messages ?? [];
  const hasOlderMessages = messagesData?.hasMore ?? false;

  const handleLoadOlderMessages = useCallback(() => {
    const oldest = messages[0];
    if (!oldest) return;
    loadOlderMessages.mutate(oldest.created_at);
  }, [loadOlderMessages, messages]);

  useEffect(() => {
    if (didMigrateShell.current || profileLoading) return;
    if (agentProfile) {
      didMigrateShell.current = true;
      return;
    }
    didMigrateShell.current = true;
    const shell = readLifeAgentShellState();
    upsertProfile.mutate(profileInputFromCharacterId(shell.characterId));
    setMode(shell.mode);
  }, [agentProfile, profileLoading, upsertProfile]);

  useEffect(() => {
    if (activeConversationId) return;
    const first = conversations?.[0];
    if (first) {
      setActiveConversationId(first.id);
      setMode(first.mode);
    }
  }, [conversations, activeConversationId]);

  const handleSelectCharacter = useCallback(
    (id: string) => {
      upsertProfile.mutate(profileInputFromCharacterId(id));
    },
    [upsertProfile],
  );

  const handleModeChange = useCallback(
    (nextMode: LifeAgentMode) => {
      setMode(nextMode);
      if (activeConversationId) {
        updateConversation.mutate({
          id: activeConversationId,
          input: { mode: nextMode },
        });
      }
    },
    [activeConversationId, updateConversation],
  );

  const handlePermissionChange = useCallback(
    (domain: LifeAgentPermissionDomain, access_level: LifeAgentAccessLevel) => {
      upsertPermission.mutate({ domain, access_level });
    },
    [upsertPermission],
  );

  const handlePrefill = useCallback((text: string) => {
    setDraft(text);
    setPrefillActive(true);
  }, []);

  const handleDraftChange = useCallback((value: string) => {
    setDraft(value);
    if (value.trim().length === 0) setPrefillActive(false);
  }, []);

  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || lifeAgentChat.isPending) return;

    setChatError(null);
    setLatestMemoryUsed([]);
    setActionPreviews([]);

    try {
      const result = await lifeAgentChat.mutateAsync({
        conversationId: activeConversationId ?? undefined,
        message: content,
        mode,
        characterId,
        locale: parseAppLocale(language),
      });
      setActiveConversationId(result.conversationId);
      setLatestMemoryUsed(result.memoryUsed);
      setActionPreviews(result.actionPreviews);
      setDraft("");
      setPrefillActive(false);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "chat_failed");
    }
  }, [
    activeConversationId,
    characterId,
    draft,
    language,
    lifeAgentChat,
    mode,
  ]);

  const updatePreviewInState = useCallback((updated: LifeAgentActionPreviewCard) => {
    setActionPreviews((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  const triggerCelebration = useCallback((preview: LifeAgentActionPreviewCard) => {
    if (preview.status !== "executed") return;
    const message = buildCelebrationMessage(preview.actionType, preview.title);
    setCelebrationMessage(message);
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    celebrationTimer.current = setTimeout(() => setCelebrationMessage(null), CELEBRATION_MS);
  }, []);

  const handleConfirmAction = useCallback(
    async (previewId: string, domain: LifeAgentPermissionDomain) => {
      const { preview } = await confirmAction.mutateAsync({
        previewId,
        temporaryPermissions: { [domain]: true },
      });
      updatePreviewInState(preview);
      triggerCelebration(preview);
    },
    [confirmAction, triggerCelebration, updatePreviewInState],
  );

  const handleConfirmAllActions = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        const preview = actionPreviews.find((p) => p.id === id);
        if (!preview || preview.status !== "pending") continue;
        try {
          const { preview: updated } = await confirmAction.mutateAsync({
            previewId: id,
            temporaryPermissions: { [preview.domain]: true },
          });
          updatePreviewInState(updated);
          triggerCelebration(updated);
        } catch {
          break;
        }
      }
    },
    [actionPreviews, confirmAction, triggerCelebration, updatePreviewInState],
  );

  const handleCancelAction = useCallback(
    async (previewId: string) => {
      const { preview } = await cancelAction.mutateAsync({ previewId });
      updatePreviewInState(preview);
    },
    [cancelAction, updatePreviewInState],
  );

  const handleCancelAllActions = useCallback(
    async (ids: string[]) => {
      for (const id of ids) {
        try {
          const { preview } = await cancelAction.mutateAsync({ previewId: id });
          updatePreviewInState(preview);
        } catch {
          break;
        }
      }
    },
    [cancelAction, updatePreviewInState],
  );

  const canSend = draft.trim().length > 0 && !lifeAgentChat.isPending;
  const isSending = lifeAgentChat.isPending;

  const permissionPanel = (
    <AgentPermissionPanel
      ui={ui}
      permissions={permissions}
      isLoading={permissionsLoading}
      isSaving={upsertPermission.isPending}
      onAccessLevelChange={handlePermissionChange}
    />
  );

  const handleContinuityContinue = useCallback(
    (suggestedPrompt?: string) => {
      if (suggestedPrompt) handlePrefill(suggestedPrompt);
      if (continuity) presence.dismissContinuity(continuity.id);
    },
    [continuity, handlePrefill, presence],
  );

  return (
    <PageShell title={ui.pageTitle} description={ui.pageDescription}>
      <div className={cn("space-y-8", calmMode && "motion-reduce:space-y-6")}>
        <LifeAgentHero
          ui={ui}
          character={character}
          userDisplayName={userDisplayName}
          mode={mode}
          avatarState={avatarState}
          calmMode={calmMode}
        />

        {showCheckIn && (
          <CompanionCheckIn ui={ui} onSelect={presence.completeCheckIn} />
        )}

        {showContinuity && continuity && (
          <WarmContinuityCard
            ui={ui}
            data={continuity}
            onContinue={handleContinuityContinue}
            onDismiss={() => presence.dismissContinuity(continuity.id)}
          />
        )}

        {calmMode && (
          <section className="rounded-2xl border border-rose-200/40 bg-rose-50/40 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
            <h3 className="text-sm font-semibold">{ui.calmNextStepTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{ui.calmNextStepBody}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 rounded-full"
              onClick={() => handlePrefill(ui.calmNextStepAction)}
            >
              {ui.calmNextStepAction}
            </Button>
          </section>
        )}

        {clientReady && profileLoading && (
          <p className="text-sm text-muted-foreground">{ui.profileLoading}</p>
        )}

        {!calmMode && (
          <div className="lg:hidden">
            <AgentModeSwitcher ui={ui} mode={mode} onModeChange={handleModeChange} />
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div className="min-w-0 space-y-8">
            {!calmMode && (
              <CharacterPicker
                ui={ui}
                characters={LIFE_AGENT_CHARACTER_PRESETS.map((c) =>
                  c.id === characterId ? character : c,
                )}
                selectedId={characterId}
                onSelect={handleSelectCharacter}
              />
            )}

            <CharacterCustomizer
              key={`${characterId}-${agentProfile?.updated_at ?? "default"}`}
              ui={ui}
              character={preset}
              profile={agentProfile}
              isSaving={upsertProfile.isPending}
              onSave={(input) => upsertProfile.mutate(input)}
            />

            {!calmMode && (
              <div className="hidden lg:block">
                <AgentModeSwitcher ui={ui} mode={mode} onModeChange={handleModeChange} />
              </div>
            )}

            {!calmMode && (
              <LifeAgentOrchestrationHub
                ui={ui}
                displayName={userDisplayName}
                conversationId={activeConversationId}
                onMemoryUsed={setLatestMemoryUsed}
                onActionPreviews={(incoming) =>
                  setActionPreviews((prev) => mergeActionPreviews(prev, incoming))
                }
              />
            )}

            {!calmMode && (
              <LifeAgentIntelligenceHub ui={ui} onMemoryUsed={setLatestMemoryUsed} />
            )}

            <AgentConversationShell
              ui={ui}
              character={character}
              draft={draft}
              onDraftChange={handleDraftChange}
              showPrefillHint={prefillActive}
              messages={messages}
              messagesLoading={messagesLoading}
              onSend={() => void sendMessage()}
              canSend={canSend}
              isSending={isSending}
              chatError={chatError}
              onRetry={() => void sendMessage()}
              latestMemoryUsed={calmMode ? [] : latestMemoryUsed}
              actionPreviews={calmMode ? [] : actionPreviews}
              onConfirmAction={handleConfirmAction}
              onConfirmAllActions={handleConfirmAllActions}
              onCancelAction={handleCancelAction}
              onCancelAllActions={handleCancelAllActions}
              conversationId={activeConversationId}
              onUploadActionPreviews={(incoming) =>
                setActionPreviews((prev) => mergeActionPreviews(prev, incoming))
              }
              onUploadMemoryUsed={setLatestMemoryUsed}
              mode={mode}
              avatarState={avatarState}
              calmMode={calmMode}
              celebrationMessage={celebrationMessage}
              hasOlderMessages={hasOlderMessages}
              onLoadOlderMessages={handleLoadOlderMessages}
              isLoadingOlderMessages={loadOlderMessages.isPending}
            />

            {!calmMode && <SuggestedWorkflowCards ui={ui} onPrefill={handlePrefill} />}
          </div>

          <div className="hidden xl:block">
            <div className="sticky top-24 space-y-4">
              <p className="text-xs font-medium text-muted-foreground">{ui.selectedCharacterLabel}</p>
              <p className="text-sm font-semibold">
                {character.displayName}
                <span className="font-normal text-muted-foreground"> · {character.archetype}</span>
              </p>
              {permissionPanel}
            </div>
          </div>
        </div>

        <div className="xl:hidden">
          <Sheet>
            <SheetTrigger
              render={
                <Button type="button" variant="outline" className="w-full gap-2 rounded-2xl">
                  <Shield className="h-4 w-4" />
                  {ui.mobilePermissionsButton}
                </Button>
              }
            />
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>{ui.sheetPermissionsTitle}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 pb-6">{permissionPanel}</div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </PageShell>
  );
}
