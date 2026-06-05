import type { LifeAgentMode } from "@/lib/life-agent/types";

export const CHARACTER_AVATAR_STATES = [
  "listening",
  "thinking",
  "planning",
  "reflecting",
  "protecting",
  "celebrating",
  "focused",
  "concerned",
] as const;

export type CharacterAvatarState = (typeof CHARACTER_AVATAR_STATES)[number];

export const COMPANION_ARRIVAL_STATES = [
  "focused",
  "tired",
  "anxious",
  "creative",
  "scattered",
  "quiet",
  "heavy",
  "motivated",
] as const;

export type CompanionArrivalState = (typeof COMPANION_ARRIVAL_STATES)[number];

export const CALM_ARRIVAL_STATES: CompanionArrivalState[] = [
  "tired",
  "anxious",
  "quiet",
  "heavy",
  "scattered",
];

export type CompanionPresenceState = {
  arrival: CompanionArrivalState | null;
  checkInCompletedAt: string | null;
  dismissedContinuityId: string | null;
};

export type ContinuityCardData = {
  id: string;
  message: string;
  memorySourceId: string;
  suggestedPrompt?: string;
};

export type ResolveAvatarStateInput = {
  mode: LifeAgentMode;
  isSending: boolean;
  isChatPending: boolean;
  isUploadBusy?: boolean;
  celebrating: boolean;
  arrival: CompanionArrivalState | null;
};
