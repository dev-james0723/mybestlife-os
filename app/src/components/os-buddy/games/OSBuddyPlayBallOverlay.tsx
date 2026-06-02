"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppLocale } from "@/lib/i18n/app-locale";

export type OSBuddyPlayBallOutcome = "caught" | "missed";

type BallPoint = { x: number; y: number };
type BallState = BallPoint & { vx: number; vy: number };

type OSBuddyPlayBallOverlayProps = {
  open: boolean;
  locale: AppLocale;
  onBallThrown: (target: BallPoint, outcome: OSBuddyPlayBallOutcome) => void;
};

const BALL_SIZE = 38;
const BOTTOM_GAP = 92;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function initialBallState(): BallState {
  if (typeof window === "undefined") return { x: 0, y: 0, vx: 0, vy: 0 };
  return {
    x: window.innerWidth / 2 - BALL_SIZE / 2,
    y: Math.max(24, window.innerHeight - BOTTOM_GAP),
    vx: 0,
    vy: 0,
  };
}

export function OSBuddyPlayBallOverlay({
  open,
  locale,
  onBallThrown,
}: OSBuddyPlayBallOverlayProps) {
  const zh = locale === "zh-TW";
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<"countdown" | "ready" | "thrown" | "result">("countdown");
  const [ball, setBall] = useState<BallState>(() => initialBallState());
  const [result, setResult] = useState<OSBuddyPlayBallOutcome | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    lastAt: number;
    prevX: number;
    prevY: number;
    prevAt: number;
  } | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    setCountdown(3);
    setPhase("countdown");
    setResult(null);
    setBall(initialBallState());

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setPhase("ready");
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "thrown") return;

    const tick = () => {
      setBall((current) => {
        const maxX = Math.max(0, window.innerWidth - BALL_SIZE);
        const maxY = Math.max(0, window.innerHeight - BALL_SIZE);
        let x = current.x + current.vx;
        let y = current.y + current.vy;
        let vx = current.vx * 0.992;
        let vy = current.vy * 0.992 + 0.24;

        if (x <= 0 || x >= maxX) {
          x = clamp(x, 0, maxX);
          vx = -vx * 0.88;
        }

        if (y <= 0 || y >= maxY) {
          y = clamp(y, 0, maxY);
          vy = -vy * 0.82;
        }

        return { x, y, vx, vy };
      });

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [open, phase]);

  const resetBall = useCallback(() => {
    setResult(null);
    setPhase("ready");
    setBall(initialBallState());
  }, []);

  const throwBall = useCallback(
    (nextBall: BallState) => {
      const outcome: OSBuddyPlayBallOutcome = Math.random() < 0.5 ? "caught" : "missed";
      setBall(nextBall);
      setPhase("thrown");
      setResult(null);
      onBallThrown(
        { x: nextBall.x + BALL_SIZE / 2, y: nextBall.y + BALL_SIZE / 2 },
        outcome,
      );

      window.setTimeout(() => {
        setResult(outcome);
        setPhase("result");
        window.setTimeout(resetBall, 2100);
      }, 1450);
    },
    [onBallThrown, resetBall],
  );

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[118] overflow-hidden">
      {phase === "countdown" ? (
        <div className="absolute inset-0 grid place-items-center bg-background/20 backdrop-blur-[1px]">
          <div className="rounded-2xl border-4 border-foreground bg-popover px-10 py-7 font-mono text-7xl font-black shadow-[8px_8px_0_var(--foreground)]">
            {countdown}
          </div>
        </div>
      ) : null}

      {phase !== "countdown" ? (
        <>
          <div className="absolute left-1/2 top-1/2 max-w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-popover/90 px-4 py-3 text-center text-xs font-semibold shadow">
            {result
              ? result === "caught"
                ? zh
                  ? "接到了。再丟一次。"
                  : "Caught. Toss again."
                : zh
                  ? "差一點。再試一次。"
                  : "Almost. Try another toss."
              : zh
                ? "拖住像素球，往任何方向丟。"
                : "Drag the pixel ball and toss it any direction."}
          </div>

          <div
            className="pointer-events-auto absolute select-none"
            style={{
              left: ball.x,
              top: ball.y,
              width: BALL_SIZE,
              height: BALL_SIZE,
              touchAction: "none",
            }}
            onPointerDown={(event) => {
              if (phase === "thrown") return;
              event.currentTarget.setPointerCapture(event.pointerId);
              const now = performance.now();
              dragRef.current = {
                pointerId: event.pointerId,
                lastX: event.clientX,
                lastY: event.clientY,
                lastAt: now,
                prevX: event.clientX,
                prevY: event.clientY,
                prevAt: now,
              };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;

              const now = performance.now();
              dragRef.current = {
                pointerId: drag.pointerId,
                prevX: drag.lastX,
                prevY: drag.lastY,
                prevAt: drag.lastAt,
                lastX: event.clientX,
                lastY: event.clientY,
                lastAt: now,
              };

              setBall((current) => ({
                ...current,
                x: clamp(event.clientX - BALL_SIZE / 2, 0, window.innerWidth - BALL_SIZE),
                y: clamp(event.clientY - BALL_SIZE / 2, 0, window.innerHeight - BALL_SIZE),
              }));
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId) return;

              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }

              const elapsed = Math.max(16, drag.lastAt - drag.prevAt);
              const vx = clamp(((drag.lastX - drag.prevX) / elapsed) * 16, -24, 24);
              const vy = clamp(((drag.lastY - drag.prevY) / elapsed) * 16, -24, 24);
              dragRef.current = null;

              throwBall({
                x: clamp(event.clientX - BALL_SIZE / 2, 0, window.innerWidth - BALL_SIZE),
                y: clamp(event.clientY - BALL_SIZE / 2, 0, window.innerHeight - BALL_SIZE),
                vx: Math.abs(vx) < 1 ? (Math.random() > 0.5 ? 8 : -8) : vx,
                vy: Math.abs(vy) < 1 ? -14 : vy,
              });
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
            aria-label={zh ? "可投擲的像素球" : "Throwable pixel ball"}
          >
            <div className="h-full w-full animate-bounce rounded-full border-4 border-foreground bg-[radial-gradient(circle_at_32%_28%,#fff7ad_0_16%,#facc15_17%_44%,#f97316_45%_72%,#7c2d12_73%)] shadow-[4px_4px_0_var(--foreground)]" />
          </div>
        </>
      ) : null}
    </div>
  );
}
