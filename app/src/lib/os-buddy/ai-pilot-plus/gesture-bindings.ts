import type {
  AIPilotPlusActionBinding,
  AIPilotPlusGestureEvent,
  AIPilotPlusGestureType,
  AIPilotPlusPageContext,
  AIPilotPlusPilotAction,
  AIPilotPlusPilotMode,
} from "./interfaces";

export type AIPilotPlusGestureBindingResolution = {
  binding: AIPilotPlusActionBinding;
  action: AIPilotPlusPilotAction;
  previewLabel: string;
  requiresConfirmation: boolean;
  cooldownMs: number;
};

const DEFAULT_COOLDOWN_MS = 900;

export const DEFAULT_AI_PILOT_PLUS_ACTION_BINDINGS: AIPilotPlusActionBinding[] = [
  {
    id: "global-confirm",
    pageContext: "global",
    gesture: "pinchIndex",
    mode: "any",
    action: { type: "CONFIRM" },
  },
  {
    id: "global-cancel",
    pageContext: "global",
    gesture: "openPalm",
    mode: "any",
    action: { type: "CANCEL" },
  },
  {
    id: "global-command-palette",
    pageContext: "global",
    gesture: "fingerCount",
    mode: "plusActive",
    action: { type: "OPEN_COMMAND_PALETTE" },
  },
  {
    id: "global-circle-zoom-in",
    pageContext: "global",
    gesture: "circleClockwise",
    mode: "plusActive",
    action: { type: "ZOOM_OSBUDDY", direction: "in", amount: 0.16 },
  },
  {
    id: "global-circle-zoom-out",
    pageContext: "global",
    gesture: "circleCounterclockwise",
    mode: "plusActive",
    action: { type: "ZOOM_OSBUDDY", direction: "out", amount: 0.16 },
  },
  {
    id: "brain-capture",
    pageContext: "brain",
    gesture: "pinchMiddle",
    mode: "plusActive",
    action: { type: "CAPTURE_KNOWLEDGE" },
  },
  {
    id: "brain-expand",
    pageContext: "brain",
    gesture: "twoHandSpread",
    mode: "plusActive",
    action: { type: "BRAIN_EXPAND_GRAPH" },
  },
  {
    id: "brain-collapse",
    pageContext: "brain",
    gesture: "twoHandPinchIn",
    mode: "plusActive",
    action: { type: "BRAIN_COLLAPSE_GRAPH" },
  },
  {
    id: "brain-throw-capture",
    pageContext: "brain",
    gesture: "throw",
    mode: "plusActive",
    action: { type: "CAPTURE_KNOWLEDGE" },
  },
  {
    id: "idea-quick-capture",
    pageContext: "ideaCapture",
    gesture: "pinchMiddle",
    mode: "plusActive",
    action: { type: "CAPTURE_IDEA" },
  },
  {
    id: "idea-inbox",
    pageContext: "ideaCapture",
    gesture: "swipeRight",
    mode: "plusActive",
    action: { type: "IDEA_SEND_TO_INBOX" },
  },
  {
    id: "idea-promote",
    pageContext: "ideaCapture",
    gesture: "swipeUp",
    mode: "plusActive",
    action: { type: "IDEA_PROMOTE_TO_PROJECT" },
    requiresConfirmation: true,
  },
  {
    id: "idea-backlog",
    pageContext: "ideaCapture",
    gesture: "swipeDown",
    mode: "plusActive",
    action: { type: "IDEA_SAVE_BACKLOG" },
  },
  {
    id: "project-next-status",
    pageContext: "project",
    gesture: "swipeRight",
    mode: "plusActive",
    action: { type: "PROJECT_MOVE_NEXT_STATUS" },
  },
  {
    id: "project-previous-status",
    pageContext: "project",
    gesture: "swipeLeft",
    mode: "plusActive",
    action: { type: "PROJECT_MOVE_PREVIOUS_STATUS" },
  },
  {
    id: "project-done",
    pageContext: "project",
    gesture: "fist",
    mode: "plusActive",
    action: { type: "PROJECT_MARK_DONE" },
    requiresConfirmation: true,
  },
  {
    id: "project-break-subtasks",
    pageContext: "project",
    gesture: "twoHandSpread",
    mode: "plusActive",
    action: { type: "PROJECT_BREAK_INTO_SUBTASKS" },
    requiresConfirmation: true,
  },
  {
    id: "project-merge-related",
    pageContext: "project",
    gesture: "twoHandPinchIn",
    mode: "plusActive",
    action: { type: "PROJECT_MERGE_RELATED" },
    requiresConfirmation: true,
  },
  {
    id: "project-add-goal",
    pageContext: "project",
    gesture: "pinchRing",
    mode: "plusActive",
    action: { type: "ADD_GOAL" },
  },
  {
    id: "shortcut-create",
    pageContext: "global",
    gesture: "pinchPinky",
    mode: "plusActive",
    action: { type: "CREATE_SHORTCUT" },
    requiresConfirmation: true,
  },
  {
    id: "popup-confirm",
    pageContext: "popup",
    gesture: "pinchIndex",
    mode: "any",
    action: { type: "CONFIRM" },
  },
  {
    id: "popup-cancel",
    pageContext: "popup",
    gesture: "openPalm",
    mode: "any",
    action: { type: "CANCEL" },
  },
  {
    id: "play-ball-grab",
    pageContext: "playBall",
    gesture: "pinchIndex",
    mode: "plusActive",
    action: { type: "PLAY_BALL_GRAB" },
  },
  {
    id: "play-ball-throw",
    pageContext: "playBall",
    gesture: "throw",
    mode: "plusActive",
    action: { type: "PLAY_BALL_THROW", velocity: { x: 0, y: 0 } },
  },
  {
    id: "play-ball-catch",
    pageContext: "playBall",
    gesture: "catch",
    mode: "plusActive",
    action: { type: "PLAY_BALL_CATCH" },
  },
];

function modeMatches(bindingMode: AIPilotPlusPilotMode | "any", mode: AIPilotPlusPilotMode) {
  return bindingMode === "any" || bindingMode === mode;
}

function contextMatches(
  bindingContext: AIPilotPlusPageContext,
  pageContext: AIPilotPlusPageContext,
) {
  return bindingContext === pageContext || bindingContext === "global";
}

function fingerCountMatches(binding: AIPilotPlusActionBinding, event: AIPilotPlusGestureEvent) {
  if (binding.gesture !== "fingerCount") return true;
  const count = event.metadata?.count;
  if (binding.id === "global-command-palette") return count === 4;
  return typeof count === "number" && count >= 1 && count <= 5;
}

function actionLabel(action: AIPilotPlusPilotAction): string {
  return action.type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function resolveAIPilotPlusGestureBinding(params: {
  event: AIPilotPlusGestureEvent;
  pageContext: AIPilotPlusPageContext;
  mode: AIPilotPlusPilotMode;
  bindings?: AIPilotPlusActionBinding[];
}): AIPilotPlusGestureBindingResolution | null {
  const bindings = params.bindings ?? DEFAULT_AI_PILOT_PLUS_ACTION_BINDINGS;
  const candidates = bindings
    .filter((binding) => binding.enabled !== false)
    .filter((binding) => binding.gesture === params.event.type)
    .filter((binding) => modeMatches(binding.mode, params.mode))
    .filter((binding) => contextMatches(binding.pageContext, params.pageContext))
    .filter((binding) => fingerCountMatches(binding, params.event))
    .sort((a, b) => {
      const aExact = a.pageContext === params.pageContext ? 1 : 0;
      const bExact = b.pageContext === params.pageContext ? 1 : 0;
      return bExact - aExact;
    });

  const binding = candidates[0];
  if (!binding) return null;

  return {
    binding,
    action: binding.action,
    previewLabel: actionLabel(binding.action),
    requiresConfirmation: binding.requiresConfirmation ?? false,
    cooldownMs: binding.cooldownMs ?? DEFAULT_COOLDOWN_MS,
  };
}

export function createAIPilotPlusGestureEventTypeFromCircle(
  direction: "clockwise" | "counterclockwise",
): AIPilotPlusGestureType {
  return direction === "clockwise" ? "circleClockwise" : "circleCounterclockwise";
}
