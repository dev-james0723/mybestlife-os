"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { cn } from "@/lib/utils";

export type TimeSummaryCarouselItem = {
  id: string;
  title: string;
  content: ReactNode;
};

type TimeSummaryCarouselProps = {
  items: TimeSummaryCarouselItem[];
  label: string;
  className?: string;
};

const AUTO_ADVANCE_MS = 5000;
const CAROUSEL_LAYOUT_QUERY = "(max-width: 1024px), (hover: none), (pointer: coarse)";

function getLogicalIndex(slideIndex: number, itemCount: number): number {
  if (itemCount <= 1) return 0;
  if (slideIndex === 0) return itemCount - 1;
  if (slideIndex === itemCount + 1) return 0;
  return slideIndex - 1;
}

export function TimeSummaryCarousel({
  items,
  label,
  className,
}: TimeSummaryCarouselProps) {
  const itemCount = items.length;
  const initialSlideIndex = itemCount > 1 ? 1 : 0;
  const [slideIndex, setSlideIndex] = useState(initialSlideIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [instantTransition, setInstantTransition] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [carouselLayoutActive, setCarouselLayoutActive] = useState(true);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragActiveRef = useRef(false);
  const touchActiveRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const viewportWidthRef = useRef(1);
  const nextAutoAdvanceAtRef = useRef(0);

  const loopSlides = useMemo(() => {
    if (itemCount <= 1) return items;
    return [items[itemCount - 1], ...items, items[0]];
  }, [itemCount, items]);

  const activeIndex = getLogicalIndex(slideIndex, itemCount);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const layoutQuery = window.matchMedia(CAROUSEL_LAYOUT_QUERY);

    const sync = () => {
      setReduceMotion(motionQuery.matches);
      setCarouselLayoutActive(layoutQuery.matches);
    };

    sync();
    motionQuery.addEventListener("change", sync);
    layoutQuery.addEventListener("change", sync);

    return () => {
      motionQuery.removeEventListener("change", sync);
      layoutQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!carouselLayoutActive || reduceMotion || isDragging || itemCount <= 1) return;
    nextAutoAdvanceAtRef.current = window.performance.now() + AUTO_ADVANCE_MS;

    const timer = window.setInterval(() => {
      if (window.performance.now() < nextAutoAdvanceAtRef.current) return;
      setSlideIndex((current) => current + 1);
      nextAutoAdvanceAtRef.current = window.performance.now() + AUTO_ADVANCE_MS;
    }, 250);

    return () => window.clearInterval(timer);
  }, [carouselLayoutActive, isDragging, itemCount, reduceMotion]);

  useEffect(() => {
    if (!instantTransition) return;
    const frame = window.requestAnimationFrame(() => {
      setInstantTransition(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [instantTransition]);

  const beginDrag = useCallback((clientX: number, clientY: number) => {
    dragActiveRef.current = true;
    startXRef.current = clientX;
    startYRef.current = clientY;
    viewportWidthRef.current = viewportRef.current?.clientWidth ?? 1;
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const updateDrag = useCallback((clientX: number, clientY: number): boolean => {
    if (!dragActiveRef.current) return false;

    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.25 && Math.abs(deltaY) > 12) {
      setDragOffset(0);
      return false;
    }

    const maxDrag = viewportWidthRef.current * 0.42;
    setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, deltaX)));
    return Math.abs(deltaX) > 8;
  }, []);

  const cancelDrag = useCallback(() => {
    pointerIdRef.current = null;
    dragActiveRef.current = false;
    touchActiveRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  const finishDrag = useCallback(
    (clientX: number) => {
      if (!dragActiveRef.current) return;
      const deltaX = clientX - startXRef.current;
      const threshold = Math.max(44, viewportWidthRef.current * 0.16);

      dragActiveRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
      pointerIdRef.current = null;
      touchActiveRef.current = false;
      nextAutoAdvanceAtRef.current = window.performance.now() + AUTO_ADVANCE_MS;

      if (Math.abs(deltaX) < threshold || itemCount <= 1) return;
      setSlideIndex((current) => current + (deltaX < 0 ? 1 : -1));
    },
    [itemCount],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || itemCount <= 1) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || dragActiveRef.current) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerIdRef.current = event.pointerId;
      if (event.pointerType === "touch") touchActiveRef.current = true;
      beginDrag(event.clientX, event.clientY);

      if (event.pointerType !== "touch") {
        viewport.setPointerCapture(event.pointerId);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      updateDrag(event.clientX, event.clientY);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      finishDrag(event.clientX);
    };

    const handlePointerCancel = () => {
      pointerIdRef.current = null;
      if (touchActiveRef.current) return;
      cancelDrag();
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (dragActiveRef.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      touchActiveRef.current = true;
      beginDrag(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touchActiveRef.current || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const isHorizontalDrag = updateDrag(touch.clientX, touch.clientY);
      if (isHorizontalDrag) event.preventDefault();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchActiveRef.current) return;
      const touch = event.changedTouches[0];
      if (!touch) {
        cancelDrag();
        return;
      }
      finishDrag(touch.clientX);
    };

    const handleTouchCancel = () => {
      cancelDrag();
    };

    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerCancel);
    viewport.addEventListener("touchstart", handleTouchStart);
    viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
    viewport.addEventListener("touchend", handleTouchEnd);
    viewport.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      viewport.removeEventListener("pointerdown", handlePointerDown);
      viewport.removeEventListener("pointermove", handlePointerMove);
      viewport.removeEventListener("pointerup", handlePointerUp);
      viewport.removeEventListener("pointercancel", handlePointerCancel);
      viewport.removeEventListener("touchstart", handleTouchStart);
      viewport.removeEventListener("touchmove", handleTouchMove);
      viewport.removeEventListener("touchend", handleTouchEnd);
      viewport.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [beginDrag, cancelDrag, finishDrag, itemCount, updateDrag]);

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || itemCount <= 1) return;

    if (slideIndex === 0) {
      setInstantTransition(true);
      setSlideIndex(itemCount);
    } else if (slideIndex === itemCount + 1) {
      setInstantTransition(true);
      setSlideIndex(1);
    }
  };

  const transitionEnabled = !instantTransition && !isDragging && !reduceMotion;
  const translateX = `calc(${-slideIndex * 100}% + ${dragOffset}px)`;

  return (
    <div
      className={cn("planner-time-summary-carousel mx-auto w-full max-w-[26rem]", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div
        ref={viewportRef}
        className={cn(
          "overflow-hidden rounded-2xl",
          itemCount > 1 && "cursor-grab touch-pan-y select-none active:cursor-grabbing",
        )}
      >
        <div
          className="flex will-change-transform"
          style={{
            transform: `translate3d(${translateX}, 0, 0)`,
            transitionDuration: transitionEnabled ? "640ms" : "0ms",
            transitionProperty: "transform",
            transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {loopSlides.map((item, index) => {
            const logicalIndex = getLogicalIndex(index, itemCount);
            const isClone = itemCount > 1 && (index === 0 || index === itemCount + 1);
            return (
              <div
                key={`${item.id}-${index}`}
                className="w-full shrink-0"
                aria-hidden={isClone || logicalIndex !== activeIndex}
              >
                {item.content}
              </div>
            );
          })}
        </div>
      </div>

      {itemCount > 1 ? (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
          {items.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 rounded-full bg-white/35 shadow-[0_1px_4px_rgba(15,23,42,0.18)] transition-all duration-300",
                index === activeIndex ? "w-5 bg-white/80" : "w-1.5",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
