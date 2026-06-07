"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BoardLandscapeModeProps = {
  title: string;
  description: string;
  enterLabel: string;
  exitLabel: string;
  rotateHint: string;
  children: ReactNode;
  landscapeChildren: ReactNode;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

function usePortraitMobile() {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px) and (orientation: portrait)");
    const sync = () => setMatches(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return matches;
}

function RotatingPhone({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("relative flex h-12 w-14 items-center justify-center", className)} aria-hidden>
      <motion.div
        className="relative h-9 w-6 rounded-[0.45rem] border border-foreground/65 bg-background/80 shadow-[0_8px_20px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.18)]"
        animate={
          reduceMotion
            ? undefined
            : {
                rotate: [-12, -12, 78, 78, -12],
                x: [0, 0, 3, 3, 0],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.45,
              }
        }
      >
        <span className="absolute left-1/2 top-1 h-0.5 w-2 -translate-x-1/2 rounded-full bg-foreground/55" />
        <span className="absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-foreground/35" />
      </motion.div>
      <motion.span
        className="absolute bottom-0 right-0 h-4 w-4 rounded-full border border-foreground/30 border-l-transparent border-t-transparent"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={reduceMotion ? undefined : { duration: 3, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}

export function BoardLandscapeMode({
  title,
  description,
  enterLabel,
  exitLabel,
  rotateHint,
  children,
  landscapeChildren,
}: BoardLandscapeModeProps) {
  const [landscapeMode, setLandscapeMode] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const requestedFullscreenRef = useRef(false);
  const isPortraitMobile = usePortraitMobile();
  const portalTarget = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (!landscapeMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [landscapeMode]);

  useEffect(() => {
    if (!landscapeMode) return;

    const requestWideMode = async () => {
      const target = overlayRef.current ?? document.documentElement;
      try {
        if (target.requestFullscreen && !document.fullscreenElement) {
          await target.requestFullscreen({ navigationUI: "hide" });
          requestedFullscreenRef.current = true;
        }
      } catch {
        requestedFullscreenRef.current = false;
      }

      try {
        const orientation = window.screen.orientation as LockableScreenOrientation | undefined;
        await orientation?.lock?.("landscape");
      } catch {
        // Some mobile browsers only allow the user to rotate manually.
      }
    };

    void requestWideMode();
  }, [landscapeMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && requestedFullscreenRef.current) {
        requestedFullscreenRef.current = false;
        setLandscapeMode(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const exitLandscapeMode = useCallback(async () => {
    setLandscapeMode(false);

    try {
      const orientation = window.screen.orientation as LockableScreenOrientation | undefined;
      orientation?.unlock?.();
    } catch {
      // Ignore browsers without orientation unlock support.
    }

    if (document.fullscreenElement && requestedFullscreenRef.current) {
      try {
        await document.exitFullscreen();
      } catch {
        // The user may have already left fullscreen through browser controls.
      }
    }
    requestedFullscreenRef.current = false;
  }, []);

  const overlay = portalTarget
    ? createPortal(
        <AnimatePresence>
          {landscapeMode ? (
            <motion.div
              ref={overlayRef}
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="fixed inset-0 z-[60] flex h-[100dvh] w-[100dvw] flex-col overflow-hidden bg-background text-foreground"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/96 px-3 py-2.5 shadow-sm backdrop-blur sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <RotatingPhone className="h-9 w-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{rotateHint}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 border-border/70 bg-background/80 px-2.5 text-xs"
                  onClick={() => void exitLandscapeMode()}
                >
                  <X className="h-3.5 w-3.5" />
                  {exitLabel}
                </Button>
              </div>

              {isPortraitMobile ? (
                <div className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-lg border border-amber-300/45 bg-amber-100/60 px-3 py-2 text-xs text-amber-950 dark:border-amber-200/24 dark:bg-amber-300/12 dark:text-amber-50">
                  <RotatingPhone className="h-9 w-10 shrink-0" />
                  <span className="leading-5">{rotateHint}</span>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
                {landscapeChildren}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )
    : null;

  return (
    <>
      {isPortraitMobile ? (
        <motion.div
          className="mb-3 flex items-center gap-3 rounded-xl border border-border/70 bg-muted/25 p-3 shadow-sm"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <RotatingPhone className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="h-9 shrink-0 gap-1.5 px-3 text-xs"
            onClick={() => setLandscapeMode(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {enterLabel}
          </Button>
        </motion.div>
      ) : null}
      {children}
      {overlay}
    </>
  );
}
