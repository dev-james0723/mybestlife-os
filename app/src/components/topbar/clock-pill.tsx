"use client";

/**
 * Clock trigger pill — shows the current wall-clock time; clicking opens
 * the Clock/Timer/Stopwatch dropdown panel.
 *
 * The panel is portaled to `document.body` with fixed positioning so it is
 * not clipped by the top bar (`overflow-hidden` on mobile header,
 * `overflow-x-hidden` on the inner row forcing vertical clip in CSS).
 *
 * State lives in `useClockWidgetStore` (persisted); closing unmounts the
 * panel UI but keeps store state.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Clock } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useIsMobile } from "@/hooks/use-mobile";
import { ClockPanel } from "@/components/topbar/clock-panel";

function formatHHMM(d: Date) {
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function ClockPill({ className }: { className?: string }) {
  const now = useCurrentTime();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 10,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("scroll", updatePanelPosition, true);
    window.addEventListener("resize", updatePanelPosition);
    return () => {
      window.removeEventListener("scroll", updatePanelPosition, true);
      window.removeEventListener("resize", updatePanelPosition);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Clock, timer and stopwatch. Now ${mounted ? formatHHMM(now) : "--:--"}`}
        aria-expanded={open}
        data-open={open ? "true" : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "topbar-clock-trigger",
          isMobile && "!h-10 !w-10 justify-center !px-0"
        )}
      >
        <Clock className="h-4 w-4 opacity-85" />
        {!isMobile ? (
          <span className="tabular-nums" suppressHydrationWarning>
            {mounted ? formatHHMM(now) : "--:--"}
          </span>
        ) : null}
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={panelRef}
                  key="clock-panel"
                  initial={
                    reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.98 }
                  }
                  transition={{
                    duration: reduceMotion ? 0 : 0.18,
                    ease: "easeOut",
                  }}
                  style={{
                    position: "fixed",
                    top: panelPos.top,
                    right: panelPos.right,
                    zIndex: 10000,
                  }}
                  className="max-w-[min(100vw-24px,420px)]"
                >
                  <ClockPanel onClose={() => setOpen(false)} />
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
