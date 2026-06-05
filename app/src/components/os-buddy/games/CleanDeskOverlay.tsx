"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { useSsrSafeReducedMotion } from "@/hooks/use-ssr-safe-reduced-motion";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";
import { OSBuddyGameEndButton } from "./OSBuddyGameEndButton";

type CleanDeskOverlayProps = {
  locale: AppLocale;
  petId: OSBuddyPetId;
  buddyName: string;
  onComplete: (score: number) => void;
  onClose: () => void;
};

type DeskPosition = { x: number; y: number };

const GAME_DURATION_MS = 60_000;
const RESULT_DELAY_MS = 1_300;
const CLEANING_COLUMNS = 10;
const CLEANING_ROWS = 6;
const TOTAL_CLEANING_CELLS = CLEANING_COLUMNS * CLEANING_ROWS;
const MIN_MEANINGFUL_MOVE_PX = 7;
const DESK_MESSY_SRC = "/assets/os-buddy/clean-desk/desk-messy.png";
const DESK_CLEAN_SRC = "/assets/os-buddy/clean-desk/desk-clean.png";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCellKey(position: DeskPosition) {
  const column = clamp(Math.floor((position.x / 100) * CLEANING_COLUMNS), 0, CLEANING_COLUMNS - 1);
  const row = clamp(Math.floor(((position.y - 10) / 82) * CLEANING_ROWS), 0, CLEANING_ROWS - 1);
  return `${column}:${row}`;
}

function calculateProgress(cleanedCells: Set<string>, distancePx: number) {
  const coverageScore = (cleanedCells.size / TOTAL_CLEANING_CELLS) * 88;
  const distanceScore = Math.min(12, distancePx / 36);
  return clamp(Math.round(coverageScore + distanceScore), 0, 100);
}

export function CleanDeskOverlay({
  locale,
  petId,
  buddyName,
  onComplete,
  onClose,
}: CleanDeskOverlayProps) {
  const zh = locale === "zh-TW";
  const reducedMotion = useSsrSafeReducedMotion(false);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const completeRef = useRef(onComplete);
  const finishedRef = useRef(false);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startAtRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cleanedCellsRef = useRef<Set<string>>(new Set([getCellKey({ x: 50, y: 74 })]));
  const distanceRef = useRef(0);
  const progressRef = useRef(0);
  const positionRef = useRef<DeskPosition>({ x: 50, y: 74 });
  const dragRef = useRef<{
    pointerId: number;
    lastClientX: number;
    lastClientY: number;
  } | null>(null);
  const [position, setPosition] = useState<DeskPosition>({ x: 50, y: 74 });
  const [progress, setProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [mood, setMood] = useState<OSBuddyMood>("reading");
  const [phase, setPhase] = useState<"playing" | "result">("playing");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const finish = useCallback((finalScore = progressRef.current) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (moodTimerRef.current) {
      clearTimeout(moodTimerRef.current);
      moodTimerRef.current = null;
    }
    dragRef.current = null;
    setIsDragging(false);
    progressRef.current = finalScore;
    setPhase("result");
    setProgress(finalScore);
    setMood(finalScore >= 75 ? "success" : "idle");
    finishTimerRef.current = setTimeout(() => {
      completeRef.current(Math.round(finalScore));
    }, RESULT_DELAY_MS);
  }, []);

  const markCleaned = useCallback(
    (nextPosition: DeskPosition, distancePx: number) => {
      const key = getCellKey(nextPosition);
      cleanedCellsRef.current.add(key);
      distanceRef.current += distancePx;
      const nextProgress = calculateProgress(cleanedCellsRef.current, distanceRef.current);
      progressRef.current = nextProgress;
      setProgress(nextProgress);

      if (nextProgress >= 100) {
        finish(100);
      }
    },
    [finish],
  );

  const moveFromPointer = useCallback(
    (clientX: number, clientY: number, countDistance: boolean) => {
      const surface = surfaceRef.current;
      if (!surface || finishedRef.current) return;
      const rect = surface.getBoundingClientRect();
      const nextPosition = {
        x: clamp(((clientX - rect.left) / rect.width) * 100, 6, 94),
        y: clamp(((clientY - rect.top) / rect.height) * 100, 18, 86),
      };
      const previousPosition = positionRef.current;
      positionRef.current = nextPosition;
      setPosition(nextPosition);
      setMood(nextPosition.x < previousPosition.x ? "dragging-left" : "dragging-right");

      if (!countDistance) return;
      const drag = dragRef.current;
      if (!drag) return;
      const distancePx = Math.hypot(clientX - drag.lastClientX, clientY - drag.lastClientY);
      if (distancePx < MIN_MEANINGFUL_MOVE_PX) return;

      drag.lastClientX = clientX;
      drag.lastClientY = clientY;
      markCleaned(nextPosition, distancePx);
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
      moodTimerRef.current = setTimeout(() => setMood("reading"), 180);
    },
    [markCleaned],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    startAtRef.current = performance.now();
    intervalRef.current = setInterval(() => {
      if (finishedRef.current || startAtRef.current == null) return;
      const elapsedMs = performance.now() - startAtRef.current;
      if (elapsedMs >= GAME_DURATION_MS) {
        setSecondsLeft(0);
        finish(progressRef.current);
        return;
      }
      setSecondsLeft(Math.ceil((GAME_DURATION_MS - elapsedMs) / 1000));
    }, 250);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
  }, [finish]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-3 bottom-3 sm:inset-x-6">
        <div
          ref={surfaceRef}
          className="pointer-events-auto relative h-[min(58vh,540px)] min-h-[340px] overflow-hidden rounded-2xl border border-white/20 bg-background/65 shadow-2xl backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-muted/30" />
          <img
            src={DESK_MESSY_SRC}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover"
            draggable={false}
          />
          <img
            src={DESK_CLEAN_SRC}
            alt=""
            className="absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-300 motion-reduce:transition-none"
            style={{ opacity: progress / 100 }}
            draggable={false}
          />
          <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />

          <div
            className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-background/75 px-3 py-2 text-sm shadow-lg backdrop-blur-xl"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
          >
            <div>
              <p className="font-black">{zh ? "Clean the Desk" : "Clean the Desk"}</p>
              <p className="text-xs text-muted-foreground">
                {zh ? "拖動 OS Buddy 清出桌面空間。" : "Drag OS Buddy to clear the desk surface."}
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-bold">
              <span>{zh ? "進度" : "Progress"} {progress}%</span>
              <span>{secondsLeft}s</span>
              <OSBuddyGameEndButton
                locale={locale}
                isFinished={phase === "result"}
                onClose={onClose}
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-20 h-2 overflow-hidden rounded-full border border-border/60 bg-background/75">
            <div
              className="h-full bg-primary transition-[width] duration-200 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div
            className="absolute z-30 select-none"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: "translate(-50%, -50%)",
              touchAction: "none",
            }}
            onPointerDown={(event) => {
              if (phase !== "playing") return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerId: event.pointerId,
                lastClientX: event.clientX,
                lastClientY: event.clientY,
              };
              setIsDragging(true);
              moveFromPointer(event.clientX, event.clientY, false);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId || phase !== "playing") return;
              moveFromPointer(event.clientX, event.clientY, true);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              dragRef.current = null;
              setIsDragging(false);
              if (!finishedRef.current) setMood("reading");
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              dragRef.current = null;
              setIsDragging(false);
              if (!finishedRef.current) setMood("reading");
            }}
          >
            <div className={!reducedMotion && phase === "playing" ? "transition-transform duration-150" : undefined}>
              <OSBuddySprite
                petId={petId}
                name={buddyName}
                mood={mood}
                animationSrc={animationSrc}
                size="md"
                isDragging={isDragging}
              />
            </div>
          </div>

          {phase === "result" ? (
            <div className="absolute inset-0 z-40 grid place-items-center bg-background/55 backdrop-blur-sm">
              <div className="rounded-2xl border bg-popover/90 px-5 py-4 text-center shadow-2xl">
                <p className="text-lg font-black">{zh ? "桌面整理好了。" : "Desk reset complete."}</p>
                <p className="mt-1 font-mono text-sm">
                  {zh ? "進度" : "Progress"}: {Math.round(progress)}%
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
