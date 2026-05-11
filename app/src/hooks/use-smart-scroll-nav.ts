"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const TOP_SHOW_PX = 50;
const JITTER_IGNORE_PX = 10;

type ScrollSample = {
  clamped: number;
  maxScroll: number;
};

function readScrollSample(scrollEl: HTMLDivElement | null): ScrollSample {
  if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 2) {
    const raw = scrollEl.scrollTop;
    const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    return {
      maxScroll,
      clamped: Math.min(Math.max(raw, 0), maxScroll),
    };
  }

  if (typeof window === "undefined") {
    return { clamped: 0, maxScroll: 0 };
  }

  const doc = document.documentElement;
  const raw = window.scrollY || doc.scrollTop;
  const maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
  return {
    maxScroll,
    clamped: Math.min(Math.max(raw, 0), maxScroll),
  };
}

/**
 * Mobile smart nav: hide bar on scroll down, show on scroll up / near top.
 * Uses requestAnimationFrame, ignores rubber-band overscroll, and filters jitter.
 */
export function useSmartScrollNav(enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const rafId = useRef<number | null>(null);
  const ticking = useRef(false);
  const [navHidden, setNavHidden] = useState(false);

  const applyScrollLogic = useCallback(() => {
    ticking.current = false;
    const { clamped: currentScrollY } = readScrollSample(scrollRef.current);

    if (currentScrollY < TOP_SHOW_PX) {
      setNavHidden(false);
      lastScrollY.current = currentScrollY;
      return;
    }

    const prev = lastScrollY.current;
    if (Math.abs(currentScrollY - prev) < JITTER_IGNORE_PX) {
      return;
    }

    if (currentScrollY > prev) {
      setNavHidden(true);
    } else if (currentScrollY < prev) {
      setNavHidden(false);
    }
    lastScrollY.current = currentScrollY;
  }, []);

  const onScroll = useCallback(() => {
    if (!enabled) return;
    if (ticking.current) return;
    ticking.current = true;
    rafId.current = window.requestAnimationFrame(applyScrollLogic);
  }, [enabled, applyScrollLogic]);

  useEffect(() => {
    if (!enabled) {
      setNavHidden(false);
      return;
    }

    lastScrollY.current = readScrollSample(scrollRef.current).clamped;

    const el = scrollRef.current;
    el?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      ticking.current = false;
    };
  }, [enabled, onScroll]);

  return { scrollRef, navHidden };
}
