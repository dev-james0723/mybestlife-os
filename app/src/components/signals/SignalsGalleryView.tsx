"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "date-fns";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { GALLERY_INTERVAL_MS } from "@/lib/signals/constants";
import type { SignalsGalleryPrefs, SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { SignalCardWithHandlers, type SignalCardHandlers } from "./SignalsSection";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * Auto-rotating gallery (§ gallery). Rotates over the ALREADY-FETCHED pool — it
 * indexes locally and NEVER calls the network. Pauses on hover, when the tab is
 * hidden (visibilitychange), and when the user prefers reduced motion. Manual
 * prev/next + play/pause always work.
 */
export function SignalsGalleryView({
  items,
  gallery,
  copy,
  dateLocale,
  handlers,
}: {
  items: SignalItem[];
  gallery: SignalsGalleryPrefs;
  copy: SignalsUiCopy;
  dateLocale: Locale;
  handlers: SignalCardHandlers;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(gallery.enabled && !reducedMotion);
  const [hovered, setHovered] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);

  const count = items.length;
  const interval = GALLERY_INTERVAL_MS[gallery.speed];

  useEffect(() => {
    setIndex((i) => (count === 0 ? 0 : Math.min(i, count - 1)));
  }, [count]);

  useEffect(() => {
    setPlaying(gallery.enabled && !reducedMotion);
  }, [gallery.enabled, reducedMotion]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const next = useCallback(() => setIndex((i) => (count === 0 ? 0 : (i + 1) % count)), [count]);
  const prev = useCallback(
    () => setIndex((i) => (count === 0 ? 0 : (i - 1 + count) % count)),
    [count],
  );

  const rotating = playing && !hovered && tabVisible && !reducedMotion && count > 1;

  useEffect(() => {
    if (!rotating) return;
    // No network here — rotation only indexes the already-fetched pool. The
    // effect re-subscribes whenever `rotating` flips, so pausing clears the timer.
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => window.clearInterval(id);
  }, [rotating, interval, count]);

  const current = useMemo(() => items[index], [items, index]);
  if (!current) return null;

  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? copy.gallery.pause : copy.gallery.play}
            title={playing ? copy.gallery.pause : copy.gallery.play}
            disabled={reducedMotion}
          >
            {playing && !reducedMotion ? <Pause /> : <Play />}
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {index + 1} / {count}
          </span>
          {!rotating && (
            <span className="text-[11px] text-muted-foreground/70">
              {reducedMotion ? copy.gallery.reducedMotionNote : copy.gallery.pausedHint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="ghost" onClick={prev} aria-label="Previous">
            <ChevronLeft />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={next} aria-label="Next">
            <ChevronRight />
          </Button>
        </div>
      </div>

      <div data-stagger>
        <SignalCardWithHandlers
          key={current.id}
          signal={current}
          copy={copy}
          dateLocale={dateLocale}
          variant="hero"
          handlers={handlers}
        />
      </div>

      {/* Position dots (cap to keep it calm). */}
      {count > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          {items.slice(0, 12).map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-primary" : "w-1.5 bg-border hover:bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
