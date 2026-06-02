"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useOSBuddyCompanion } from "@/hooks/use-os-buddy-companion";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import { OSBuddySprite } from "./OSBuddySprite";
import { OSBuddyBubble } from "./OSBuddyBubble";
import { OSBuddyMenu } from "./OSBuddyMenu";
import { OSBuddyPetPicker } from "./OSBuddyPetPicker";
import { OSBuddyMiniGameModal } from "./games/OSBuddyMiniGameModal";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { registerOSBuddyReactions } from "@/lib/os-buddy/os-buddy-reactions";
import type { OSBuddyPosition } from "@/types/os-buddy";

const DRAG_THRESHOLD_PX = 6;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 24;
const LONG_PRESS_MS = 600;
const VIEWPORT_EDGE_GAP = 12;
const MENU_WIDTH = 250;
const MENU_HEIGHT = 330;
const WALK_FOLLOW_LERP = 0.18;
const WALK_IDLE_DISTANCE_PX = 6;
const WALK_DIRECTION_THRESHOLD_PX = 0.55;
const RETURN_HOME_SPEED_PX = 22;
const RETURN_HOME_SNAP_PX = 4;
const WALK_MOUSE_CLEARANCE_PX = 24;
const WALK_TOUCH_CLEARANCE_PX = 56;
const WALK_MOUSE_OFFSET = { x: 40, y: 32 };
const WALK_TOUCH_OFFSET = { x: 48, y: -88 };
const WALK_EXIT_HALO_PX = 28;
const WALK_TOUCH_EXIT_HALO_PX = 44;

type DockPoint = { x: number; y: number };
type WalkDirection = "left" | "right" | "idle";

type DragSession = {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startDockX: number;
  startDockY: number;
  lastDockX: number;
  isDragging: boolean;
};

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
    case "bottom-left":
      return clampDockPoint({ x: leftX, y: bottomY }, viewport, buddyBox);
    case "top-left":
      return clampDockPoint({ x: leftX, y: topY }, viewport, buddyBox);
    case "top-right":
      return clampDockPoint({ x: rightX, y: topY }, viewport, buddyBox);
    case "bottom-right":
    default:
      return clampDockPoint({ x: rightX, y: bottomY }, viewport, buddyBox);
  }
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

export function OSBuddyDock() {
  const locale = useAppStore((s) => s.language);

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
    incrementInteraction,
    setEnabled,
  } = useOSBuddy();

  const bubble = useOSBuddyStore((s) => s.bubble);
  const clearBubble = useOSBuddyStore((s) => s.clearBubble);
  const isMenuOpen = useOSBuddyStore((s) => s.isMenuOpen);
  const setMenuOpen = useOSBuddyStore((s) => s.setMenuOpen);
  const setDragging = useOSBuddyStore((s) => s.setDragging);
  const isDragging = useOSBuddyStore((s) => s.isDragging);
  const isWalkModeActive = useOSBuddyStore((s) => s.isWalkModeActive);
  const isReturningHome = useOSBuddyStore((s) => s.isReturningHome);
  const setWalkModeActive = useOSBuddyStore((s) => s.setWalkModeActive);
  const setReturningHome = useOSBuddyStore((s) => s.setReturningHome);
  const temporarilySetMood = useOSBuddyStore((s) => s.temporarilySetMood);
  const registerClickBurst = useOSBuddyStore((s) => s.registerClickBurst);
  const resetClickBurst = useOSBuddyStore((s) => s.resetClickBurst);
  const isPetPickerOpen = useOSBuddyStore((s) => s.isPetPickerOpen);
  const setPetPickerOpen = useOSBuddyStore((s) => s.setPetPickerOpen);
  const isMiniGameOpen = useOSBuddyStore((s) => s.isMiniGameOpen);
  const activeMiniGame = useOSBuddyStore((s) => s.activeMiniGame);
  const openMiniGame = useOSBuddyStore((s) => s.openMiniGame);
  const closeMiniGame = useOSBuddyStore((s) => s.closeMiniGame);
  const { getCompanionLine } = useOSBuddyCompanion({ locale, buddyName: name });

  const [mounted, setMounted] = useState(false);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [activePosition, setActivePosition] = useState<OSBuddyPosition>({
    x: null,
    y: null,
    anchor: "bottom-right",
  });
  const [dockPoint, setDockPoint] = useState<DockPoint>({ x: 0, y: 0 });
  const [menuPoint, setMenuPoint] = useState<DockPoint>({ x: 0, y: 0 });

  const buddyBox = useMemo(
    () => ({
      width: viewport.width > 0 && viewport.width < 640 ? 58 : 74,
      height: viewport.width > 0 && viewport.width < 640 ? 64 : 82,
    }),
    [viewport.width],
  );
  const restingPosition = useMemo<OSBuddyPosition>(
    () => ({
      anchor: storedPosition.anchor,
      x: storedPosition.x,
      y: storedPosition.y,
    }),
    [storedPosition.anchor, storedPosition.x, storedPosition.y],
  );

  const dragSessionRef = useRef<DragSession | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const lastWalkExitTapRef = useRef<{ at: number; x: number; y: number } | null>(null);
  const singleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeWalkPointerIdRef = useRef<number | null>(null);
  const walkPointerRef = useRef<{ x: number; y: number; pointerType: string } | null>(null);
  const walkAnimationFrameRef = useRef<number | null>(null);
  const walkDirectionRef = useRef<WalkDirection | null>(null);
  const walkTargetRef = useRef<DockPoint | null>(null);
  const restingTargetRef = useRef<DockPoint | null>(null);
  const dockPointRef = useRef<DockPoint>({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    dockPointRef.current = dockPoint;
  }, [dockPoint]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    setActivePosition(restingPosition);
  }, [restingPosition]);

  useEffect(() => {
    if (!mounted || viewport.width <= 0 || viewport.height <= 0) return;
    if (dragSessionRef.current?.isDragging) return;
    if (isWalkModeActive || isReturningHome) return;

    const next = resolveAnchorPosition(activePosition, viewport, buddyBox);
    setDockPoint(next);
  }, [activePosition, buddyBox, isReturningHome, isWalkModeActive, mounted, viewport]);

  useEffect(() => {
    return registerOSBuddyReactions({
      locale,
      buddyName: name,
      handlers: {
        setMood,
        temporarilySetMood,
        showBubble,
      },
    });
  }, [locale, name, setMood, showBubble, temporarilySetMood]);

  useEffect(() => {
    if (!mounted) return;

    let idle = false;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const markActive = () => {
      if (idle) {
        idle = false;
        emitOSBuddyEvent({ type: "user:return" });
      }

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idle = true;
        emitOSBuddyEvent({ type: "user:idle" });
      }, 60_000);
    };

    markActive();

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, markActive, { passive: true });
    });

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markActive);
      });
    };
  }, [mounted]);

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

  const cancelWalkAnimationFrame = useCallback(() => {
    if (walkAnimationFrameRef.current != null) {
      window.cancelAnimationFrame(walkAnimationFrameRef.current);
      walkAnimationFrameRef.current = null;
    }
  }, []);

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
    const target = resolveAnchorPosition(restingPosition, viewport, buddyBox);
    restingTargetRef.current = target;
    return target;
  }, [buddyBox, restingPosition, viewport]);

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

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearSingleClickTimer();
      cancelWalkAnimationFrame();
    };
  }, [cancelWalkAnimationFrame, clearLongPressTimer, clearSingleClickTimer]);

  const openMenu = useCallback(
    (x: number, y: number) => {
      const clampedX = clamp(x, VIEWPORT_EDGE_GAP, Math.max(VIEWPORT_EDGE_GAP, viewport.width - MENU_WIDTH - VIEWPORT_EDGE_GAP));
      const clampedY = clamp(y, VIEWPORT_EDGE_GAP, Math.max(VIEWPORT_EDGE_GAP, viewport.height - MENU_HEIGHT - VIEWPORT_EDGE_GAP));
      setMenuPoint({ x: clampedX, y: clampedY });
      setMenuOpen(true);
    },
    [setMenuOpen, viewport.height, viewport.width],
  );

  const triggerClickReaction = useCallback(async () => {
    emitOSBuddyEvent({ type: "buddy:clicked" });
    void incrementInteraction("click");

    const burstCount = registerClickBurst();
    if (burstCount >= 7) {
      resetClickBurst();
      temporarilySetMood("celebrating", 1800);
      showBubble(
        locale === "zh-TW" ? "隱藏像素模式解鎖。" : "Secret pixel mode unlocked.",
        "game",
        { force: true, durationMs: 2800 },
      );
      return;
    }

    temporarilySetMood("thinking", 900);
    showBubble(locale === "zh-TW" ? "我看看今天..." : "Let me peek at today...", "user-triggered", {
      force: true,
      durationMs: 1800,
      kind: "fallback",
    });

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
    incrementInteraction,
    locale,
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
    closeMiniGame();
    setWalkModeActive(false);
    setReturningHome(true);
    emitOSBuddyEvent({ type: "buddy:walk:return" });
  }, [
    clearLongPressTimer,
    clearSingleClickTimer,
    closeMiniGame,
    resolveRestingTarget,
    setMenuOpen,
    setPetPickerOpen,
    setReturningHome,
    setWalkModeActive,
    viewport.height,
    viewport.width,
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

  const handleTap = useCallback(
    (clientX: number, clientY: number, pointerType: string) => {
      const now = Date.now();
      const previousTap = lastTapRef.current;
      const isDoubleTap =
        previousTap != null &&
        now - previousTap.at <= DOUBLE_TAP_MS &&
        Math.hypot(clientX - previousTap.x, clientY - previousTap.y) <= DOUBLE_TAP_MAX_DISTANCE_PX;

      if (isDoubleTap) {
        clearSingleClickTimer();
        lastTapRef.current = null;
        toggleWalkMode(clientX, clientY, pointerType);
        return;
      }

      clearSingleClickTimer();
      lastTapRef.current = { at: now, x: clientX, y: clientY };
      singleClickTimerRef.current = setTimeout(() => {
        lastTapRef.current = null;
        void triggerClickReaction();
      }, DOUBLE_TAP_MS);
    },
    [clearSingleClickTimer, toggleWalkMode, triggerClickReaction],
  );

  useEffect(() => {
    if (!isWalkModeActive) return;

    const shouldReturnHomeFromWalkTap = (event: PointerEvent) => {
      const now = Date.now();
      const previousTap = lastWalkExitTapRef.current;
      const exitPadding =
        event.pointerType === "touch" ? WALK_TOUCH_EXIT_HALO_PX : WALK_EXIT_HALO_PX;
      const isNearBuddy = isPointNearDockBox({
        clientX: event.clientX,
        clientY: event.clientY,
        dockPoint: dockPointRef.current,
        buddyBox,
        padding: exitPadding,
      });

      if (!isNearBuddy) {
        lastWalkExitTapRef.current = null;
        return false;
      }

      const maxTapDistance =
        event.pointerType === "touch" ? WALK_TOUCH_EXIT_HALO_PX : DOUBLE_TAP_MAX_DISTANCE_PX;
      const isDoubleTap =
        previousTap != null &&
        now - previousTap.at <= DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) <= maxTapDistance;

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
  }, [buddyBox, getWalkTargetPoint, isWalkModeActive, startReturnHome]);

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

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (viewport.width <= 0 || viewport.height <= 0) return;

    const isWalkingOrReturning = isWalkModeActive || isReturningHome;

    setMenuOpen(false);
    clearLongPressTimer();
    longPressTriggeredRef.current = false;

    dragSessionRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startDockX: dockPoint.x,
      startDockY: dockPoint.y,
      lastDockX: dockPoint.x,
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
      emitOSBuddyEvent({ type: "buddy:longpress" });
      openMenu(dockPoint.x + buddyBox.width + 12, dockPoint.y - 8);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

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

    setDockPoint(nextPoint);
    setDragging(true, direction);
  };

  const finishPointer = async (
    event: React.PointerEvent<HTMLButtonElement>,
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
      if (isWalkModeActive || isReturningHome) return;

      const finalPosition: OSBuddyPosition = {
        x: Math.round(dockPoint.x),
        y: Math.round(dockPoint.y),
        anchor: "custom",
      };
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

    const nextPoint = clampDockPoint(
      {
        x: dockPoint.x + dx,
        y: dockPoint.y + dy,
      },
      viewport,
      buddyBox,
    );

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

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 48 : 16;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
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
      openMenu(dockPoint.x + buddyBox.width + 12, dockPoint.y - 8);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearBubble();
      setMenuOpen(false);
      setPetPickerOpen(false);
      closeMiniGame();
    }
  };

  if (!mounted || !enabled) return null;

  return (
    <>
      <div
        className="fixed z-[120]"
        style={{
          left: dockPoint.x,
          top: dockPoint.y,
          pointerEvents: isWalkModeActive || isReturningHome ? "none" : undefined,
        }}
      >
        {bubble ? (
          <OSBuddyBubble
            bubble={bubble}
            onCtaClick={(cta) => {
              openMiniGame(cta.game);
              clearBubble();
              emitOSBuddyEvent({ type: "game:start", game: cta.game });
            }}
          />
        ) : null}

        <button
          type="button"
          className="relative rounded-full p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-primary/60 touch-none"
          aria-label={`${name}, your OS Buddy`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => void finishPointer(event, "up")}
          onPointerCancel={(event) => void finishPointer(event, "cancel")}
          onContextMenu={(event) => {
            event.preventDefault();
            openMenu(event.clientX + 6, event.clientY + 6);
          }}
          onKeyDown={(event) => {
            void handleKeyDown(event);
          }}
        >
          <OSBuddySprite
            petId={petId}
            name={name}
            mood={mood}
            animationSrc={animationSrc}
            isDragging={isDragging || isWalkModeActive || isReturningHome}
          />
        </button>
      </div>

      <OSBuddyMenu
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
          setActivePosition({ x: null, y: null, anchor: "bottom-right" });
          void resetPosition();
        }}
        onOpenGame={(game) => {
          openMiniGame(game);
          emitOSBuddyEvent({ type: "game:start", game });
        }}
        onHide={() => {
          void setEnabled(false);
        }}
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

      <OSBuddyMiniGameModal
        open={isMiniGameOpen}
        onOpenChange={(open) => {
          if (!open) closeMiniGame();
        }}
        game={activeMiniGame}
        locale={locale}
        petId={petId}
        buddyName={name}
        onComplete={(game, score) => {
          emitOSBuddyEvent({ type: "game:complete", game, score });
          closeMiniGame();
        }}
      />
    </>
  );
}
