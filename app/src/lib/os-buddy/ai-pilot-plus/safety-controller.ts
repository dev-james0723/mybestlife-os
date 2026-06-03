import type { AIPilotPlusGestureBindingResolution } from "./gesture-bindings";
import type { AIPilotPlusGestureEvent, AIPilotPlusPilotAction } from "./interfaces";

export type AIPilotPlusSafetyBlockReason =
  | "disabled"
  | "cooldown"
  | "confirmation-required"
  | "confirmation-expired";

export type AIPilotPlusPendingConfirmation = {
  actionKey: string;
  action: AIPilotPlusPilotAction;
  previewLabel: string;
  requestedAt: number;
  expiresAt: number;
};

export type AIPilotPlusSafetyState = {
  lastActionAtByKey: Record<string, number>;
  pendingConfirmation: AIPilotPlusPendingConfirmation | null;
};

export type AIPilotPlusSafetyDecision =
  | {
      allowed: true;
      action: AIPilotPlusPilotAction;
      next: AIPilotPlusSafetyState;
      pendingConfirmation: null;
      blockedReason: null;
    }
  | {
      allowed: false;
      action: null;
      next: AIPilotPlusSafetyState;
      pendingConfirmation: AIPilotPlusPendingConfirmation | null;
      blockedReason: AIPilotPlusSafetyBlockReason;
    };

export const DEFAULT_AI_PILOT_PLUS_CONFIRMATION_WINDOW_MS = 2_500;

export function createAIPilotPlusSafetyState(): AIPilotPlusSafetyState {
  return {
    lastActionAtByKey: {},
    pendingConfirmation: null,
  };
}

function stableActionKey(resolution: AIPilotPlusGestureBindingResolution) {
  return `${resolution.binding.id}:${resolution.action.type}`;
}

function isConfirmationGesture(event: AIPilotPlusGestureEvent) {
  return event.type === "pinchIndex" || event.type === "fingerCount";
}

function rememberAction(
  state: AIPilotPlusSafetyState,
  actionKey: string,
  now: number,
): AIPilotPlusSafetyState {
  return {
    lastActionAtByKey: {
      ...state.lastActionAtByKey,
      [actionKey]: now,
    },
    pendingConfirmation: null,
  };
}

export function guardAIPilotPlusAction(params: {
  previous: AIPilotPlusSafetyState;
  now: number;
  resolution: AIPilotPlusGestureBindingResolution;
  event: AIPilotPlusGestureEvent;
  enabled?: boolean;
  confirmationWindowMs?: number;
}): AIPilotPlusSafetyDecision {
  if (params.enabled === false) {
    return {
      allowed: false,
      action: null,
      next: params.previous,
      pendingConfirmation: params.previous.pendingConfirmation,
      blockedReason: "disabled",
    };
  }

  const actionKey = stableActionKey(params.resolution);
  const lastActionAt = params.previous.lastActionAtByKey[actionKey] ?? Number.NEGATIVE_INFINITY;
  if (params.now - lastActionAt < params.resolution.cooldownMs) {
    return {
      allowed: false,
      action: null,
      next: params.previous,
      pendingConfirmation: params.previous.pendingConfirmation,
      blockedReason: "cooldown",
    };
  }

  if (!params.resolution.requiresConfirmation) {
    return {
      allowed: true,
      action: params.resolution.action,
      next: rememberAction(params.previous, actionKey, params.now),
      pendingConfirmation: null,
      blockedReason: null,
    };
  }

  const confirmationWindowMs =
    params.confirmationWindowMs ?? DEFAULT_AI_PILOT_PLUS_CONFIRMATION_WINDOW_MS;
  const pending = params.previous.pendingConfirmation;
  const pendingMatches = pending?.actionKey === actionKey;
  const pendingExpired = Boolean(pending && params.now > pending.expiresAt);

  if (pendingMatches && !pendingExpired && isConfirmationGesture(params.event)) {
    return {
      allowed: true,
      action: params.resolution.action,
      next: rememberAction(params.previous, actionKey, params.now),
      pendingConfirmation: null,
      blockedReason: null,
    };
  }

  const nextPending: AIPilotPlusPendingConfirmation = {
    actionKey,
    action: params.resolution.action,
    previewLabel: params.resolution.previewLabel,
    requestedAt: params.now,
    expiresAt: params.now + confirmationWindowMs,
  };
  const next = {
    ...params.previous,
    pendingConfirmation: nextPending,
  };

  return {
    allowed: false,
    action: null,
    next,
    pendingConfirmation: nextPending,
    blockedReason: pendingExpired ? "confirmation-expired" : "confirmation-required",
  };
}
