"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

type PixelCatchGameProps = {
  petId: OSBuddyPetId;
  buddyName: string;
  locale: AppLocale;
  onComplete: (score: number) => void;
};

type FallingPixel = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
};

const GAME_DURATION_MS = 20_000;
const CATCHER_SIZE = 42;

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function PixelCatchGame({
  petId,
  buddyName,
  locale,
  onComplete,
}: PixelCatchGameProps) {
  const zh = locale === "zh-TW";
  const areaRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const lastSpawnAtRef = useRef(0);
  const pixelsRef = useRef<FallingPixel[]>([]);
  const playerXRef = useRef(50);
  const scoreRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(1);

  const [playerX, setPlayerX] = useState(50);
  const [pixels, setPixels] = useState<FallingPixel[]>([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [mood, setMood] = useState<OSBuddyMood>("idle");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const setPlayerFromClientX = useCallback((clientX: number) => {
    const area = areaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(94, Math.max(6, next));
    playerXRef.current = clamped;
    setPlayerX(clamped);
  }, []);

  const nudge = useCallback((delta: number) => {
    const next = Math.min(94, Math.max(6, playerXRef.current + delta));
    playerXRef.current = next;
    setPlayerX(next);
    setMood(delta < 0 ? "dragging-left" : "dragging-right");
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => setMood("idle"), 180);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudge(-6);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudge(6);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nudge]);

  useEffect(() => {
    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setSecondsLeft(0);
      setMood(scoreRef.current > 0 ? "success" : "idle");
      onCompleteRef.current(scoreRef.current);
    };

    const spawnPixel = (elapsedMs: number, width: number) => {
      const elapsedSeconds = elapsedMs / 1000;
      pixelsRef.current = [
        ...pixelsRef.current,
        {
          id: nextIdRef.current,
          x: 8 + Math.random() * Math.max(24, width - 16),
          y: -12,
          size: 9 + Math.round(Math.random() * 3),
          speed: 84 + elapsedSeconds * 5,
        },
      ];
      nextIdRef.current += 1;
    };

    const tick = (now: number) => {
      if (completedRef.current) return;
      const area = areaRef.current;
      if (!area) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (startAtRef.current == null) {
        startAtRef.current = now;
        lastFrameAtRef.current = now;
        lastSpawnAtRef.current = now;
      }

      const elapsedMs = now - startAtRef.current;
      if (elapsedMs >= GAME_DURATION_MS) {
        finish();
        return;
      }

      const rect = area.getBoundingClientRect();
      const dt = Math.min(48, now - (lastFrameAtRef.current ?? now)) / 1000;
      lastFrameAtRef.current = now;

      const spawnInterval = Math.max(420, 700 - Math.floor(elapsedMs / 5_000) * 80);
      if (now - lastSpawnAtRef.current >= spawnInterval) {
        spawnPixel(elapsedMs, rect.width);
        lastSpawnAtRef.current = now;
      }

      const catcher = {
        x: (playerXRef.current / 100) * rect.width - CATCHER_SIZE / 2,
        y: rect.height - CATCHER_SIZE - 12,
        width: CATCHER_SIZE,
        height: CATCHER_SIZE,
      };

      let caught = 0;
      pixelsRef.current = pixelsRef.current
        .map((pixel) => ({
          ...pixel,
          y: pixel.y + pixel.speed * dt,
        }))
        .filter((pixel) => {
          const pixelRect = {
            x: pixel.x - pixel.size / 2,
            y: pixel.y - pixel.size / 2,
            width: pixel.size,
            height: pixel.size,
          };
          if (intersects(pixelRect, catcher)) {
            caught += 1;
            return false;
          }
          return pixel.y <= rect.height + 18;
        });

      if (caught > 0) {
        scoreRef.current += caught;
        setScore(scoreRef.current);
        setMood("success");
        if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
        moodTimerRef.current = setTimeout(() => setMood("idle"), 220);
      }

      setPixels(pixelsRef.current);
      setSecondsLeft(Math.ceil((GAME_DURATION_MS - elapsedMs) / 1000));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      completedRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <p>
          {zh ? "分數" : "Score"}: {score}
        </p>
        <p>
          {zh ? "剩餘" : "Time"}: {secondsLeft}s
        </p>
      </div>

      <div
        ref={areaRef}
        className="relative h-[240px] overflow-hidden rounded-lg border bg-muted/20 sm:h-[260px]"
        onPointerMove={(event) => setPlayerFromClientX(event.clientX)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setPlayerFromClientX(event.clientX);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        tabIndex={0}
      >
        {pixels.map((pixel) => (
          <div
            key={pixel.id}
            className="absolute rounded-[2px] border border-foreground/20 bg-primary/55 shadow-sm"
            style={{
              left: pixel.x,
              top: pixel.y,
              width: pixel.size,
              height: pixel.size,
              transform: "translate(-50%, -50%)",
            }}
            aria-hidden
          />
        ))}

        <div
          className="absolute bottom-3"
          style={{ left: `${playerX}%`, transform: "translateX(-50%)" }}
        >
          <OSBuddySprite
            petId={petId}
            name={buddyName}
            mood={mood}
            animationSrc={animationSrc}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}
