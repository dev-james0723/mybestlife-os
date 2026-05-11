"use client";

/**
 * useNodeGesture — pointer state machine for the Brain 3D Sphere.
 *
 * Distinguishes click / long press / drag from a single pointer
 * stream, with the spec's exact thresholds:
 *
 *   - pointerup before 350ms with movement ≤ 8px → click
 *   - 350ms held with movement ≤ 8px            → longpress-start
 *     (release later → longpress-end; click is suppressed)
 *   - movement > 8px before either fires        → drag-start
 *     (release later → drag-end; click is suppressed)
 *
 * Hover is emitted on every pointermove so the consumer can preview
 * focus without a click. Hover is independent of click/longpress
 * arming and survives across any active gesture so the highlight
 * tracks even while the user is mid-orbit.
 *
 * The hook returns React pointer-event handlers ready to spread onto
 * a host element. Pointer capture is set on pointerdown so move/up
 * still arrive when the cursor leaves the surface (essential for
 * fast drags off the canvas edge).
 */

import { useCallback, useEffect, useRef } from "react";
import {
  SPHERE_DRAG_CANCEL_THRESHOLD_PX,
  SPHERE_LONG_PRESS_THRESHOLD_MS,
  type SphereGestureEvent,
  type SphereNodeId,
} from "@/types/brain-sphere";

type GestureCallback = (event: SphereGestureEvent) => void;

type ActiveGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  startNodeId: SphereNodeId | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  longPressTriggered: boolean;
  dragTriggered: boolean;
  /** Element pointer was captured on, so we can release cleanly. */
  captureTarget: Element | null;
};

interface UseNodeGestureOptions {
  /**
   * Resolves the node id under the pointer at given client coords.
   * Return `null` for empty space. The host owns hit-testing so the
   * hook stays renderer-agnostic (3D, 2D, or even DOM nodes).
   */
  hitTest: (clientX: number, clientY: number) => SphereNodeId | null;
  /** Called for every emitted gesture event. */
  onGesture: GestureCallback;
  /** Optional: skip hover emission on devices with no fine pointer. */
  hoverEnabled?: boolean;
}

export interface SphereGestureHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: (e: React.PointerEvent<HTMLElement>) => void;
}

export function useNodeGesture({
  hitTest,
  onGesture,
  hoverEnabled = true,
}: UseNodeGestureOptions): SphereGestureHandlers {
  // Latest hitTest / onGesture / hoverEnabled mirrored into refs so
  // the handlers below never bind a stale closure (the hook returns
  // stable callbacks regardless of how often the consumer re-renders).
  // The sync runs in an effect so we don't mutate refs during render
  // (React 19 strict).
  const hitTestRef = useRef(hitTest);
  const onGestureRef = useRef(onGesture);
  const hoverEnabledRef = useRef(hoverEnabled);
  useEffect(() => {
    hitTestRef.current = hitTest;
    onGestureRef.current = onGesture;
    hoverEnabledRef.current = hoverEnabled;
  });

  const activeRef = useRef<ActiveGesture | null>(null);
  const lastHoverIdRef = useRef<SphereNodeId | null>(null);

  const clearTimer = useCallback(() => {
    const g = activeRef.current;
    if (g?.longPressTimer) {
      clearTimeout(g.longPressTimer);
      g.longPressTimer = null;
    }
  }, []);

  const releaseCapture = useCallback((g: ActiveGesture, pointerId: number) => {
    if (g.captureTarget) {
      try {
        g.captureTarget.releasePointerCapture?.(pointerId);
      } catch {
        /* noop — element may have been detached */
      }
      g.captureTarget = null;
    }
  }, []);

  const finishGesture = useCallback(
    (pointerId: number) => {
      const g = activeRef.current;
      if (!g) return;
      clearTimer();
      releaseCapture(g, pointerId);
      activeRef.current = null;
    },
    [clearTimer, releaseCapture],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Single-pointer only; ignore additional touches.
      if (activeRef.current) return;
      // Right-click / middle-click should not start a gesture.
      if (e.button !== 0 && e.pointerType === "mouse") return;

      const startNodeId = hitTestRef.current(e.clientX, e.clientY);
      const target = e.currentTarget;
      let captureTarget: Element | null = null;
      try {
        target.setPointerCapture?.(e.pointerId);
        captureTarget = target;
      } catch {
        captureTarget = null;
      }

      const gesture: ActiveGesture = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: performance.now(),
        startNodeId,
        longPressTimer: null,
        longPressTriggered: false,
        dragTriggered: false,
        captureTarget,
      };

      gesture.longPressTimer = setTimeout(() => {
        const cur = activeRef.current;
        if (!cur || cur.dragTriggered || cur.longPressTriggered) return;
        cur.longPressTimer = null;
        cur.longPressTriggered = true;
        onGestureRef.current({
          kind: "longpress-start",
          nodeId: cur.startNodeId,
        });
      }, SPHERE_LONG_PRESS_THRESHOLD_MS);

      activeRef.current = gesture;
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const gesture = activeRef.current;

      // Drag-escape detection during click/longpress arming.
      if (
        gesture &&
        gesture.pointerId === e.pointerId &&
        !gesture.dragTriggered &&
        !gesture.longPressTriggered
      ) {
        const dx = e.clientX - gesture.startX;
        const dy = e.clientY - gesture.startY;
        if (Math.hypot(dx, dy) > SPHERE_DRAG_CANCEL_THRESHOLD_PX) {
          gesture.dragTriggered = true;
          if (gesture.longPressTimer) {
            clearTimeout(gesture.longPressTimer);
            gesture.longPressTimer = null;
          }
          onGestureRef.current({ kind: "drag-start" });
        }
      }

      // Hover preview is desktop-only per spec — touch / pen aren't
      // a "preview" intent (any touch is already an interaction).
      // Emitting hover for those would briefly flash focus highlights
      // during every tap, then immediately replace them on click.
      if (!hoverEnabledRef.current) return;
      if (e.pointerType !== "mouse") return;
      // Coalesce: only fire when the resolved node actually changes.
      const hovered = hitTestRef.current(e.clientX, e.clientY);
      if (hovered !== lastHoverIdRef.current) {
        lastHoverIdRef.current = hovered;
        onGestureRef.current({ kind: "hover", nodeId: hovered });
      }
    },
    [],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const gesture = activeRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;

      if (gesture.longPressTriggered) {
        onGestureRef.current({
          kind: "longpress-end",
          nodeId: gesture.startNodeId,
        });
        finishGesture(e.pointerId);
        return;
      }

      if (gesture.dragTriggered) {
        onGestureRef.current({ kind: "drag-end" });
        finishGesture(e.pointerId);
        return;
      }

      // Final movement check — handles fast drags that don't generate
      // a pointermove event between pointerdown and pointerup.
      const dx = e.clientX - gesture.startX;
      const dy = e.clientY - gesture.startY;
      if (Math.hypot(dx, dy) > SPHERE_DRAG_CANCEL_THRESHOLD_PX) {
        // Treat as a (very fast) drag — emit start+end so listeners
        // see a consistent open/close pair.
        onGestureRef.current({ kind: "drag-start" });
        onGestureRef.current({ kind: "drag-end" });
        finishGesture(e.pointerId);
        return;
      }

      // Genuine click. Re-hit-test at release so a tap that drifted a
      // pixel still picks up the node beneath the up location.
      const upNodeId = hitTestRef.current(e.clientX, e.clientY);
      onGestureRef.current({ kind: "click", nodeId: upNodeId });
      finishGesture(e.pointerId);
    },
    [finishGesture],
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const gesture = activeRef.current;
      if (!gesture || gesture.pointerId !== e.pointerId) return;
      if (gesture.longPressTriggered) {
        onGestureRef.current({
          kind: "longpress-end",
          nodeId: gesture.startNodeId,
        });
      } else if (gesture.dragTriggered) {
        onGestureRef.current({ kind: "drag-end" });
      }
      finishGesture(e.pointerId);
    },
    [finishGesture],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // If we have pointer capture this event is mostly a no-op (the
      // pointer didn't really leave us). When there's no active
      // gesture, an actual leave should clear hover so the highlight
      // doesn't get stuck.
      if (activeRef.current) return;
      if (lastHoverIdRef.current !== null) {
        lastHoverIdRef.current = null;
        onGestureRef.current({ kind: "hover", nodeId: null });
      }
      // Reference `e` so eslint doesn't strip the param signature.
      void e;
    },
    [],
  );

  // Clean up on unmount — handlers might still hold a timer.
  useEffect(
    () => () => {
      const g = activeRef.current;
      if (g?.longPressTimer) clearTimeout(g.longPressTimer);
      activeRef.current = null;
    },
    [],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onPointerLeave: handlePointerLeave,
  };
}
