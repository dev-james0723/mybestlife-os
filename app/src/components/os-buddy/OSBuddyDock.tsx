"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { useOSBuddy } from "@/hooks/use-os-buddy";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import { OSBuddySprite } from "./OSBuddySprite";
import { OSBuddyMenu } from "./OSBuddyMenu";
import { OSBuddyPetPicker } from "./OSBuddyPetPicker";
import { OSBuddyMiniGameModal } from "./games/OSBuddyMiniGameModal";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { registerOSBuddyReactions } from "@/lib/os-buddy/os-buddy-reactions";
import type { OSBuddyPosition } from "@/types/os-buddy";

const DRAG_THRESHOLD_PX = 6;
const LONG_PRESS_MS = 600;
const VIEWPORT_EDGE_GAP = 12;
const MENU_WIDTH = 250;
const MENU_HEIGHT = 330;

type DockPoint = { x: number; y: number };

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
  const temporarilySetMood = useOSBuddyStore((s) => s.temporarilySetMood);
  const registerClickBurst = useOSBuddyStore((s) => s.registerClickBurst);
  const resetClickBurst = useOSBuddyStore((s) => s.resetClickBurst);
  const isPetPickerOpen = useOSBuddyStore((s) => s.isPetPickerOpen);
  const setPetPickerOpen = useOSBuddyStore((s) => s.setPetPickerOpen);
  const isMiniGameOpen = useOSBuddyStore((s) => s.isMiniGameOpen);
  const activeMiniGame = useOSBuddyStore((s) => s.activeMiniGame);
  const openMiniGame = useOSBuddyStore((s) => s.openMiniGame);
  const closeMiniGame = useOSBuddyStore((s) => s.closeMiniGame);

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

  const dragSessionRef = useRef<DragSession | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setActivePosition(storedPosition);
  }, [storedPosition.anchor, storedPosition.x, storedPosition.y]);

  useEffect(() => {
    if (!mounted || viewport.width <= 0 || viewport.height <= 0) return;
    if (dragSessionRef.current?.isDragging) return;

    const next = resolveAnchorPosition(activePosition, viewport, buddyBox);
    setDockPoint(next);
  }, [activePosition, buddyBox, mounted, viewport]);

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

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openMenu = useCallback(
    (x: number, y: number) => {
      const clampedX = clamp(x, VIEWPORT_EDGE_GAP, Math.max(VIEWPORT_EDGE_GAP, viewport.width - MENU_WIDTH - VIEWPORT_EDGE_GAP));
      const clampedY = clamp(y, VIEWPORT_EDGE_GAP, Math.max(VIEWPORT_EDGE_GAP, viewport.height - MENU_HEIGHT - VIEWPORT_EDGE_GAP));
      setMenuPoint({ x: clampedX, y: clampedY });
      setMenuOpen(true);
    },
    [setMenuOpen, viewport.height, viewport.width],
  );

  const triggerClickReaction = useCallback(() => {
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

    temporarilySetMood("playful", 1200);
    showBubble(locale === "zh-TW" ? "我在這裡。" : "I’m here.", "user-triggered", {
      force: true,
    });
  }, [incrementInteraction, locale, registerClickBurst, resetClickBurst, showBubble, temporarilySetMood]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (viewport.width <= 0 || viewport.height <= 0) return;

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
    event.currentTarget.releasePointerCapture(event.pointerId);

    const wasDragging = session.isDragging;
    dragSessionRef.current = null;

    if (wasDragging) {
      setDragging(false, null);
      emitOSBuddyEvent({ type: "buddy:drag:end" });
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
      triggerClickReaction();
    }
  };

  const moveByKeyboard = async (dx: number, dy: number) => {
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
      triggerClickReaction();
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
        style={{ left: dockPoint.x, top: dockPoint.y }}
      >
        {bubble ? (
          <div
            className={cn(
              "absolute bottom-full mb-2 max-w-[220px] rounded-xl border bg-popover px-3 py-2 text-xs shadow",
              "left-1/2 -translate-x-1/2",
            )}
          >
            {bubble.message}
          </div>
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
            isDragging={isDragging}
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
