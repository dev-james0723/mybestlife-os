"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type TimeSummaryCardProps = {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  iconClassName?: string;
  valueClassName?: string;
  backgroundImage: string;
  parallaxStrength?: number;
  glassIntensity?: "soft" | "medium";
};

export function TimeSummaryCard({
  title,
  value,
  icon,
  iconClassName,
  valueClassName,
  backgroundImage,
  parallaxStrength = 4,
  glassIntensity = "soft",
}: TimeSummaryCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [supportsPointerParallax, setSupportsPointerParallax] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const sync = () => {
      setSupportsPointerParallax(pointerQuery.matches);
      setReduceMotion(motionQuery.matches);
    };
    sync();

    pointerQuery.addEventListener("change", sync);
    motionQuery.addEventListener("change", sync);
    return () => {
      pointerQuery.removeEventListener("change", sync);
      motionQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const parallaxEnabled = supportsPointerParallax && !reduceMotion;

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const nextX = px * parallaxStrength;
    const nextY = py * parallaxStrength;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setOffset({ x: nextX, y: nextY });
    });
  };

  const resetPointer = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "time-summary-card group relative flex aspect-square min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl border px-1.5 py-2 text-center shadow-sm sm:gap-2 sm:px-2 sm:py-3",
        "border-white/12 bg-black/5",
        glassIntensity === "medium" ? "time-summary-card--glass-medium" : "time-summary-card--glass-soft",
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      onPointerCancel={resetPointer}
    >
      <div
        aria-hidden
        className="time-summary-card__image-layer"
        style={{
          opacity: 0.94,
          backgroundImage: `url('${backgroundImage}')`,
          transform: parallaxEnabled
            ? `translate3d(${offset.x}px, ${offset.y}px, 0) scale(1.025)`
            : "translate3d(0, 0, 0) scale(1.025)",
        }}
      />
      <div aria-hidden className="time-summary-card__overlay" />
      <div aria-hidden className="time-summary-card__glass" />

      <div className="time-summary-card__content relative z-10 flex flex-col items-center justify-center gap-1.5 sm:gap-2">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10", iconClassName)}>
          {icon}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wide text-white/75 sm:text-xs">
          {title}
        </span>
        <span className={cn("line-clamp-2 text-[11px] font-semibold leading-tight text-white tabular-nums sm:text-sm", valueClassName)}>
          {value}
        </span>
      </div>
    </div>
  );
}
