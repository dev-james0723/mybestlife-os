"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import { Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useOSBuddyFreeRoam } from "@/hooks/use-os-buddy-free-roam";
import { useOSBuddyFreeRoamSettings } from "@/hooks/use-os-buddy-free-roam-settings";
import {
  useOSBuddyBirthday,
  useOSBuddyBirthdayProfile,
} from "@/hooks/use-os-buddy-birthday";
import { useOSBuddyCompanion } from "@/hooks/use-os-buddy-companion";
import { useOSBuddyContextHints } from "@/hooks/use-os-buddy-context-hints";
import { useOSBuddyTimeMood } from "@/hooks/use-os-buddy-time-mood";
import { useUserIdleForOSBuddy } from "@/hooks/use-user-idle-for-os-buddy";
import { useOSBuddyStore, type OSBuddyMiniGame } from "@/stores/os-buddy-store";
import { OSBuddySprite } from "./OSBuddySprite";
import { OSBuddyBubble } from "./OSBuddyBubble";
import { OSBuddyFileDropBubble } from "./OSBuddyFileDropBubble";
import { OSBuddyAirControlOverlay } from "./OSBuddyAirControlOverlay";
import {
  getLocalAirControlCalibration,
  getLocalAirControlSettings,
} from "@/lib/os-buddy/air-control/air-control-settings";
import { getLocalOSBuddyAirPilotSettings } from "@/lib/os-buddy/os-buddy-airpilot-settings";
import { OSBuddyMenu } from "./OSBuddyMenu";
import { OSBuddyPetPicker } from "./OSBuddyPetPicker";
import { OSBuddyFocusBadge } from "./OSBuddyFocusBadge";
import { OSBuddyGameOverlayHost } from "./games/OSBuddyGameOverlayHost";
import {
  OSBuddyPlayBallOverlay,
  type OSBuddyPlayBallCatchSignal,
  type OSBuddyPlayBallEvent,
  type OSBuddyPlayBallOutcome,
} from "./games/OSBuddyPlayBallOverlay";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { registerOSBuddyReactions } from "@/lib/os-buddy/os-buddy-reactions";
import {
  getOSBuddyBirthdayTodayKey,
  isOSBuddyBirthdayToday,
} from "@/lib/os-buddy/os-buddy-birthday";
import {
  addOSBuddyBadge,
  incrementOSBuddyStat,
} from "@/lib/os-buddy/os-buddy-stats";
import {
  createOSBuddyDroppedFileItem,
  type OSBuddyDropDestination,
  type OSBuddyDroppedFileItem,
} from "@/lib/os-buddy/os-buddy-file-drop";
import { routeOSBuddyDroppedFile } from "@/lib/os-buddy/os-buddy-file-drop-routing";
import {
  buildLocalQuickSnapAck,
  createOSBuddyQuickSnapPayloadFromClipboardData,
  createOSBuddyQuickSnapPayloadFromNavigatorClipboard,
  QUICK_SNAP_SHIFT_DOUBLE_TAP_MS,
  registerQuickSnapShiftTap,
  type OSBuddyQuickSnapAckContext,
  type OSBuddyQuickSnapDestination,
  type OSBuddyQuickSnapPayload,
  type OSBuddyQuickSnapShiftTapState,
} from "@/lib/os-buddy/os-buddy-quick-snap";
import { triggerOSBuddyHapticFeedback } from "@/lib/os-buddy/os-buddy-haptics";
import { routeOSBuddyQuickSnapPayload } from "@/lib/os-buddy/os-buddy-quick-snap-routing";
import {
  resolveOSBuddyTapSequence,
  type OSBuddyTapSequence,
} from "@/lib/os-buddy/os-buddy-tap-resolver";
import {
  clickAirPilotTarget,
  resolveAirPilotTargetAtPoint,
  scrollAirPilotTargetAtPoint,
  setAirPilotHighlightedTarget,
} from "@/lib/os-buddy/os-buddy-airpilot-page-control";
import { isPointInsideOSBuddyRestingSpace } from "@/lib/os-buddy/os-buddy-resting-space";
import { cn } from "@/lib/utils";
import { useIdeasStore } from "@/stores/ideas-store";
import { useKnowledgeStore } from "@/stores/knowledge-store";
import type { OSBuddyAirControlCommand } from "@/lib/os-buddy/os-buddy-air-control-types";
import type { OSBuddyMood, OSBuddyPosition } from "@/types/os-buddy";

const DRAG_THRESHOLD_PX = 6;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 24;
const LONG_PRESS_MS = 600;
const VIEWPORT_EDGE_GAP = 12;
const MENU_WIDTH = 270;
const MENU_HEIGHT = 560;
const WALK_FOLLOW_LERP = 0.18;
const WALK_IDLE_DISTANCE_PX = 6;
const WALK_DIRECTION_THRESHOLD_PX = 0.55;
const RETURN_HOME_SPEED_PX = 22;
const RETURN_HOME_SNAP_PX = 4;
const WALK_MOUSE_CLEARANCE_PX = 24;
const WALK_TOUCH_CLEARANCE_PX = 56;
const WALK_MOUSE_OFFSET = { x: 40, y: 32 };
const WALK_TOUCH_OFFSET = { x: 48, y: -88 };
const WALK_EXIT_DOUBLE_TAP_MAX_DISTANCE_PX = 64;
const TRIPLE_TAP_GRACE_MS = 360;
const QUAD_TAP_GRACE_MS = 360;
const BUDDY_SCALE_STEP = 0.16;
const BUDDY_MAX_SCALE_CAP = 12;
const PLAY_BALL_CATCH_SPEED_PX = 38;
const PLAY_BALL_MISS_SPEED_PX = 30;
const PLAY_BALL_CATCH_FORCE_MS = 1_800;
const PLAY_BALL_MISS_RESOLVE_MS = 1_550;
const PLAY_BALL_MISS_FORCE_MS = 2_000;
const FILE_DROP_CATCH_RADIUS_PX = 42;
const QUICK_SNAP_CLOUD_DISPERSE_MS = 420;
const QUICK_SNAP_SUCCESS_RESET_MS = 900;
const BIRTHDAY_EASTER_EGG_STORAGE_KEY = "mblos:os-buddy-birthday-easter-eggs";
const AIRPILOT_SESSION_ACTIVE_KEY = "mblos:airpilot-session-active";
const BIRTHDAY_EASTER_EGG_WINDOW_MS = 5_000;
const BIRTHDAY_EASTER_EGG_EXTENSION_MS = 8_000;
const FREE_ROAM_BLOCKING_MOODS = new Set<OSBuddyMood>([
  "thinking",
  "creating",
  "reading",
  "focused",
  "success",
  "error",
  "celebrating",
]);

type DockPoint = { x: number; y: number };
type WalkDirection = "left" | "right" | "idle";
type PlayBallChaseState = {
  id: number;
  outcome: OSBuddyPlayBallOutcome;
  startedAt: number;
};
type QuickSnapRuntimeState = "idle" | "armed" | "ready" | "saving" | "success" | "error";

type DragSession = {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startDockX: number;
  startDockY: number;
  lastDockX: number;
  isDragging: boolean;
};

function getBirthdayEasterEggMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BIRTHDAY_EASTER_EGG_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
}

function setAirPilotSessionActive(active: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      window.sessionStorage.setItem(AIRPILOT_SESSION_ACTIVE_KEY, "true");
      return;
    }
    window.sessionStorage.removeItem(AIRPILOT_SESSION_ACTIVE_KEY);
  } catch {
    // Session persistence is a convenience; AirPilot still works without it.
  }
}

function shouldRestoreAirPilotSession() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(AIRPILOT_SESSION_ACTIVE_KEY) === "true";
  } catch {
    return false;
  }
}

function hasBirthdayEasterEggTriggered(dateKey: string) {
  return getBirthdayEasterEggMap()[dateKey] === true;
}

function markBirthdayEasterEggTriggered(dateKey: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BIRTHDAY_EASTER_EGG_STORAGE_KEY,
      JSON.stringify({
        ...getBirthdayEasterEggMap(),
        [dateKey]: true,
      }),
    );
  } catch {
    // Easter egg state is non-critical.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampDockPoint(
  point: DockPoint,
  viewport: { width: number; height: number },
  buddyBox: { width: number; height: number },
): DockPoint {
  const maxX = Math.max(VIEWPORT_EDGE_GAP, viewport.width - buddyBox.width - VIEWPORT_EDGE_GAP);
  const maxY = Math.max(VIEWPORT_EDGE_GAP, viewport.height - buddyBox.height - VIEWPORT_EDGE_GAP);

  return {
    x: clamp(point.x, VIEWPORT_EDGE_GAP, maxX),
    y: clamp(point.y, VIEWPORT_EDGE_GAP, maxY),
  };
}

function resolveAnchorPosition(
  position: OSBuddyPosition,
  viewport: { width: number; height: number },
  buddyBox: { width: number; height: number },
): DockPoint {
  if (position.anchor === "custom" && position.x != null && position.y != null) {
    return clampDockPoint({ x: position.x, y: position.y }, viewport, buddyBox);
  }

  const bottomY = viewport.height - buddyBox.height - 24;
  const topY = 24;
  const leftX = 24;
  const rightX = viewport.width - buddyBox.width - 24;

  switch (position.anchor) {
    case "top-left":
      return clampDockPoint({ x: leftX, y: topY }, viewport, buddyBox);
    case "top-right":
      return clampDockPoint({ x: rightX, y: topY }, viewport, buddyBox);
    case "bottom-right":
      return clampDockPoint({ x: rightX, y: bottomY }, viewport, buddyBox);
    case "bottom-left":
    default:
      return clampDockPoint({ x: leftX, y: bottomY }, viewport, buddyBox);
  }
}

function avoidDesktopSidebarForDefaultHome(
  point: DockPoint,
  position: OSBuddyPosition,
  viewport: { width: number; height: number },
  buddyBox: { width: number; height: number },
  sidebarSafeLeft: number,
): DockPoint {
  const isDefaultBottomLeft =
    position.anchor === "bottom-left" && position.x == null && position.y == null;
  if (!isDefaultBottomLeft || viewport.width < 1024 || sidebarSafeLeft <= 24) return point;
  return clampDockPoint({ ...point, x: sidebarSafeLeft }, viewport, buddyBox);
}

function distanceFromPointToDockBox(
  point: DockPoint,
  dockPoint: DockPoint,
  buddyBox: { width: number; height: number },
) {
  const dx = Math.max(dockPoint.x - point.x, 0, point.x - (dockPoint.x + buddyBox.width));
  const dy = Math.max(dockPoint.y - point.y, 0, point.y - (dockPoint.y + buddyBox.height));

  return Math.hypot(dx, dy);
}

function hasFileDragData(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return false;
  return Array.from(dataTransfer.types ?? []).includes("Files");
}

function filesFromDataTransfer(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) return [];
  return Array.from(dataTransfer.files ?? []).filter((file) => file.size > 0 || file.name);
}

function errorMessageFromUnknown(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Unable to route this file.";
}

function getFlippedWalkAxisTarget(
  pointerCoordinate: number,
  buddySize: number,
  baseOffset: number,
  minClearance: number,
  flip: boolean,
) {
  if (!flip) return pointerCoordinate + baseOffset;

  const gap = Math.max(Math.abs(baseOffset), minClearance);
  return baseOffset >= 0
    ? pointerCoordinate - buddySize - gap
    : pointerCoordinate + gap;
}

function getWalkTargetForPointer(params: {
  clientX: number;
  clientY: number;
  pointerType: string;
  viewport: { width: number; height: number };
  buddyBox: { width: number; height: number };
}) {
  const isTouch = params.pointerType === "touch";
  const baseOffset = isTouch ? WALK_TOUCH_OFFSET : WALK_MOUSE_OFFSET;
  const minClearance = isTouch ? WALK_TOUCH_CLEARANCE_PX : WALK_MOUSE_CLEARANCE_PX;
  const pointer = { x: params.clientX, y: params.clientY };
  const flipCandidates = [
    { x: false, y: false },
    { x: true, y: false },
    { x: false, y: true },
    { x: true, y: true },
  ];

  const scoredCandidates = flipCandidates.map((flip, index) => {
    const rawPoint = {
      x: getFlippedWalkAxisTarget(
        params.clientX,
        params.buddyBox.width,
        baseOffset.x,
        minClearance,
        flip.x,
      ),
      y: getFlippedWalkAxisTarget(
        params.clientY,
        params.buddyBox.height,
        baseOffset.y,
        minClearance,
        flip.y,
      ),
    };
    const point = clampDockPoint(rawPoint, params.viewport, params.buddyBox);
    const clampPenalty = Math.hypot(rawPoint.x - point.x, rawPoint.y - point.y);
    const clearance = distanceFromPointToDockBox(pointer, point, params.buddyBox);

    return {
      point,
      clearance,
      clampPenalty,
      score: Math.min(clearance, minClearance) - clampPenalty * 2 - index * 0.01,
    };
  });

  return (
    scoredCandidates.find(
      (candidate) => candidate.clearance >= minClearance && candidate.clampPenalty < 1,
    ) ??
    scoredCandidates.reduce((best, candidate) =>
      candidate.score > best.score ? candidate : best,
    )
  ).point;
}

function isPointNearDockBox(params: {
  clientX: number;
  clientY: number;
  dockPoint: DockPoint;
  buddyBox: { width: number; height: number };
  padding: number;
}) {
  return (
    params.clientX >= params.dockPoint.x - params.padding &&
    params.clientX <= params.dockPoint.x + params.buddyBox.width + params.padding &&
    params.clientY >= params.dockPoint.y - params.padding &&
    params.clientY <= params.dockPoint.y + params.buddyBox.height + params.padding
  );
}

function distanceBetweenTouches(touches: TouchList) {
  if (touches.length < 2) return 0;
  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function pickPlayBallLine(
  locale: string,
  kind: "start" | OSBuddyPlayBallOutcome,
) {
  const lines =
    locale === "zh-TW"
      ? {
          start: ["太好了，一起玩球！", "耶，來玩一下！", "我準備好了，丟過來！"],
          caught: ["接到了！再來一次。", "我抓到啦！", "這球不錯。"],
          missed: ["哎呀，差一點！", "糟糕，沒接住。", "再給我一次機會。"],
        }
      : {
          start: [
            "Hooray, let's play together!",
            "Yes. Toss it my way.",
            "I am ready. Throw the ball!",
          ],
          caught: ["Oh, I got it!", "Caught it. Nice throw.", "That one was mine."],
          missed: ["Oh no!", "I almost had it.", "That one got away."],
        };
  const pool = lines[kind];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

function dockIntersectsBall(params: {
  dockPoint: DockPoint;
  buddyBox: { width: number; height: number };
  ballCenter: DockPoint;
  ballSize: number;
}) {
  const ballLeft = params.ballCenter.x - params.ballSize / 2;
  const ballTop = params.ballCenter.y - params.ballSize / 2;
  return (
    params.dockPoint.x < ballLeft + params.ballSize &&
    params.dockPoint.x + params.buddyBox.width > ballLeft &&
    params.dockPoint.y < ballTop + params.ballSize &&
    params.dockPoint.y + params.buddyBox.height > ballTop
  );
}

function resolveCaughtPlayBallTarget(params: {
  event: OSBuddyPlayBallEvent;
  viewport: { width: number; height: number };
  buddyBox: { width: number; height: number };
}) {
  return clampDockPoint(
    {
      x: params.event.point.x - params.buddyBox.width / 2,
      y: params.event.point.y - params.buddyBox.height / 2,
    },
    params.viewport,
    params.buddyBox,
  );
}

function resolveMissedPlayBallTarget(params: {
  event: OSBuddyPlayBallEvent;
  viewport: { width: number; height: number };
  buddyBox: { width: number; height: number };
}) {
  const clearGap = Math.max(56, params.event.ballSize + 28);
  const candidates = [
    {
      x: params.event.point.x + clearGap,
      y: params.event.point.y - params.buddyBox.height / 2,
    },
    {
      x: params.event.point.x - params.buddyBox.width - clearGap,
      y: params.event.point.y - params.buddyBox.height / 2,
    },
    {
      x: params.event.point.x - params.buddyBox.width / 2,
      y: params.event.point.y - params.buddyBox.height - clearGap,
    },
    {
      x: params.event.point.x - params.buddyBox.width / 2,
      y: params.event.point.y + clearGap,
    },
  ].map((point) => clampDockPoint(point, params.viewport, params.buddyBox));

  const scored = candidates.map((point) => ({
    point,
    intersects: dockIntersectsBall({
      dockPoint: point,
      buddyBox: params.buddyBox,
      ballCenter: params.event.point,
      ballSize: params.event.ballSize,
    }),
    distance: Math.hypot(
      point.x + params.buddyBox.width / 2 - params.event.point.x,
      point.y + params.buddyBox.height / 2 - params.event.point.y,
    ),
  }));

  return (
    scored.find((candidate) => !candidate.intersects) ??
    scored.reduce((best, candidate) =>
      candidate.distance > best.distance ? candidate : best,
    )
  ).point;
}

function OSBuddyQuickSnapClouds({
  fixedStyle,
  dismissing,
  saving,
  onSelect,
}: {
  fixedStyle?: CSSProperties;
  dismissing: boolean;
  saving: boolean;
  onSelect: (destination: OSBuddyQuickSnapDestination) => void;
}) {
  const renderCloudButton = (destination: OSBuddyQuickSnapDestination, title: string) => (
    <button
      type="button"
      className={cn(
        "os-buddy-quick-snap-cloud",
        destination === "idea"
          ? "os-buddy-quick-snap-cloud--idea"
          : "os-buddy-quick-snap-cloud--knowledge",
      )}
      disabled={saving}
      aria-label={`Quick Snap to ${title}`}
      onClick={() => onSelect(destination)}
    >
      <span className="os-buddy-quick-snap-cloud-shape" aria-hidden>
        <span className="os-buddy-quick-snap-cloud-art" />
        <span className="os-buddy-quick-snap-cloud-sparkles">
          <span />
          <span />
          <span />
          <span />
        </span>
        <span className="os-buddy-quick-snap-cloud-mist">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="os-buddy-quick-snap-cloud-content">
        <span className="os-buddy-quick-snap-cloud-copy">
          <span className="os-buddy-quick-snap-cloud-kicker">Quick Snap</span>
          <span className="os-buddy-quick-snap-cloud-title">{title}</span>
        </span>
      </span>
    </button>
  );

  return (
    <div
      className="os-buddy-quick-snap-clouds"
      data-state={dismissing ? "dismissing" : saving ? "saving" : "ready"}
      style={fixedStyle}
      role="group"
      aria-label="OS Buddy Quick Snap destinations"
    >
      <div className="os-buddy-quick-snap-cloud-row">
        {renderCloudButton("idea", "Idea Capture")}
        {renderCloudButton("knowledge", "Knowledge Base")}
      </div>
      <div className="os-buddy-quick-snap-keyhint">
        {saving ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Saving...
          </>
        ) : (
          <>
            <Cloud className="size-3" aria-hidden />
            Shift once: Idea Capture · Shift twice: Knowledge Base
          </>
        )}
      </div>
    </div>
  );
}

export function OSBuddyDock() {
  const locale = useAppStore((s) => s.language);
  const pathname = usePathname();
  const onSignalsRoute = useMemo(
    () => /\/signals(?:\/|$)/.test(pathname ?? ""),
    [pathname],
  );

  const {
    enabled,
    petId,
    name,
    position: storedPosition,
    mood,
    animationSrc,
    setMood,
    showBubble,
    savePosition,
    resetPosition,
    renameBuddy,
    changePet,
    setEnabled,
  } = useOSBuddy();
  const {
    settings: freeRoamSettings,
  } = useOSBuddyFreeRoamSettings();
  const bubble = useOSBuddyStore((s) => s.bubble);
  const clearBubble = useOSBuddyStore((s) => s.clearBubble);
  const isMenuOpen = useOSBuddyStore((s) => s.isMenuOpen);
  const setMenuOpen = useOSBuddyStore((s) => s.setMenuOpen);
  const setDragging = useOSBuddyStore((s) => s.setDragging);
  const isDragging = useOSBuddyStore((s) => s.isDragging);
  const isWalkModeActive = useOSBuddyStore((s) => s.isWalkModeActive);
  const isReturningHome = useOSBuddyStore((s) => s.isReturningHome);
  const isAirControlActive = useOSBuddyStore((s) => s.isAirControlActive);
  const airPilotPlusMode = useOSBuddyStore((s) => s.airPilotPlusMode);
  const setWalkModeActive = useOSBuddyStore((s) => s.setWalkModeActive);
  const setReturningHome = useOSBuddyStore((s) => s.setReturningHome);
  const startAirControl = useOSBuddyStore((s) => s.startAirControl);
  const stopAirControl = useOSBuddyStore((s) => s.stopAirControl);
  const setAirControlSensorMode = useOSBuddyStore((s) => s.setAirControlSensorMode);
  const setAirControlCalibration = useOSBuddyStore((s) => s.setAirControlCalibration);
  const setAirControlDebugEnabled = useOSBuddyStore((s) => s.setAirControlDebugEnabled);
  const temporarilySetMood = useOSBuddyStore((s) => s.temporarilySetMood);
  const registerClickBurst = useOSBuddyStore((s) => s.registerClickBurst);
  const resetClickBurst = useOSBuddyStore((s) => s.resetClickBurst);
  const isPetPickerOpen = useOSBuddyStore((s) => s.isPetPickerOpen);
  const setPetPickerOpen = useOSBuddyStore((s) => s.setPetPickerOpen);
  const isMiniGameOpen = useOSBuddyStore((s) => s.isMiniGameOpen);
  const activeMiniGame = useOSBuddyStore((s) => s.activeMiniGame);
  const openMiniGame = useOSBuddyStore((s) => s.openMiniGame);
  const closeMiniGame = useOSBuddyStore((s) => s.closeMiniGame);
  const focusSession = useOSBuddyStore((s) => s.focusSession);
  const setFocusSession = useOSBuddyStore((s) => s.setFocusSession);
  const isBirthdayMode = useOSBuddyStore((s) => s.isBirthdayMode);
  const setBirthdayMode = useOSBuddyStore((s) => s.setBirthdayMode);
  const isFreeRoaming = useOSBuddyStore((s) => s.isFreeRoaming);
  const isRestingInSidebar = useOSBuddyStore((s) => s.isRestingInSidebar);
  const dockInRestingSpace = useOSBuddyStore((s) => s.dockInRestingSpace);
  const { profile: birthdayProfile, saveProfile: saveBirthdayProfile } =
    useOSBuddyBirthdayProfile();
  const { getCompanionLine } = useOSBuddyCompanion({ locale, buddyName: name });
  const isPlayBallOpen = isMiniGameOpen && activeMiniGame === "play-ball";
  const isOverlayMiniGameOpen =
    isMiniGameOpen && activeMiniGame != null && activeMiniGame !== "play-ball";
  const upsertKnowledgeItem = useKnowledgeStore((s) => s.upsertItem);
  const upsertIdea = useIdeasStore((s) => s.upsertIdea);

  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [sidebarSafeLeft, setSidebarSafeLeft] = useState(24);
  const [activePosition, setActivePosition] = useState<OSBuddyPosition>({
    x: null,
    y: null,
    anchor: "bottom-left",
  });
  const [dockPoint, setDockPoint] = useState<DockPoint>({ x: 0, y: 0 });
  const [menuPoint, setMenuPoint] = useState<DockPoint>({ x: 0, y: 0 });
  const [buddyScale, setBuddyScale] = useState(1);
  const [secretModeActive, setSecretModeActive] = useState(false);
  const [playBallCatchSignal, setPlayBallCatchSignal] =
    useState<OSBuddyPlayBallCatchSignal | null>(null);
  const [isOverlayMiniGamePresent, setOverlayMiniGamePresent] = useState(false);
  const [fileDropItems, setFileDropItems] = useState<OSBuddyDroppedFileItem[]>([]);
  const [isFileDragOverBuddy, setIsFileDragOverBuddy] = useState(false);
  const [isFileDropRouting, setIsFileDropRouting] = useState(false);
  const [quickSnapState, setQuickSnapState] = useState<QuickSnapRuntimeState>("idle");
  const [quickSnapPayload, setQuickSnapPayload] =
    useState<OSBuddyQuickSnapPayload | null>(null);
  const [quickSnapCloudsDismissing, setQuickSnapCloudsDismissing] = useState(false);
  const [quickSnapClipboardPending, setQuickSnapClipboardPending] = useState(false);
  const isQuickSnapActive = quickSnapState !== "idle";

  const handleOverlayMiniGameExitComplete = useCallback(() => {
    if (!isOverlayMiniGameOpen) setOverlayMiniGamePresent(false);
  }, [isOverlayMiniGameOpen]);

  const openMiniGameWithPresence = useCallback(
    (game: OSBuddyMiniGame) => {
      if (game !== "play-ball") setOverlayMiniGamePresent(true);
      openMiniGame(game);
    },
    [openMiniGame],
  );

  useOSBuddyBirthday({
    enabled: mounted && enabled,
    locale,
    profile: birthdayProfile,
    saveProfile: saveBirthdayProfile,
  });

  const baseBuddyBox = useMemo(
    () => ({
      width: viewport.width > 0 && viewport.width < 640 ? 58 : 74,
      height: viewport.width > 0 && viewport.width < 640 ? 64 : 82,
    }),
    [viewport.width],
  );
  const maxBuddyScale = useMemo(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return 1;
    return Math.max(
      1,
      Math.min(
        BUDDY_MAX_SCALE_CAP,
        (viewport.width - VIEWPORT_EDGE_GAP * 2) / baseBuddyBox.width,
        (viewport.height - VIEWPORT_EDGE_GAP * 2) / baseBuddyBox.height,
      ),
    );
  }, [baseBuddyBox.height, baseBuddyBox.width, viewport.height, viewport.width]);
  const buddyBox = useMemo(
    () => ({
      width: baseBuddyBox.width * buddyScale,
      height: baseBuddyBox.height * buddyScale,
    }),
    [baseBuddyBox.height, baseBuddyBox.width, buddyScale],
  );
  const restingPosition = useMemo<OSBuddyPosition>(
    () => ({
      anchor: storedPosition.anchor,
      x: storedPosition.x,
      y: storedPosition.y,
    }),
    [storedPosition.anchor, storedPosition.x, storedPosition.y],
  );
  const resolvedHomePosition = useMemo<DockPoint | null>(() => {
    if (!mounted || viewport.width <= 0 || viewport.height <= 0) return null;
    const target = resolveAnchorPosition(restingPosition, viewport, buddyBox);
    return avoidDesktopSidebarForDefaultHome(
      target,
      restingPosition,
      viewport,
      buddyBox,
      sidebarSafeLeft,
    );
  }, [buddyBox, mounted, restingPosition, sidebarSafeLeft, viewport]);
  const isFreeRoamBlocked =
    isMenuOpen ||
    isPetPickerOpen ||
    isMiniGameOpen ||
    isDragging ||
    isWalkModeActive ||
    isReturningHome ||
    isAirControlActive ||
    isFileDragOverBuddy ||
    fileDropItems.length > 0 ||
    isQuickSnapActive ||
    focusSession != null ||
    isBirthdayMode ||
    isRestingInSidebar ||
    FREE_ROAM_BLOCKING_MOODS.has(mood);
  const { runtimePosition: freeRoamRuntimePosition, interruptFreeRoam } =
    useOSBuddyFreeRoam({
      enabled: mounted && enabled && freeRoamSettings.enabled,
      intensity: freeRoamSettings.intensity,
      returnHomeAfterRoam: freeRoamSettings.returnHomeAfterRoam,
      roamNearHomeOnly: freeRoamSettings.roamNearHomeOnly,
      buddyWidth: buddyBox.width,
      buddyHeight: buddyBox.height,
      homePosition: resolvedHomePosition,
      isBlocked: isFreeRoamBlocked,
    });

  const dragSessionRef = useRef<DragSession | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef<OSBuddyTapSequence | null>(null);
  const lastWalkExitTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinchScaleRef = useRef<{ distance: number; scale: number } | null>(null);
  const activeWalkPointerIdRef = useRef<number | null>(null);
  const walkPointerRef = useRef<{ x: number; y: number; pointerType: string } | null>(null);
  const walkAnimationFrameRef = useRef<number | null>(null);
  const playBallChaseFrameRef = useRef<number | null>(null);
  const playBallTargetRef = useRef<OSBuddyPlayBallEvent | null>(null);
  const playBallChaseStateRef = useRef<PlayBallChaseState | null>(null);
  const walkDirectionRef = useRef<WalkDirection | null>(null);
  const walkTargetRef = useRef<DockPoint | null>(null);
  const restingTargetRef = useRef<DockPoint | null>(null);
  const dockPointRef = useRef<DockPoint>({ x: 0, y: 0 });
  const airGrabOffsetRef = useRef<DockPoint | null>(null);
  const airPilotHoverTargetRef = useRef<HTMLElement | null>(null);
  const restoredAirPilotSessionRef = useRef(false);
  const fileDragOverBuddyRef = useRef(false);
  const quickSnapPasteTargetRef = useRef<HTMLTextAreaElement | null>(null);
  const quickSnapShiftStateRef = useRef<OSBuddyQuickSnapShiftTapState>({
    count: 0,
    lastAt: null,
  });
  const quickSnapSingleShiftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickSnapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secretModeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const birthdayClickBurstRef = useRef<{
    dateKey: string | null;
    startedAt: number;
    count: number;
  }>({
    dateKey: null,
    startedAt: 0,
    count: 0,
  });
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Load persisted Air Touch calibration + debug preference (numbers only).
  useEffect(() => {
    const calibration = getLocalAirControlCalibration();
    if (calibration) setAirControlCalibration(calibration);
    const settings = getLocalAirControlSettings();
    setAirControlDebugEnabled(settings.showDebugOverlay);
  }, [setAirControlCalibration, setAirControlDebugEnabled]);

  useEffect(() => {
    dockPointRef.current = dockPoint;
  }, [dockPoint]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setBuddyScale((current) => clamp(current, 1, maxBuddyScale));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [maxBuddyScale]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      const sidebar = document.querySelector<HTMLElement>('[data-sidebar="sidebar"]');
      const rect = sidebar?.getBoundingClientRect();
      setSidebarSafeLeft(
        rect && window.innerWidth >= 1024 && rect.left < 80 && rect.width > 120
          ? Math.ceil(rect.right + 24)
          : 24,
      );
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setActivePosition(restingPosition);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [restingPosition]);

  useEffect(() => {
    if (!mounted || viewport.width <= 0 || viewport.height <= 0) return;
    if (dragSessionRef.current) return;
    if (isWalkModeActive || isReturningHome) return;

    const anchoredPosition = resolveAnchorPosition(activePosition, viewport, buddyBox);
    const next = freeRoamRuntimePosition
      ? clampDockPoint(freeRoamRuntimePosition, viewport, buddyBox)
      : avoidDesktopSidebarForDefaultHome(
          anchoredPosition,
          activePosition,
          viewport,
          buddyBox,
          sidebarSafeLeft,
        );

    const frame = window.requestAnimationFrame(() => {
      dockPointRef.current = next;
      setDockPoint(next);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    activePosition,
    buddyBox,
    freeRoamRuntimePosition,
    isReturningHome,
    isWalkModeActive,
    mounted,
    sidebarSafeLeft,
    viewport,
  ]);

  useEffect(() => {
    return registerOSBuddyReactions({
      locale,
      buddyName: name,
      handlers: {
        setMood,
        temporarilySetMood,
        showBubble,
        openMiniGame: openMiniGameWithPresence,
        setFocusSession,
      },
    });
  }, [
    locale,
    name,
    openMiniGameWithPresence,
    setFocusSession,
    setMood,
    showBubble,
    temporarilySetMood,
  ]);

  useUserIdleForOSBuddy(mounted && enabled && !onSignalsRoute && !isRestingInSidebar);
  useOSBuddyContextHints({
    enabled: mounted && enabled && !onSignalsRoute && !isRestingInSidebar,
    buddyName: name,
    locale,
  });
  useOSBuddyTimeMood({ enabled: mounted && enabled && !onSignalsRoute && !isRestingInSidebar, locale });

  useEffect(() => {
    if (!onSignalsRoute) return;
    const current = useOSBuddyStore.getState().bubble;
    if (current?.type === "context") clearBubble();
  }, [clearBubble, onSignalsRoute]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearSingleClickTimer = useCallback(() => {
    if (singleClickTimerRef.current) {
      clearTimeout(singleClickTimerRef.current);
      singleClickTimerRef.current = null;
    }
  }, []);

  const isPointOverFileDropZone = useCallback(
    (point: DockPoint) => {
      if (viewport.width <= 0 || viewport.height <= 0) return false;
      return (
        distanceFromPointToDockBox(point, dockPointRef.current, buddyBox) <=
        FILE_DROP_CATCH_RADIUS_PX
      );
    },
    [buddyBox, viewport.height, viewport.width],
  );

  const setFileDragOverBuddyState = useCallback(
    (next: boolean) => {
      if (fileDragOverBuddyRef.current === next) return;
      fileDragOverBuddyRef.current = next;
      setIsFileDragOverBuddy(next);

      if (!next) return;
      interruptFreeRoam("smart-action");
      setMenuOpen(false);
      setPetPickerOpen(false);
      temporarilySetMood("playful", 700);
      if (fileDropItems.length === 0) {
        showBubble("I got it", "user-triggered", {
          force: true,
          durationMs: 1_000,
        });
      }
    },
    [
      fileDropItems.length,
      interruptFreeRoam,
      setMenuOpen,
      setPetPickerOpen,
      showBubble,
      temporarilySetMood,
    ],
  );

  const beginOSBuddyFileDrop = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const items = files.map((file) => createOSBuddyDroppedFileItem(file));

      interruptFreeRoam("smart-action");
      setMenuOpen(false);
      setPetPickerOpen(false);
      setWalkModeActive(false);
      setReturningHome(false);
      clearBubble();
      setFileDragOverBuddyState(false);
      setFileDropItems(items);
      temporarilySetMood("success", 1_400);
    },
    [
      clearBubble,
      interruptFreeRoam,
      setFileDragOverBuddyState,
      setMenuOpen,
      setPetPickerOpen,
      setReturningHome,
      setWalkModeActive,
      temporarilySetMood,
    ],
  );

  const updateFileDropItem = useCallback(
    (id: string, patch: Partial<OSBuddyDroppedFileItem>) => {
      setFileDropItems((items) =>
        items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const handleFileDropDestinationChange = useCallback(
    (id: string, destination: OSBuddyDropDestination) => {
      updateFileDropItem(id, { destination });
    },
    [updateFileDropItem],
  );

  const handleRemoveFileDropItem = useCallback((id: string) => {
    setFileDropItems((items) =>
      items.filter((item) => {
        if (item.id !== id) return true;
        return item.status !== "queued" && item.status !== "failed";
      }),
    );
  }, []);

  const handleCancelFileDrop = useCallback(() => {
    if (isFileDropRouting) return;
    setFileDropItems([]);
    clearBubble();
    setFileDragOverBuddyState(false);
  }, [clearBubble, isFileDropRouting, setFileDragOverBuddyState]);

  const handleSaveFileDrop = useCallback(async () => {
    if (isFileDropRouting) return;
    const itemsToRoute = fileDropItems.filter(
      (item) =>
        item.status !== "done" &&
        item.status !== "uploading" &&
        item.status !== "saving",
    );
    if (itemsToRoute.length === 0) return;

    setIsFileDropRouting(true);
    let successCount = 0;
    let failureCount = 0;

    for (const item of itemsToRoute) {
      updateFileDropItem(item.id, { status: "uploading", error: null });
      try {
        const result = await routeOSBuddyDroppedFile({
          item: { ...item, status: "queued", error: null },
          language: locale,
          onStage: (stage) => {
            updateFileDropItem(item.id, {
              status: stage === "uploading" ? "uploading" : "saving",
            });
          },
        });

        if (result.knowledgeItem) upsertKnowledgeItem(result.knowledgeItem);
        if (result.idea) upsertIdea(result.idea);

        updateFileDropItem(item.id, {
          status: "done",
          error: null,
          knowledgeItemId: result.knowledgeItem?.id ?? null,
          ideaId: result.idea?.id ?? null,
        });
        successCount += 1;
      } catch (error) {
        failureCount += 1;
        updateFileDropItem(item.id, {
          status: "failed",
          error: errorMessageFromUnknown(error),
        });
      }
    }

    setIsFileDropRouting(false);
    if (failureCount > 0) {
      temporarilySetMood("error", 1_300);
      toast.error(
        failureCount === 1
          ? "OSBuddy could not save 1 file."
          : `OSBuddy could not save ${failureCount} files.`,
      );
      return;
    }

    if (successCount > 0) {
      temporarilySetMood("celebrating", 1_400);
      toast.success(
        successCount === 1
          ? "OSBuddy saved 1 file."
          : `OSBuddy saved ${successCount} files.`,
      );
    }
  }, [
    fileDropItems,
    isFileDropRouting,
    locale,
    temporarilySetMood,
    updateFileDropItem,
    upsertIdea,
    upsertKnowledgeItem,
  ]);

  useEffect(() => {
    if (!mounted || !enabled) return;

    const onDragOver = (event: DragEvent) => {
      if (!hasFileDragData(event.dataTransfer)) return;
      const overBuddy = isPointOverFileDropZone({
        x: event.clientX,
        y: event.clientY,
      });

      if (!overBuddy) {
        setFileDragOverBuddyState(false);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setFileDragOverBuddyState(true);
    };

    const onDrop = (event: DragEvent) => {
      if (!hasFileDragData(event.dataTransfer)) return;
      const overBuddy = isPointOverFileDropZone({
        x: event.clientX,
        y: event.clientY,
      });
      if (!overBuddy) {
        setFileDragOverBuddyState(false);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      beginOSBuddyFileDrop(filesFromDataTransfer(event.dataTransfer));
    };

    const onDragLeave = (event: DragEvent) => {
      if (
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight
      ) {
        setFileDragOverBuddyState(false);
      }
    };

    const onDragEnd = () => setFileDragOverBuddyState(false);

    window.addEventListener("dragover", onDragOver, true);
    window.addEventListener("drop", onDrop, true);
    window.addEventListener("dragleave", onDragLeave, true);
    window.addEventListener("dragend", onDragEnd, true);
    return () => {
      window.removeEventListener("dragover", onDragOver, true);
      window.removeEventListener("drop", onDrop, true);
      window.removeEventListener("dragleave", onDragLeave, true);
      window.removeEventListener("dragend", onDragEnd, true);
    };
  }, [
    beginOSBuddyFileDrop,
    enabled,
    isPointOverFileDropZone,
    mounted,
    setFileDragOverBuddyState,
  ]);

  const cancelWalkAnimationFrame = useCallback(() => {
    if (walkAnimationFrameRef.current != null) {
      window.cancelAnimationFrame(walkAnimationFrameRef.current);
      walkAnimationFrameRef.current = null;
    }
  }, []);

  const cancelPlayBallChaseFrame = useCallback(() => {
    if (playBallChaseFrameRef.current != null) {
      window.cancelAnimationFrame(playBallChaseFrameRef.current);
      playBallChaseFrameRef.current = null;
    }
  }, []);

  const resetPlayBallRuntime = useCallback(() => {
    cancelPlayBallChaseFrame();
    playBallTargetRef.current = null;
    playBallChaseStateRef.current = null;
    setPlayBallCatchSignal(null);
  }, [cancelPlayBallChaseFrame]);

  const clearQuickSnapTimers = useCallback(() => {
    if (quickSnapSingleShiftTimerRef.current) {
      clearTimeout(quickSnapSingleShiftTimerRef.current);
      quickSnapSingleShiftTimerRef.current = null;
    }
    if (quickSnapResetTimerRef.current) {
      clearTimeout(quickSnapResetTimerRef.current);
      quickSnapResetTimerRef.current = null;
    }
    quickSnapShiftStateRef.current = { count: 0, lastAt: null };
  }, []);

  const focusQuickSnapPasteTarget = useCallback(() => {
    window.requestAnimationFrame(() => {
      const target = quickSnapPasteTargetRef.current;
      target?.focus({ preventScroll: true });
      target?.setSelectionRange(0, 0);
    });
  }, []);

  const resetQuickSnapRuntime = useCallback(
    (options?: { preserveBubble?: boolean }) => {
      clearQuickSnapTimers();
      setQuickSnapState("idle");
      setQuickSnapPayload(null);
      setQuickSnapCloudsDismissing(false);
      setQuickSnapClipboardPending(false);
      if (!options?.preserveBubble) clearBubble();
    },
    [clearBubble, clearQuickSnapTimers],
  );

  const cancelQuickSnap = useCallback(
    (options?: { preserveBubble?: boolean }) => {
      resetQuickSnapRuntime(options);
      if (!options?.preserveBubble) setMood("idle");
    },
    [resetQuickSnapRuntime, setMood],
  );

  const armQuickSnap = useCallback(() => {
    clearLongPressTimer();
    clearSingleClickTimer();
    clearQuickSnapTimers();
    interruptFreeRoam("smart-action");
    setMenuOpen(false);
    setPetPickerOpen(false);
    clearBubble();
    setQuickSnapPayload(null);
    setQuickSnapCloudsDismissing(false);
    setQuickSnapClipboardPending(false);
    setQuickSnapState("armed");
    setMood("playful");
    triggerOSBuddyHapticFeedback("quick-snap-activate");
    focusQuickSnapPasteTarget();
    emitOSBuddyEvent({ type: "buddy:longpress" });
  }, [
    clearBubble,
    clearLongPressTimer,
    clearQuickSnapTimers,
    clearSingleClickTimer,
    focusQuickSnapPasteTarget,
    interruptFreeRoam,
    setMenuOpen,
    setMood,
    setPetPickerOpen,
  ]);

  const stageQuickSnapPayload = useCallback(
    (payload: OSBuddyQuickSnapPayload | null) => {
      setQuickSnapClipboardPending(false);
      if (!payload) {
        temporarilySetMood("error", 1_000);
        showBubble(
          locale === "zh-TW"
            ? "我未讀到可以捕捉嘅內容。"
            : "I could not read anything to capture.",
          "error",
          { force: true, durationMs: 2_300 },
        );
        focusQuickSnapPasteTarget();
        return;
      }

      clearBubble();
      setQuickSnapPayload(payload);
      setQuickSnapCloudsDismissing(false);
      setQuickSnapState("ready");
      temporarilySetMood("success", 900);
      focusQuickSnapPasteTarget();
    },
    [clearBubble, focusQuickSnapPasteTarget, locale, showBubble, temporarilySetMood],
  );

  const readQuickSnapClipboard = useCallback(async () => {
    if (quickSnapClipboardPending || quickSnapState === "idle" || quickSnapState === "saving") {
      return false;
    }

    setQuickSnapClipboardPending(true);
    const payload = await createOSBuddyQuickSnapPayloadFromNavigatorClipboard();
    if (payload) {
      stageQuickSnapPayload(payload);
      return true;
    }

    setQuickSnapClipboardPending(false);
    return false;
  }, [quickSnapClipboardPending, quickSnapState, stageQuickSnapPayload]);

  const handleQuickSnapPasteRequest = useCallback(
    (event?: {
      preventDefault: () => void;
      stopPropagation: () => void;
    }) => {
      event?.preventDefault();
      event?.stopPropagation();
      void readQuickSnapClipboard().then((captured) => {
        if (!captured) focusQuickSnapPasteTarget();
      });
    },
    [focusQuickSnapPasteTarget, readQuickSnapClipboard],
  );

  const handleQuickSnapPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      if (quickSnapState === "idle" || quickSnapState === "saving") return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.value = "";
      stageQuickSnapPayload(
        createOSBuddyQuickSnapPayloadFromClipboardData(event.clipboardData),
      );
    },
    [quickSnapState, stageQuickSnapPayload],
  );

  useEffect(() => {
    if (!isQuickSnapActive || typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add("os-buddy-quick-snap-capturing");

    const selection = window.getSelection?.();
    if (selection && !selection.isCollapsed) selection.removeAllRanges();

    return () => {
      root.classList.remove("os-buddy-quick-snap-capturing");
    };
  }, [isQuickSnapActive]);

  const requestQuickSnapAck = useCallback(
    async (ackContext: OSBuddyQuickSnapAckContext) => {
      try {
        const response = await fetch("/api/os-buddy/quick-snap-ack", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ locale, ...ackContext }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as { message?: unknown };
        if (typeof data.message === "string" && data.message.trim()) {
          return data.message.trim();
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[os-buddy-quick-snap] ack failed:",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
      return buildLocalQuickSnapAck(ackContext);
    },
    [locale],
  );

  const commitQuickSnap = useCallback(
    async (destination: OSBuddyQuickSnapDestination) => {
      const payload = quickSnapPayload;
      if (!payload || quickSnapState === "saving") return;

      clearQuickSnapTimers();
      setQuickSnapState("saving");
      setQuickSnapCloudsDismissing(true);
      setMood("creating");

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, QUICK_SNAP_CLOUD_DISPERSE_MS);
      });

      try {
        const result = await routeOSBuddyQuickSnapPayload({
          payload,
          destination,
          language: locale,
          onIdeaUpdated: upsertIdea,
        });

        for (const idea of result.ideas) upsertIdea(idea);
        for (const item of result.knowledgeItems) upsertKnowledgeItem(item);

        const ack = await requestQuickSnapAck(result.ackContext);
        setQuickSnapState("success");
        setQuickSnapPayload(null);
        setQuickSnapCloudsDismissing(false);
        temporarilySetMood("celebrating", 1_600);
        showBubble(ack, "success", { force: true, durationMs: 4_200 });

        quickSnapResetTimerRef.current = setTimeout(() => {
          resetQuickSnapRuntime({ preserveBubble: true });
        }, QUICK_SNAP_SUCCESS_RESET_MS);
      } catch (error) {
        const message = errorMessageFromUnknown(error);
        setQuickSnapState("ready");
        setQuickSnapCloudsDismissing(false);
        temporarilySetMood("error", 1_300);
        toast.error("OS Buddy could not save that Quick Snap.");
        showBubble(
          locale === "zh-TW"
            ? "呢個 Quick Snap 暫時未儲存到。"
            : "I could not save that Quick Snap yet.",
          "error",
          { force: true, durationMs: 3_000 },
        );
        if (process.env.NODE_ENV !== "production") {
          console.warn("[os-buddy-quick-snap] save failed:", message);
        }
        focusQuickSnapPasteTarget();
      }
    },
    [
      clearQuickSnapTimers,
      focusQuickSnapPasteTarget,
      locale,
      quickSnapPayload,
      quickSnapState,
      requestQuickSnapAck,
      resetQuickSnapRuntime,
      setMood,
      showBubble,
      temporarilySetMood,
      upsertIdea,
      upsertKnowledgeItem,
    ],
  );

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    interruptFreeRoam("route-change");
    airPilotHoverTargetRef.current = setAirPilotHighlightedTarget({
      previous: airPilotHoverTargetRef.current,
      next: null,
    });
    resetPlayBallRuntime();
    closeMiniGame();
    cancelQuickSnap();
  }, [cancelQuickSnap, closeMiniGame, interruptFreeRoam, pathname, resetPlayBallRuntime]);

  const getWalkTargetPoint = useCallback(
    (clientX: number, clientY: number, pointerType: string) =>
      getWalkTargetForPointer({
        clientX,
        clientY,
        pointerType,
        viewport,
        buddyBox,
      }),
    [buddyBox, viewport],
  );

  const resolveRestingTarget = useCallback(() => {
    const target = avoidDesktopSidebarForDefaultHome(
      resolveAnchorPosition(restingPosition, viewport, buddyBox),
      restingPosition,
      viewport,
      buddyBox,
      sidebarSafeLeft,
    );
    restingTargetRef.current = target;
    return target;
  }, [buddyBox, restingPosition, sidebarSafeLeft, viewport]);

  const applyWalkMood = useCallback(
    (direction: WalkDirection, stationaryMood: "idle" | "playful" = "playful") => {
      if (walkDirectionRef.current === direction) return;

      walkDirectionRef.current = direction;
      if (direction === "left") {
        setMood("dragging-left");
        return;
      }
      if (direction === "right") {
        setMood("dragging-right");
        return;
      }

      setMood(stationaryMood);
    },
    [setMood],
  );

  const setClampedBuddyScale = useCallback(
    (nextScale: number | ((current: number) => number)) => {
      setBuddyScale((current) => {
        const resolved = typeof nextScale === "function" ? nextScale(current) : nextScale;
        return clamp(resolved, 1, maxBuddyScale);
      });
    },
    [maxBuddyScale],
  );

  const adjustBuddyScale = useCallback(
    (delta: number) => {
      setClampedBuddyScale((current) => current + delta);
    },
    [setClampedBuddyScale],
  );

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearSingleClickTimer();
      clearQuickSnapTimers();
      if (secretModeTimerRef.current) clearTimeout(secretModeTimerRef.current);
      cancelWalkAnimationFrame();
      cancelPlayBallChaseFrame();
      stopAirControl("unmount");
    };
  }, [
    cancelPlayBallChaseFrame,
    cancelWalkAnimationFrame,
    clearQuickSnapTimers,
    clearLongPressTimer,
    clearSingleClickTimer,
    stopAirControl,
  ]);

  useEffect(() => {
    if (enabled || !isAirControlActive) return;
    stopAirControl("buddy-hidden");
  }, [enabled, isAirControlActive, stopAirControl]);

  useEffect(() => {
    if (!mounted || !enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (quickSnapState === "idle") return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        cancelQuickSnap();
        return;
      }

      if (
        event.key.toLowerCase() === "m" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        event.stopPropagation();
        cancelQuickSnap();
        interruptFreeRoam("menu-open");
        const point = dockPointRef.current;
        setMenuPoint({
          x: clamp(
            point.x + buddyBox.width + 12,
            VIEWPORT_EDGE_GAP,
            Math.max(VIEWPORT_EDGE_GAP, viewport.width - MENU_WIDTH - VIEWPORT_EDGE_GAP),
          ),
          y: clamp(
            point.y - 8,
            VIEWPORT_EDGE_GAP,
            Math.max(VIEWPORT_EDGE_GAP, viewport.height - MENU_HEIGHT - VIEWPORT_EDGE_GAP),
          ),
        });
        setMenuOpen(true);
        return;
      }

      if (quickSnapState !== "ready" || event.key !== "Shift") return;

      event.preventDefault();
      event.stopPropagation();

      const result = registerQuickSnapShiftTap({
        state: quickSnapShiftStateRef.current,
        now: Date.now(),
        repeat: event.repeat,
        doubleTapMs: QUICK_SNAP_SHIFT_DOUBLE_TAP_MS,
      });
      quickSnapShiftStateRef.current = result.state;

      if (quickSnapSingleShiftTimerRef.current) {
        clearTimeout(quickSnapSingleShiftTimerRef.current);
        quickSnapSingleShiftTimerRef.current = null;
      }

      if (result.immediateDestination) {
        void commitQuickSnap(result.immediateDestination);
        return;
      }

      if (result.state.count === 1) {
        quickSnapSingleShiftTimerRef.current = setTimeout(() => {
          quickSnapSingleShiftTimerRef.current = null;
          quickSnapShiftStateRef.current = { count: 0, lastAt: null };
          void commitQuickSnap("idea");
        }, QUICK_SNAP_SHIFT_DOUBLE_TAP_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [
    buddyBox.width,
    cancelQuickSnap,
    commitQuickSnap,
    enabled,
    interruptFreeRoam,
    mounted,
    quickSnapState,
    setMenuOpen,
    viewport.height,
    viewport.width,
  ]);

  useEffect(() => {
    if (isAirControlActive) return;
    airPilotHoverTargetRef.current = setAirPilotHighlightedTarget({
      previous: airPilotHoverTargetRef.current,
      next: null,
    });
  }, [isAirControlActive]);

  useEffect(() => {
    if (!mounted || !enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        adjustBuddyScale(BUDDY_SCALE_STEP);
        return;
      }

      if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        adjustBuddyScale(-BUDDY_SCALE_STEP);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [adjustBuddyScale, enabled, mounted]);

  useEffect(() => {
    if (!mounted || !enabled) return;

    const touchIsNearBuddy = (touch: Touch) =>
      isPointNearDockBox({
        clientX: touch.clientX,
        clientY: touch.clientY,
        dockPoint: dockPointRef.current,
        buddyBox,
        padding: 24,
      });

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length < 2) return;
      const first = event.touches[0];
      const second = event.touches[1];
      if (!first || !second) return;
      if (!touchIsNearBuddy(first) && !touchIsNearBuddy(second)) return;

      const distance = distanceBetweenTouches(event.touches);
      if (distance < 12) return;
      pinchScaleRef.current = { distance, scale: buddyScale };
      event.preventDefault();
    };

    const onTouchMove = (event: TouchEvent) => {
      const pinch = pinchScaleRef.current;
      if (!pinch || event.touches.length < 2) return;

      const distance = distanceBetweenTouches(event.touches);
      if (distance < 12) return;
      setClampedBuddyScale(pinch.scale * (distance / pinch.distance));
      event.preventDefault();
    };

    const onTouchEnd = () => {
      pinchScaleRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [buddyBox, buddyScale, enabled, mounted, setClampedBuddyScale]);

  const openMenu = useCallback(
    (x: number, y: number) => {
      interruptFreeRoam("menu-open");
      const clampedX = clamp(x, VIEWPORT_EDGE_GAP, Math.max(VIEWPORT_EDGE_GAP, viewport.width - MENU_WIDTH - VIEWPORT_EDGE_GAP));
      const clampedY = clamp(y, VIEWPORT_EDGE_GAP, Math.max(VIEWPORT_EDGE_GAP, viewport.height - MENU_HEIGHT - VIEWPORT_EDGE_GAP));
      setMenuPoint({ x: clampedX, y: clampedY });
      setMenuOpen(true);
    },
    [interruptFreeRoam, setMenuOpen, viewport.height, viewport.width],
  );

  const maybeTriggerBirthdayEasterEgg = useCallback(() => {
    if (!birthdayProfile.enabled) return false;
    if (!isOSBuddyBirthdayToday({ profile: birthdayProfile })) return false;

    const dateKey = getOSBuddyBirthdayTodayKey({ profile: birthdayProfile });
    if (hasBirthdayEasterEggTriggered(dateKey)) return false;

    const now = Date.now();
    const currentBurst = birthdayClickBurstRef.current;
    const burstExpired =
      currentBurst.dateKey !== dateKey ||
      now - currentBurst.startedAt > BIRTHDAY_EASTER_EGG_WINDOW_MS;
    const nextBurst = {
      dateKey,
      startedAt: burstExpired ? now : currentBurst.startedAt,
      count: burstExpired ? 1 : currentBurst.count + 1,
    };

    birthdayClickBurstRef.current = nextBurst;
    if (nextBurst.count < 3) return false;

    markBirthdayEasterEggTriggered(dateKey);
    birthdayClickBurstRef.current = { dateKey, startedAt: now, count: 0 };
    resetClickBurst();

    const currentBirthdayModeUntil = useOSBuddyStore.getState().birthdayModeUntil;
    const remainingBirthdayModeMs =
      currentBirthdayModeUntil == null ? 0 : Math.max(0, currentBirthdayModeUntil - now);
    setBirthdayMode(true, remainingBirthdayModeMs + BIRTHDAY_EASTER_EGG_EXTENSION_MS);
    temporarilySetMood("celebrating", 2_200);
    showBubble(
      locale === "zh-TW" ? "生日像素加成。" : "Birthday pixel boost.",
      "birthday",
      {
        force: true,
        durationMs: 2_400,
      },
    );
    return true;
  }, [
    birthdayProfile,
    locale,
    resetClickBurst,
    setBirthdayMode,
    showBubble,
    temporarilySetMood,
  ]);

  const triggerClickReaction = useCallback(async () => {
    void incrementOSBuddyStat("clicks");

    if (maybeTriggerBirthdayEasterEgg()) return;

    emitOSBuddyEvent({ type: "buddy:clicked" });

    const burstCount = registerClickBurst();
    if (burstCount >= 7) {
      resetClickBurst();
      temporarilySetMood("celebrating", 8_000);
      showBubble(
        locale === "zh-TW" ? "隱藏像素模式解鎖。" : "Secret pixel mode unlocked.",
        "game",
        { force: true, durationMs: 3_200 },
      );
      setSecretModeActive(true);
      void addOSBuddyBadge("secret-pixel-mode");
      if (secretModeTimerRef.current) clearTimeout(secretModeTimerRef.current);
      secretModeTimerRef.current = setTimeout(() => {
        setSecretModeActive(false);
        secretModeTimerRef.current = null;
      }, 8_000);
      return;
    }

    const line = await getCompanionLine();
    temporarilySetMood(line.kind === "game" ? "playful" : "success", 1300);
    showBubble(line.message, line.kind === "game" ? "game" : "user-triggered", {
      force: true,
      durationMs: line.cta ? 6200 : 4300,
      kind: line.kind,
      cta: line.cta ?? null,
    });
  }, [
    getCompanionLine,
    locale,
    maybeTriggerBirthdayEasterEgg,
    registerClickBurst,
    resetClickBurst,
    showBubble,
    temporarilySetMood,
  ]);

  const startWalkMode = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      if (viewport.width <= 0 || viewport.height <= 0) return;

      clearLongPressTimer();
      clearSingleClickTimer();
      dragSessionRef.current = null;
      activeWalkPointerIdRef.current = null;
      lastWalkExitTapRef.current = null;
      walkPointerRef.current = { x: clientX, y: clientY, pointerType };
      walkDirectionRef.current = null;
      restingTargetRef.current = resolveRestingTarget();
      walkTargetRef.current = getWalkTargetPoint(clientX, clientY, pointerType);

      setDragging(false, null);
      setMenuOpen(false);
      setPetPickerOpen(false);
      resetPlayBallRuntime();
      closeMiniGame();
      clearBubble();
      setReturningHome(false);
      setWalkModeActive(true);
      setMood("playful");

      emitOSBuddyEvent({ type: "buddy:walk:start" });
      showBubble(locale === "zh-TW" ? "一起走吧。" : "Let's go.", "user-triggered", {
        durationMs: 1600,
        force: true,
      });
    },
    [
      clearBubble,
      clearLongPressTimer,
      clearSingleClickTimer,
      closeMiniGame,
      getWalkTargetPoint,
      locale,
      resetPlayBallRuntime,
      resolveRestingTarget,
      setDragging,
      setMenuOpen,
      setMood,
      setPetPickerOpen,
      setReturningHome,
      setWalkModeActive,
      showBubble,
      viewport.height,
      viewport.width,
    ],
  );

  const startReturnHome = useCallback(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return;

    clearLongPressTimer();
    clearSingleClickTimer();
    activeWalkPointerIdRef.current = null;
    lastWalkExitTapRef.current = null;
    walkPointerRef.current = null;
    walkDirectionRef.current = null;
    walkTargetRef.current = null;
    restingTargetRef.current = resolveRestingTarget();

    setMenuOpen(false);
    setPetPickerOpen(false);
    resetPlayBallRuntime();
    closeMiniGame();
    setWalkModeActive(false);
    setReturningHome(true);
    emitOSBuddyEvent({ type: "buddy:walk:return" });
  }, [
    clearLongPressTimer,
    clearSingleClickTimer,
    closeMiniGame,
    resetPlayBallRuntime,
    resolveRestingTarget,
    setMenuOpen,
    setPetPickerOpen,
    setReturningHome,
    setWalkModeActive,
    viewport.height,
    viewport.width,
  ]);

  const returnAirPilotToDefaultHome = useCallback(() => {
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const defaultPosition: OSBuddyPosition = {
      x: null,
      y: null,
      anchor: "bottom-left",
    };
    const target = avoidDesktopSidebarForDefaultHome(
      resolveAnchorPosition(defaultPosition, viewport, buddyBox),
      defaultPosition,
      viewport,
      buddyBox,
      sidebarSafeLeft,
    );

    clearLongPressTimer();
    clearSingleClickTimer();
    activeWalkPointerIdRef.current = null;
    lastWalkExitTapRef.current = null;
    walkPointerRef.current = null;
    walkDirectionRef.current = null;
    walkTargetRef.current = null;
    restingTargetRef.current = target;

    setActivePosition(defaultPosition);
    setMenuOpen(false);
    setPetPickerOpen(false);
    resetPlayBallRuntime();
    closeMiniGame();
    setWalkModeActive(false);
    setReturningHome(true);
    emitOSBuddyEvent({ type: "buddy:walk:return" });
  }, [
    buddyBox,
    clearLongPressTimer,
    clearSingleClickTimer,
    closeMiniGame,
    resetPlayBallRuntime,
    sidebarSafeLeft,
    setMenuOpen,
    setPetPickerOpen,
    setReturningHome,
    setWalkModeActive,
    viewport,
  ]);

  const toggleWalkMode = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      if (isReturningHome) return;

      if (isWalkModeActive) {
        startReturnHome();
        return;
      }

      startWalkMode(clientX, clientY, pointerType);
    },
    [isReturningHome, isWalkModeActive, startReturnHome, startWalkMode],
  );

  const closePlayBallGame = useCallback(() => {
    if (!isPlayBallOpen) return;
    resetPlayBallRuntime();
    closeMiniGame();
    restingTargetRef.current = resolveRestingTarget();
    setWalkModeActive(false);
    setReturningHome(true);
    setMood("idle");
    showBubble(locale === "zh-TW" ? "先休息一下。" : "Let's pause for now.", "game", {
      force: true,
      durationMs: 1800,
      kind: "game",
    });
  }, [
    closeMiniGame,
    isPlayBallOpen,
    locale,
    resetPlayBallRuntime,
    resolveRestingTarget,
    setMood,
    setReturningHome,
    setWalkModeActive,
    showBubble,
  ]);

  const togglePlayBallGame = useCallback(() => {
    clearSingleClickTimer();
    lastTapRef.current = null;

    if (isPlayBallOpen) {
      closePlayBallGame();
      return;
    }

    if (isWalkModeActive) {
      startReturnHome();
    }

    setPlayBallCatchSignal(null);
    interruptFreeRoam("mini-game-open");
    setMenuOpen(false);
    setPetPickerOpen(false);
    openMiniGame("play-ball");
    setMood("playful");
    emitOSBuddyEvent({ type: "game:start", game: "play-ball" });
    showBubble(pickPlayBallLine(locale, "start"), "game", {
      force: true,
      durationMs: 2400,
      kind: "game",
    });
  }, [
    clearSingleClickTimer,
    closePlayBallGame,
    interruptFreeRoam,
    isPlayBallOpen,
    isWalkModeActive,
    locale,
    openMiniGame,
    setMenuOpen,
    setMood,
    setPetPickerOpen,
    showBubble,
    startReturnHome,
  ]);

  const openOverlayMiniGame = useCallback(
    (game: OSBuddyMiniGame) => {
      if (game === "play-ball") {
        togglePlayBallGame();
        return;
      }

      clearSingleClickTimer();
      lastTapRef.current = null;
      interruptFreeRoam("mini-game-open");
      setMenuOpen(false);
      setPetPickerOpen(false);
      clearBubble();
      resetPlayBallRuntime();
      openMiniGameWithPresence(game);
      setMood(game === "clean-desk" ? "reading" : game === "focus-tap" ? "focused" : "playful");
      emitOSBuddyEvent({ type: "game:start", game });
    },
    [
      clearBubble,
      clearSingleClickTimer,
      interruptFreeRoam,
      openMiniGameWithPresence,
      resetPlayBallRuntime,
      setMenuOpen,
      setMood,
      setPetPickerOpen,
      togglePlayBallGame,
    ],
  );

  const pauseAirControlWalk = useCallback(
    (nextMood: "idle" | "playful" = "playful") => {
      activeWalkPointerIdRef.current = null;
      walkPointerRef.current = null;
      walkTargetRef.current = null;
      walkDirectionRef.current = null;
      cancelWalkAnimationFrame();
      setDragging(false, null);
      setWalkModeActive(false);
      setReturningHome(false);
      setMood(nextMood);
    },
    [
      cancelWalkAnimationFrame,
      setDragging,
      setMood,
      setReturningHome,
      setWalkModeActive,
    ],
  );

  const setAirControlWalkTarget = useCallback(
    (target: DockPoint, pointer?: DockPoint) => {
      if (viewport.width <= 0 || viewport.height <= 0) return;

      activeWalkPointerIdRef.current = null;
      if (pointer) {
        walkPointerRef.current = { x: pointer.x, y: pointer.y, pointerType: "air" };
        walkTargetRef.current = getWalkTargetPoint(pointer.x, pointer.y, "air");
      } else {
        walkPointerRef.current = null;
        walkTargetRef.current = clampDockPoint(target, viewport, buddyBox);
      }

      const state = useOSBuddyStore.getState();
      if (state.isWalkModeActive && !state.isReturningHome) return;

      walkDirectionRef.current = null;
      restingTargetRef.current = resolveRestingTarget();
      setDragging(false, null);
      setMenuOpen(false);
      setPetPickerOpen(false);
      setReturningHome(false);
      setWalkModeActive(true);
      setMood("playful");
      emitOSBuddyEvent({ type: "buddy:walk:start" });
    },
    [
      buddyBox,
      getWalkTargetPoint,
      resolveRestingTarget,
      setDragging,
      setMenuOpen,
      setMood,
      setPetPickerOpen,
      setReturningHome,
      setWalkModeActive,
      viewport,
    ],
  );

  const activateAirControl = useCallback((options?: { restored?: boolean }) => {
    clearSingleClickTimer();
    clearLongPressTimer();
    lastTapRef.current = null;
    activeWalkPointerIdRef.current = null;
    walkPointerRef.current = null;
    walkTargetRef.current = null;
    walkDirectionRef.current = null;

    interruptFreeRoam("user-click");
    resetPlayBallRuntime();
    closeMiniGame();
    setMenuOpen(false);
    setPetPickerOpen(false);
    setDragging(false, null);
    setReturningHome(false);
    setWalkModeActive(false);
    airGrabOffsetRef.current = null;
    setMood("playful");
    setAirControlSensorMode("rgb-webcam");
    startAirControl();
    setAirPilotSessionActive(true);
    emitOSBuddyEvent({ type: "buddy:air-control:start", sensorMode: "rgb-webcam" });
    showBubble(
      options?.restored
        ? locale === "zh-TW"
          ? "AirPilot 繼續保持開啟。"
          : "AirPilot is still on."
        : locale === "zh-TW"
          ? "AirPilot 啟動。紅點停喺按鈕附近會吸附；吸附後輕動食指即可選取。"
          : "AirPilot is on. Pause near a button to magnet-lock, then tap your index finger to select.",
      "user-triggered",
      { force: true, durationMs: options?.restored ? 1_800 : 4_000 },
    );
  }, [
    clearLongPressTimer,
    clearSingleClickTimer,
    closeMiniGame,
    interruptFreeRoam,
    locale,
    resetPlayBallRuntime,
    setAirControlSensorMode,
    setDragging,
    setMenuOpen,
    setMood,
    setPetPickerOpen,
    setReturningHome,
    setWalkModeActive,
    showBubble,
    startAirControl,
  ]);

  useEffect(() => {
    if (restoredAirPilotSessionRef.current) return;
    if (!mounted || !enabled || isAirControlActive) return;
    if (!shouldRestoreAirPilotSession()) return;

    restoredAirPilotSessionRef.current = true;
    const timer = window.setTimeout(() => activateAirControl({ restored: true }), 0);
    return () => window.clearTimeout(timer);
  }, [activateAirControl, enabled, isAirControlActive, mounted]);

  const stopAirPilotControl = useCallback(
    (reason: "user-exit" | "closed-fist" = "user-exit") => {
      setAirPilotSessionActive(false);
      airGrabOffsetRef.current = null;
      pauseAirControlWalk("idle");
      stopAirControl(reason);
      airPilotHoverTargetRef.current = setAirPilotHighlightedTarget({
        previous: airPilotHoverTargetRef.current,
        next: null,
      });
      returnAirPilotToDefaultHome();
      showBubble(
        locale === "zh-TW" ? "AirPilot 已關閉。" : "AirPilot is off.",
        "system",
        {
          force: true,
          durationMs: 1_600,
        },
      );
    },
    [locale, pauseAirControlWalk, returnAirPilotToDefaultHome, showBubble, stopAirControl],
  );

  const handleAirControlCommand = useCallback(
    (command: OSBuddyAirControlCommand) => {
      switch (command.type) {
        case "cursor":
          // Virtual cursor only; rendered by the overlay. No dock movement.
          return;
        case "hover":
          // Reaching toward OSBuddy; a subtle playful cue, no movement yet.
          temporarilySetMood("playful", 320);
          return;
        case "grab": {
          // Stop other modes and "pick up" OSBuddy at the grab offset.
          interruptFreeRoam("user-click");
          setMenuOpen(false);
          setPetPickerOpen(false);
          setWalkModeActive(false);
          setReturningHome(false);
          walkTargetRef.current = null;
          airGrabOffsetRef.current = command.grabOffset;
          setDragging(true, null);
          setMood("playful");
          showBubble(locale === "zh-TW" ? "抓到我喇！" : "You grabbed me!", "user-triggered", {
            force: true,
            durationMs: 1_400,
          });
          return;
        }
        case "drag": {
          const offset = airGrabOffsetRef.current ?? { x: 0, y: 0 };
          const next = clampDockPoint(
            { x: command.point.x - offset.x, y: command.point.y - offset.y },
            viewport,
            buddyBox,
          );
          const direction =
            next.x < dockPointRef.current.x - 0.5
              ? "left"
              : next.x > dockPointRef.current.x + 0.5
                ? "right"
                : null;
          dockPointRef.current = next;
          setDockPoint(next);
          setDragging(true, direction);
          return;
        }
        case "release": {
          airGrabOffsetRef.current = null;
          setDragging(false, null);
          setMood("idle");
          if (command.save && viewport.width > 0 && viewport.height > 0) {
            const finalPosition: OSBuddyPosition = {
              x: Math.round(dockPointRef.current.x),
              y: Math.round(dockPointRef.current.y),
              anchor: "custom",
            };
            setActivePosition(finalPosition);
            void savePosition(finalPosition);
          }
          showBubble(locale === "zh-TW" ? "放低咗，就放呢度。" : "Set down right here.", "user-triggered", {
            force: true,
            durationMs: 1_500,
          });
          return;
        }
        case "wake":
          return;
        case "follow":
          setAirControlWalkTarget(command.point, command.point);
          return;
        case "page-cursor": {
          setAirControlWalkTarget(command.point, command.point);
          const nextTarget = resolveAirPilotTargetAtPoint(command.point);
          airPilotHoverTargetRef.current = setAirPilotHighlightedTarget({
            previous: airPilotHoverTargetRef.current,
            next: nextTarget,
          });
          return;
        }
        case "page-select": {
          const target =
            resolveAirPilotTargetAtPoint(command.point) ?? airPilotHoverTargetRef.current;
          if (clickAirPilotTarget(target)) {
            temporarilySetMood("success", 900);
          }
          return;
        }
        case "page-scroll":
          scrollAirPilotTargetAtPoint({
            point: command.point,
            deltaY: command.deltaY,
          });
          return;
        case "zoom-osbuddy": {
          const delta = command.direction === "in" ? command.amount : -command.amount;
          const nextScale = clamp(buddyScale + delta, 1, maxBuddyScale);
          setClampedBuddyScale(nextScale);
          temporarilySetMood("celebrating", 900);
          showBubble(
            locale === "zh-TW"
              ? `OS Buddy ${Math.round(nextScale * 100)}%`
              : `OS Buddy ${Math.round(nextScale * 100)}%`,
            "success",
            { force: true, durationMs: 1_300 },
          );
          return;
        }
        case "pause":
          // Hand lost / low confidence: freeze in place, keep the grab.
          setDragging(false, null);
          temporarilySetMood("playful", 600);
          return;
        case "hold":
          return;
        case "resume":
          setDragging(true, null);
          return;
        case "exit":
          stopAirPilotControl(command.gesture === "Closed_Fist" ? "closed-fist" : "user-exit");
          return;
        case "select":
          void triggerClickReaction();
          return;
        case "play-ball":
          airGrabOffsetRef.current = null;
          pauseAirControlWalk("playful");
          togglePlayBallGame();
          return;
        case "celebrate":
          temporarilySetMood("celebrating", 1_900);
          showBubble(locale === "zh-TW" ? "收到！" : "Nice.", "success", {
            force: true,
            durationMs: 1_500,
          });
          return;
        case "dash-left":
        case "dash-right": {
          const x =
            command.type === "dash-left"
              ? VIEWPORT_EDGE_GAP
              : viewport.width - buddyBox.width - VIEWPORT_EDGE_GAP;
          setAirControlWalkTarget({
            x,
            y: dockPointRef.current.y,
          });
          temporarilySetMood(command.type === "dash-left" ? "dragging-left" : "dragging-right", 700);
          return;
        }
        case "lost-hand":
          pauseAirControlWalk("playful");
          showBubble(
            locale === "zh-TW" ? "我暫時睇唔到隻手，先停一停。" : "I lost your hand, so I'll pause.",
            "system",
            {
              force: true,
              durationMs: 2_000,
            },
          );
          return;
        default:
          return;
      }
    },
    [
      buddyBox,
      buddyScale,
      interruptFreeRoam,
      locale,
      maxBuddyScale,
      pauseAirControlWalk,
      savePosition,
      setActivePosition,
      setClampedBuddyScale,
      setAirControlWalkTarget,
      setDockPoint,
      setDragging,
      setMenuOpen,
      setMood,
      setPetPickerOpen,
      setReturningHome,
      setWalkModeActive,
      showBubble,
      stopAirPilotControl,
      temporarilySetMood,
      togglePlayBallGame,
      triggerClickReaction,
      viewport,
    ],
  );

  const handleMiniGameComplete = useCallback(
    (game: OSBuddyMiniGame, score: number) => {
      void incrementOSBuddyStat("gamesPlayed");
      void addOSBuddyBadge("first-game");
      emitOSBuddyEvent({ type: "game:complete", game, score });
      closeMiniGame();
    },
    [closeMiniGame],
  );

  const trackPlayBall = useCallback((event: OSBuddyPlayBallEvent) => {
    if (playBallChaseStateRef.current?.id !== event.id) return;
    playBallTargetRef.current = event;
  }, []);

  const handlePlayBallCommandZone = useCallback(
    (zone: "brain" | "idea" | "project" | "osBuddy" | "shortcut") => {
      const label =
        zone === "osBuddy"
          ? "OS Buddy"
          : zone.charAt(0).toUpperCase() + zone.slice(1);
      showBubble(
        locale === "zh-TW"
          ? `Play Ball 已命中 ${label} zone。`
          : `Play Ball hit the ${label} zone.`,
        "game",
        { force: true, durationMs: 1_800, kind: "game" },
      );
    },
    [locale, showBubble],
  );

  const chasePlayBall = useCallback(
    (event: OSBuddyPlayBallEvent) => {
      cancelPlayBallChaseFrame();
      setPlayBallCatchSignal(null);
      playBallTargetRef.current = event;
      playBallChaseStateRef.current = {
        id: event.id,
        outcome: event.outcome,
        startedAt: performance.now(),
      };

      const finishChase = (params: {
        finalPoint: DockPoint;
        outcome: OSBuddyPlayBallOutcome;
        ballEvent: OSBuddyPlayBallEvent;
      }) => {
        dockPointRef.current = params.finalPoint;
        setDockPoint(params.finalPoint);
        setMood(params.outcome === "caught" ? "success" : "error");
        showBubble(pickPlayBallLine(locale, params.outcome), "game", {
          force: true,
          durationMs: 2600,
          kind: "game",
        });
        if (params.outcome === "caught") {
          setPlayBallCatchSignal({
            id: params.ballEvent.id,
            point: params.ballEvent.point,
          });
        }
        playBallTargetRef.current = null;
        playBallChaseStateRef.current = null;
        playBallChaseFrameRef.current = null;
      };

      const tick = (now: number) => {
        const chaseState = playBallChaseStateRef.current;
        const ballEvent = playBallTargetRef.current;
        if (!chaseState || !ballEvent || viewport.width <= 0 || viewport.height <= 0) {
          playBallChaseFrameRef.current = null;
          return;
        }

        const targetPoint =
          chaseState.outcome === "caught"
            ? resolveCaughtPlayBallTarget({ event: ballEvent, viewport, buddyBox })
            : resolveMissedPlayBallTarget({ event: ballEvent, viewport, buddyBox });
        const current = dockPointRef.current;
        const dx = targetPoint.x - current.x;
        const dy = targetPoint.y - current.y;
        const distance = Math.hypot(dx, dy);
        const speed =
          chaseState.outcome === "caught"
            ? PLAY_BALL_CATCH_SPEED_PX
            : PLAY_BALL_MISS_SPEED_PX;
        const nextPoint =
          distance <= 0
            ? targetPoint
            : clampDockPoint(
                {
                  x: current.x + (dx / distance) * Math.min(speed, distance),
                  y: current.y + (dy / distance) * Math.min(speed, distance),
                },
                viewport,
                buddyBox,
              );
        const elapsedMs = now - chaseState.startedAt;

        if (
          chaseState.outcome === "caught" &&
          (dockIntersectsBall({
            dockPoint: nextPoint,
            buddyBox,
            ballCenter: ballEvent.point,
            ballSize: ballEvent.ballSize,
          }) ||
            elapsedMs >= PLAY_BALL_CATCH_FORCE_MS)
        ) {
          finishChase({
            finalPoint: resolveCaughtPlayBallTarget({ event: ballEvent, viewport, buddyBox }),
            outcome: "caught",
            ballEvent,
          });
          return;
        }

        if (
          chaseState.outcome === "missed" &&
          ((elapsedMs >= PLAY_BALL_MISS_RESOLVE_MS && distance <= speed * 2) ||
            elapsedMs >= PLAY_BALL_MISS_FORCE_MS)
        ) {
          finishChase({
            finalPoint: resolveMissedPlayBallTarget({ event: ballEvent, viewport, buddyBox }),
            outcome: "missed",
            ballEvent,
          });
          return;
        }

        dockPointRef.current = nextPoint;
        setDockPoint(nextPoint);
        applyWalkMood(nextPoint.x < current.x ? "left" : "right", "playful");
        playBallChaseFrameRef.current = window.requestAnimationFrame(tick);
      };

      playBallChaseFrameRef.current = window.requestAnimationFrame(tick);
    },
    [
      applyWalkMood,
      buddyBox,
      cancelPlayBallChaseFrame,
      locale,
      setMood,
      setPlayBallCatchSignal,
      showBubble,
      viewport,
    ],
  );

  const handleTap = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      interruptFreeRoam("user-click");
      const now = Date.now();

      clearSingleClickTimer();

      const resolution = resolveOSBuddyTapSequence({
        previous: lastTapRef.current,
        tap: { at: now, x: clientX, y: clientY, pointerType },
        options: {
          tapWindowMs: DOUBLE_TAP_MS,
          maxDistancePx: DOUBLE_TAP_MAX_DISTANCE_PX,
          tripleTapGraceMs: TRIPLE_TAP_GRACE_MS,
          quadTapGraceMs: QUAD_TAP_GRACE_MS,
        },
      });

      if (resolution.kind === "trigger") {
        lastTapRef.current = null;
        if (getLocalAirControlSettings().enableQuadTap) {
          if (isAirControlActive) {
            stopAirPilotControl("user-exit");
          } else {
            activateAirControl();
          }
        }
        return;
      }

      lastTapRef.current = resolution.sequence;

      singleClickTimerRef.current = setTimeout(() => {
        const tap = lastTapRef.current;
        lastTapRef.current = null;
        if (!tap) return;

        if (resolution.action === "single") {
          void triggerClickReaction();
          return;
        }

        if (resolution.action === "double") {
          toggleWalkMode(tap.x, tap.y, tap.pointerType);
          return;
        }

        togglePlayBallGame();
      }, resolution.delayMs);
    },
    [
      activateAirControl,
      clearSingleClickTimer,
      interruptFreeRoam,
      isAirControlActive,
      stopAirPilotControl,
      togglePlayBallGame,
      toggleWalkMode,
      triggerClickReaction,
    ],
  );

  useEffect(() => {
    if (!isWalkModeActive) return;
    if (isAirControlActive) return;

    const shouldReturnHomeFromWalkTap = (event: PointerEvent) => {
      const now = Date.now();
      const previousTap = lastWalkExitTapRef.current;
      const isDoubleTap =
        previousTap != null &&
        now - previousTap.at <= DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) <=
          WALK_EXIT_DOUBLE_TAP_MAX_DISTANCE_PX;

      lastWalkExitTapRef.current = isDoubleTap
        ? null
        : { at: now, x: event.clientX, y: event.clientY };

      return isDoubleTap;
    };

    const updateWalkTarget = (event: PointerEvent) => {
      if (
        event.pointerType === "touch" &&
        activeWalkPointerIdRef.current != null &&
        activeWalkPointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      if (event.type === "pointerdown") {
        if (shouldReturnHomeFromWalkTap(event)) {
          startReturnHome();
          return;
        }
        activeWalkPointerIdRef.current = event.pointerId;
      }

      walkPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      };
      walkTargetRef.current = getWalkTargetPoint(event.clientX, event.clientY, event.pointerType);
    };

    const releaseWalkPointer = (event: PointerEvent) => {
      if (activeWalkPointerIdRef.current === event.pointerId) {
        activeWalkPointerIdRef.current = null;
      }
    };

    window.addEventListener("pointerdown", updateWalkTarget, { passive: true });
    window.addEventListener("pointermove", updateWalkTarget, { passive: true });
    window.addEventListener("pointerup", releaseWalkPointer, { passive: true });
    window.addEventListener("pointercancel", releaseWalkPointer, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", updateWalkTarget);
      window.removeEventListener("pointermove", updateWalkTarget);
      window.removeEventListener("pointerup", releaseWalkPointer);
      window.removeEventListener("pointercancel", releaseWalkPointer);
    };
  }, [getWalkTargetPoint, isAirControlActive, isWalkModeActive, startReturnHome]);

  useEffect(() => {
    if ((!isWalkModeActive && !isReturningHome) || viewport.width <= 0 || viewport.height <= 0) {
      cancelWalkAnimationFrame();
      return;
    }

    cancelWalkAnimationFrame();

    const completeReturnHome = (target: DockPoint) => {
      const finalTarget = clampDockPoint(target, viewport, buddyBox);
      dockPointRef.current = finalTarget;
      setDockPoint(finalTarget);
      setDragging(false, null);
      walkDirectionRef.current = null;
      setWalkModeActive(false);
      setReturningHome(false);
      setMood("idle");
      emitOSBuddyEvent({ type: "buddy:walk:end" });
      cancelWalkAnimationFrame();
    };

    const tick = () => {
      const current = dockPointRef.current;
      const target = isReturningHome
        ? restingTargetRef.current ?? resolveRestingTarget()
        : walkTargetRef.current ?? current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const distance = Math.hypot(dx, dy);

      if (isReturningHome && distance <= RETURN_HOME_SNAP_PX) {
        completeReturnHome(target);
        return;
      }

      let nextPoint = clampDockPoint(
        isReturningHome && distance > 0
          ? {
              x: current.x + (dx / distance) * Math.min(RETURN_HOME_SPEED_PX, distance),
              y: current.y + (dy / distance) * Math.min(RETURN_HOME_SPEED_PX, distance),
            }
          : {
              x: current.x + dx * WALK_FOLLOW_LERP,
              y: current.y + dy * WALK_FOLLOW_LERP,
            },
        viewport,
        buddyBox,
      );

      if (!isReturningHome && walkPointerRef.current) {
        const minClearance =
          walkPointerRef.current.pointerType === "touch"
            ? WALK_TOUCH_CLEARANCE_PX
            : WALK_MOUSE_CLEARANCE_PX;
        const pointerClearance = distanceFromPointToDockBox(
          { x: walkPointerRef.current.x, y: walkPointerRef.current.y },
          nextPoint,
          buddyBox,
        );

        if (pointerClearance < minClearance) {
          nextPoint = getWalkTargetForPointer({
            clientX: walkPointerRef.current.x,
            clientY: walkPointerRef.current.y,
            pointerType: walkPointerRef.current.pointerType,
            viewport,
            buddyBox,
          });
        }
      }

      const horizontalMovement = nextPoint.x - current.x;
      dockPointRef.current = nextPoint;
      setDockPoint(nextPoint);

      if (Math.abs(horizontalMovement) > WALK_DIRECTION_THRESHOLD_PX) {
        applyWalkMood(horizontalMovement < 0 ? "left" : "right", isReturningHome ? "idle" : "playful");
      } else if (!isReturningHome && distance <= WALK_IDLE_DISTANCE_PX) {
        applyWalkMood("idle", "playful");
      }

      walkAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };

    walkAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return cancelWalkAnimationFrame;
  }, [
    applyWalkMood,
    buddyBox,
    cancelWalkAnimationFrame,
    isReturningHome,
    isWalkModeActive,
    resolveRestingTarget,
    setDragging,
    setMood,
    setReturningHome,
    setWalkModeActive,
    viewport,
  ]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const currentDockPoint = dockPointRef.current;

    if (isQuickSnapActive) {
      event.preventDefault();
      if (quickSnapState !== "saving") cancelQuickSnap();
      return;
    }

    if (isAirControlActive) {
      event.preventDefault();
      clearLongPressTimer();
      longPressTriggeredRef.current = false;
      dragSessionRef.current = {
        pointerId: event.pointerId,
        startPointerX: event.clientX,
        startPointerY: event.clientY,
        startDockX: currentDockPoint.x,
        startDockY: currentDockPoint.y,
        lastDockX: currentDockPoint.x,
        isDragging: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const isWalkingOrReturning = isWalkModeActive || isReturningHome;

    interruptFreeRoam("user-drag");
    setMenuOpen(false);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;

    dragSessionRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startDockX: currentDockPoint.x,
      startDockY: currentDockPoint.y,
      lastDockX: currentDockPoint.x,
      isDragging: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    if (isWalkModeActive) {
      walkPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerType: event.pointerType,
      };
      walkTargetRef.current = getWalkTargetPoint(
        event.clientX,
        event.clientY,
        event.pointerType,
      );
    }

    if (isWalkingOrReturning) return;

    longPressTimerRef.current = setTimeout(() => {
      if (!dragSessionRef.current || dragSessionRef.current.isDragging) return;
      longPressTriggeredRef.current = true;
      armQuickSnap();
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (isAirControlActive) return;

    if (isWalkModeActive || isReturningHome) {
      if (isWalkModeActive) {
        walkPointerRef.current = {
          x: event.clientX,
          y: event.clientY,
          pointerType: event.pointerType,
        };
        walkTargetRef.current = getWalkTargetPoint(
          event.clientX,
          event.clientY,
          event.pointerType,
        );
      }
      return;
    }

    const dx = event.clientX - session.startPointerX;
    const dy = event.clientY - session.startPointerY;

    if (!session.isDragging && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      session.isDragging = true;
      emitOSBuddyEvent({ type: "buddy:drag:start" });
      clearLongPressTimer();
    }

    if (!session.isDragging) return;

    const nextPoint = clampDockPoint(
      {
        x: session.startDockX + dx,
        y: session.startDockY + dy,
      },
      viewport,
      buddyBox,
    );

    const direction =
      nextPoint.x < session.lastDockX ? "left" : nextPoint.x > session.lastDockX ? "right" : null;

    session.lastDockX = nextPoint.x;
    dragSessionRef.current = session;

    dockPointRef.current = nextPoint;
    setDockPoint(nextPoint);
    setDragging(true, direction);
  };

  const finishPointer = async (
    event: ReactPointerEvent<HTMLButtonElement>,
    reason: "up" | "cancel",
  ) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    clearLongPressTimer();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const wasDragging = session.isDragging;
    dragSessionRef.current = null;

    if (wasDragging) {
      setDragging(false, null);
      emitOSBuddyEvent({ type: "buddy:drag:end" });
      void incrementOSBuddyStat("drags");
      if (isWalkModeActive || isReturningHome) return;

      const finalDockPoint = clampDockPoint(dockPointRef.current, viewport, buddyBox);
      const finalPosition: OSBuddyPosition = {
        x: Math.round(finalDockPoint.x),
        y: Math.round(finalDockPoint.y),
        anchor: "custom",
      };

      const buddyCenter = {
        x: finalDockPoint.x + buddyBox.width / 2,
        y: finalDockPoint.y + buddyBox.height / 2,
      };

      if (isPointInsideOSBuddyRestingSpace(buddyCenter)) {
        const returnPoint = clampDockPoint(
          {
            x: session.startDockX,
            y: session.startDockY,
          },
          viewport,
          buddyBox,
        );
        dockPointRef.current = returnPoint;
        setDockPoint(returnPoint);
        dockInRestingSpace("sleeping");
        clearBubble();
        showBubble(
          locale === "zh-TW"
            ? `${name} 入咗 resting space。`
            : `${name} is resting in the sidebar.`,
          "success",
          { force: true, durationMs: 1800 },
        );
        return;
      }

      dockPointRef.current = finalDockPoint;
      setDockPoint(finalDockPoint);
      setActivePosition(finalPosition);
      await savePosition(finalPosition);
      return;
    }

    if (reason === "up" && !longPressTriggeredRef.current) {
      handleTap(event.clientX, event.clientY, event.pointerType);
    }
  };

  const moveByKeyboard = async (dx: number, dy: number) => {
    if (isWalkModeActive || isReturningHome) return;

    interruptFreeRoam("keyboard");
    const currentDockPoint = dockPointRef.current;
    const nextPoint = clampDockPoint(
      {
        x: currentDockPoint.x + dx,
        y: currentDockPoint.y + dy,
      },
      viewport,
      buddyBox,
    );

    dockPointRef.current = nextPoint;
    setDockPoint(nextPoint);
    const direction = dx < 0 ? "dragging-left" : dx > 0 ? "dragging-right" : "idle";
    temporarilySetMood(direction, 240);

    const finalPosition: OSBuddyPosition = {
      x: Math.round(nextPoint.x),
      y: Math.round(nextPoint.y),
      anchor: "custom",
    };
    setActivePosition(finalPosition);
    await savePosition(finalPosition);
  };

  const handleKeyDown = async (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 48 : 16;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      interruptFreeRoam("user-click");
      void triggerClickReaction();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      await moveByKeyboard(-step, 0);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      await moveByKeyboard(step, 0);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      await moveByKeyboard(0, -step);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      await moveByKeyboard(0, step);
      return;
    }

    if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      interruptFreeRoam("menu-open");
      openMenu(dockPoint.x + buddyBox.width + 12, dockPoint.y - 8);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      interruptFreeRoam("keyboard");
      clearBubble();
      setMenuOpen(false);
      setPetPickerOpen(false);
      resetPlayBallRuntime();
      closeMiniGame();
    }
  };

  if (!mounted || !enabled) return null;

  if (isRestingInSidebar) {
    return null;
  }

  const airPilotRuntimeEnabled = isAirControlActive;
  const airPilotSettingsSnapshot = getLocalOSBuddyAirPilotSettings();
  const bubbleHorizontal = dockPoint.x > viewport.width / 2 ? "left" : "right";
  const bubbleVertical = dockPoint.y < 136 ? "below" : "above";
  const fileDropBubbleWidth =
    viewport.width > 0 ? Math.min(420, Math.max(220, viewport.width - 24)) : 320;
  const fileDropBubbleLeft =
    viewport.width > 0
      ? clamp(
          dockPoint.x + buddyBox.width / 2 - fileDropBubbleWidth / 2,
          12,
          Math.max(12, viewport.width - fileDropBubbleWidth - 12),
        )
      : 12;
  const fileDropSpaceAbove = Math.max(0, dockPoint.y - 16);
  const fileDropSpaceBelow = Math.max(
    0,
    viewport.height - (dockPoint.y + buddyBox.height) - 16,
  );
  const fileDropBubbleVertical =
    fileDropSpaceBelow >= 280 || fileDropSpaceBelow >= fileDropSpaceAbove
      ? "below"
      : "above";
  const fileDropAvailableSpace =
    fileDropBubbleVertical === "below" ? fileDropSpaceBelow : fileDropSpaceAbove;
  const fileDropBubbleMaxHeight = Math.max(
    140,
    Math.min(540, Math.max(140, fileDropAvailableSpace - 8)),
  );
  const fileDropBubbleFixedStyle =
    viewport.width > 0 && viewport.height > 0
      ? {
          left: fileDropBubbleLeft,
          right: "auto",
          width: fileDropBubbleWidth,
          maxWidth: fileDropBubbleWidth,
          maxHeight: fileDropBubbleMaxHeight,
          ...(fileDropBubbleVertical === "below"
            ? { top: dockPoint.y + buddyBox.height + 12, bottom: "auto" }
            : { bottom: viewport.height - dockPoint.y + 12, top: "auto" }),
        }
      : undefined;
  const quickSnapDeckWidth =
    viewport.width > 0 ? Math.min(380, Math.max(280, viewport.width - 24)) : 340;
  const quickSnapDeckLeft =
    viewport.width > 0
      ? clamp(
          dockPoint.x + buddyBox.width / 2 - quickSnapDeckWidth / 2,
          12,
          Math.max(12, viewport.width - quickSnapDeckWidth - 12),
        )
      : 12;
  const quickSnapSpaceAbove = Math.max(0, dockPoint.y - 16);
  const quickSnapSpaceBelow = Math.max(
    0,
    viewport.height - (dockPoint.y + buddyBox.height) - 16,
  );
  const quickSnapVertical =
    quickSnapSpaceBelow >= 110 || quickSnapSpaceBelow >= quickSnapSpaceAbove
      ? "below"
      : "above";
  const quickSnapDockGap =
    viewport.width > 0 && viewport.width < 640 && quickSnapVertical === "above" ? 150 : 10;
  const quickSnapCloudFixedStyle =
    viewport.width > 0 && viewport.height > 0
      ? {
          left: quickSnapDeckLeft,
          width: quickSnapDeckWidth,
          maxWidth: quickSnapDeckWidth,
          ...(quickSnapVertical === "below"
            ? { top: dockPoint.y + buddyBox.height + quickSnapDockGap, bottom: "auto" }
            : { bottom: viewport.height - dockPoint.y + quickSnapDockGap, top: "auto" }),
        }
      : undefined;
  const quickSnapPasteWidth =
    viewport.width > 0 ? Math.min(148, Math.max(112, viewport.width - 24)) : 136;
  const quickSnapPasteLeft =
    viewport.width > 0
      ? clamp(
          dockPoint.x + buddyBox.width / 2 - quickSnapPasteWidth / 2,
          12,
          Math.max(12, viewport.width - quickSnapPasteWidth - 12),
        )
      : 0;
  const quickSnapPasteTop =
    viewport.width > 0 && viewport.height > 0
      ? quickSnapVertical === "below"
        ? dockPoint.y + buddyBox.height + 10
        : Math.max(12, dockPoint.y - 46)
      : 0;
  const quickSnapPasteFixedStyle =
    viewport.width > 0 && viewport.height > 0
      ? {
          left: quickSnapPasteLeft,
          top: quickSnapPasteTop,
          bottom: "auto",
          width: quickSnapPasteWidth,
        }
      : undefined;
  const quickSnapPasteSinkFixedStyle =
    viewport.width > 0 && viewport.height > 0
      ? {
          left: quickSnapPasteLeft + quickSnapPasteWidth / 2,
          top: quickSnapPasteTop + 18,
        }
      : undefined;
  const shouldHideDockForOverlayMiniGame = isOverlayMiniGameOpen || isOverlayMiniGamePresent;

  return (
    <>
      <OSBuddyGameOverlayHost
        open={isOverlayMiniGameOpen}
        activeGame={activeMiniGame}
        locale={locale}
        petId={petId}
        buddyName={name}
        onClose={closeMiniGame}
        onComplete={handleMiniGameComplete}
        onExitComplete={handleOverlayMiniGameExitComplete}
      />

      {!shouldHideDockForOverlayMiniGame ? (
        <>
      <div
        className={cn(
          "os-buddy-dock fixed z-[2147483000]",
          isFreeRoaming && "os-buddy-dock--free-roaming",
          isFileDragOverBuddy && "os-buddy-dock--file-catch-ready",
          isQuickSnapActive && "os-buddy-dock--quick-snap",
        )}
        style={{
          left: dockPoint.x,
          top: dockPoint.y,
          pointerEvents:
            (isWalkModeActive && !isAirControlActive) || isReturningHome ? "none" : undefined,
        }}
      >
        {isQuickSnapActive && quickSnapState === "armed" ? (
          <>
            <div
              className="os-buddy-quick-snap-capture-layer"
              data-airpilot-os-buddy-action="quick-snap-paste"
              role="button"
              tabIndex={-1}
              aria-label="Paste into OS Buddy Quick Snap"
              onClick={handleQuickSnapPasteRequest}
              onPointerDown={handleQuickSnapPasteRequest}
            />
            <button
              type="button"
              className="os-buddy-quick-snap-paste-target"
              style={quickSnapPasteFixedStyle}
              data-airpilot-os-buddy-action="quick-snap-paste"
              aria-label="Paste into OS Buddy Quick Snap"
              onClick={handleQuickSnapPasteRequest}
              onPointerDown={handleQuickSnapPasteRequest}
            >
              {quickSnapClipboardPending ? "Reading..." : "Paste"}
            </button>
            <textarea
              ref={quickSnapPasteTargetRef}
              className="os-buddy-quick-snap-paste-sink"
              style={quickSnapPasteSinkFixedStyle}
              aria-label="Hidden Quick Snap paste input"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              inputMode="none"
              spellCheck={false}
              defaultValue=""
              onPaste={handleQuickSnapPaste}
              onInput={(event) => {
                event.currentTarget.value = "";
              }}
            />
          </>
        ) : null}

        {quickSnapPayload && (quickSnapState === "ready" || quickSnapState === "saving") ? (
          <OSBuddyQuickSnapClouds
            fixedStyle={quickSnapCloudFixedStyle}
            dismissing={quickSnapCloudsDismissing}
            saving={quickSnapState === "saving"}
            onSelect={(destination) => {
              void commitQuickSnap(destination);
            }}
          />
        ) : null}

        {fileDropItems.length > 0 ? (
          <OSBuddyFileDropBubble
            items={fileDropItems}
            horizontal="center"
            vertical={fileDropBubbleVertical}
            fixedStyle={fileDropBubbleFixedStyle}
            isRouting={isFileDropRouting}
            onDestinationChange={handleFileDropDestinationChange}
            onRemove={handleRemoveFileDropItem}
            onCancel={handleCancelFileDrop}
            onSave={handleSaveFileDrop}
          />
        ) : bubble ? (
          <OSBuddyBubble
            bubble={bubble}
            horizontal={bubbleHorizontal}
            vertical={bubbleVertical}
            onDismiss={clearBubble}
            onCtaClick={(cta) => {
              openOverlayMiniGame(cta.game);
            }}
          />
        ) : null}

        <button
          type="button"
          className={cn(
            "relative rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 touch-none",
            secretModeActive && "os-buddy--secret",
            isQuickSnapActive && "os-buddy-quick-snap-button",
          )}
          data-quick-snap-state={isQuickSnapActive ? quickSnapState : undefined}
          style={{
            transform: `scale(${buddyScale})`,
            transformOrigin: "top left",
          }}
          aria-label={`${name}, your OS Buddy`}
          data-airpilot-os-buddy-action="quick-snap-activate"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => void finishPointer(event, "up")}
          onPointerCancel={(event) => void finishPointer(event, "cancel")}
          onContextMenu={(event) => {
            event.preventDefault();
            if (isQuickSnapActive && quickSnapState !== "saving") cancelQuickSnap();
            openMenu(event.clientX + 6, event.clientY + 6);
          }}
          onClick={(event) => {
            if (event.detail !== 0 || isQuickSnapActive) return;
            event.preventDefault();
            event.stopPropagation();
            armQuickSnap();
          }}
          onKeyDown={(event) => {
            void handleKeyDown(event);
          }}
        >
          {isQuickSnapActive ? (
            <>
              <span className="os-buddy-quick-snap-ring" aria-hidden />
              <span className="os-buddy-quick-snap-stars" aria-hidden>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </>
          ) : null}
          <OSBuddySprite
            petId={petId}
            name={name}
            mood={mood}
            animationSrc={animationSrc}
            isDragging={
              isDragging ||
              isWalkModeActive ||
              isReturningHome ||
              isFreeRoaming ||
              isAirControlActive
            }
            isBirthdayMode={isBirthdayMode}
          />
          {focusSession && mood === "focused" ? (
            <OSBuddyFocusBadge
              startedAt={focusSession.startedAt}
              durationMinutes={focusSession.durationMinutes}
            />
          ) : null}
        </button>
      </div>

      <OSBuddyAirControlOverlay
        runtimeEnabled={airPilotRuntimeEnabled}
        airPilotActive={isAirControlActive}
        locale={locale}
        viewport={viewport}
        dockPoint={dockPoint}
        buddyBox={buddyBox}
        onCommand={handleAirControlCommand}
      />

      <OSBuddyMenu
        key={isMenuOpen ? "os-buddy-menu-open" : "os-buddy-menu-closed"}
        open={isMenuOpen}
        x={menuPoint.x}
        y={menuPoint.y}
        locale={locale}
        currentName={name}
        onClose={() => setMenuOpen(false)}
        onOpenPetPicker={() => setPetPickerOpen(true)}
        onRename={(nextName) => {
          void renameBuddy(nextName);
        }}
        onResetPosition={() => {
          setActivePosition({ x: null, y: null, anchor: "bottom-left" });
          void resetPosition();
        }}
        onOpenGame={(game) => {
          openOverlayMiniGame(game);
        }}
        onHide={() => {
          void setEnabled(false);
          toast.success(
            locale === "zh-TW"
              ? "OS Buddy 已隱藏。你可以在設定中重新開啟。"
              : "OS Buddy hidden. You can bring it back from Settings.",
          );
        }}
        birthdayProfile={birthdayProfile}
        onSaveBirthdayProfile={saveBirthdayProfile}
      />

      <OSBuddyPetPicker
        open={isPetPickerOpen}
        onOpenChange={setPetPickerOpen}
        locale={locale}
        selectedPetId={petId}
        onChoose={(nextPetId) => {
          void changePet(nextPetId);
          setPetPickerOpen(false);
        }}
      />

      <OSBuddyPlayBallOverlay
        open={isPlayBallOpen}
        locale={locale}
        caughtBall={playBallCatchSignal}
        gestureZonesEnabled={
          isAirControlActive &&
          airPilotPlusMode === "plusActive" &&
          airPilotSettingsSnapshot.playBallGestureModeEnabled
        }
        onBallThrown={chasePlayBall}
        onBallMove={trackPlayBall}
        onCommandZoneHit={handlePlayBallCommandZone}
      />
        </>
      ) : null}
    </>
  );
}
