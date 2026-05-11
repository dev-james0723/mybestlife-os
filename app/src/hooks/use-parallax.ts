"use client";

import { useEffect, useRef, useState } from "react";

type ParallaxOptions = {
  /** Max pixel translation at the far edge. Default 24. */
  maxOffset?: number;
  /** Smoothing factor 0..1 — higher = snappier. Default 0.12. */
  smoothing?: number;
  /** Disable movement entirely. */
  disabled?: boolean;
};

type Offset = { x: number; y: number };

/**
 * Track the pointer (mouse or touch) inside the given element and return
 * a smoothly-lerped parallax offset in pixels. The returned offset is
 * bounded to `±maxOffset` on each axis and easing is driven by
 * `requestAnimationFrame`, so the UI reads a stable value per frame.
 *
 * - Falls back to `{ x: 0, y: 0 }` on SSR, when reduced-motion is on,
 *   or when `disabled` is true.
 * - Detaches cleanly on unmount.
 * - Touch: uses the first touch's position; doesn't call preventDefault
 *   so the user can still scroll normally.
 */
export function useParallax<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options: ParallaxOptions = {}
): Offset {
  const { maxOffset = 24, smoothing = 0.12, disabled = false } = options;

  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const targetRef = useRef<Offset>({ x: 0, y: 0 });
  const currentRef = useRef<Offset>({ x: 0, y: 0 });

  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion.
    const mq = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    if (mq?.matches) return;

    const updateFromClientXY = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normalize to -1..1 where the centre is 0
      const nx = (clientX - cx) / (rect.width / 2);
      const ny = (clientY - cy) / (rect.height / 2);
      targetRef.current = {
        x: Math.max(-1, Math.min(1, nx)) * maxOffset,
        y: Math.max(-1, Math.min(1, ny)) * maxOffset,
      };
    };

    const onPointerMove = (e: PointerEvent) => updateFromClientXY(e.clientX, e.clientY);
    const onPointerLeave = () => {
      targetRef.current = { x: 0, y: 0 };
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) updateFromClientXY(t.clientX, t.clientY);
    };
    const onTouchEnd = () => {
      targetRef.current = { x: 0, y: 0 };
    };

    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    let raf = 0;
    const loop = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      // Epsilon-snap to avoid jittering at rest and to save setState calls.
      if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
        if (cur.x !== tgt.x || cur.y !== tgt.y) {
          currentRef.current = { x: tgt.x, y: tgt.y };
          setOffset(currentRef.current);
        }
      } else {
        currentRef.current = {
          x: cur.x + dx * smoothing,
          y: cur.y + dy * smoothing,
        };
        setOffset(currentRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(raf);
    };
  }, [ref, maxOffset, smoothing, disabled]);

  return offset;
}
