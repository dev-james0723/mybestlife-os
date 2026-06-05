"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";
import { OSBuddyGameEndButton } from "./OSBuddyGameEndButton";

type PlayFoodCatchOverlayProps = {
  locale: AppLocale;
  petId: OSBuddyPetId;
  buddyName: string;
  onComplete: (score: number) => void;
  onClose: () => void;
};

type FallingFood = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  label: string;
};

const FOOD_ITEMS = ["🍎", "🍓", "🍌", "🍇", "🍪", "🥕", "🍙"];
const GAME_DURATION_MS = 120_000;
const CATCHER_SIZE = 70;
const RESULT_DELAY_MS = 1_400;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

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

export function PlayFoodCatchOverlay({
  locale,
  petId,
  buddyName,
  onComplete,
  onClose,
}: PlayFoodCatchOverlayProps) {
  const zh = locale === "zh-TW";
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startAtRef = useRef<number | null>(null);
  const lastFrameAtRef = useRef<number | null>(null);
  const lastSpawnAtRef = useRef(0);
  const nextIdRef = useRef(1);
  const foodsRef = useRef<FallingFood[]>([]);
  const playerXRef = useRef(50);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const caughtCountRef = useRef(0);
  const completeRef = useRef(onComplete);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [foods, setFoods] = useState<FallingFood[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [caughtCount, setCaughtCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [mood, setMood] = useState<OSBuddyMood>("playful");
  const [phase, setPhase] = useState<"playing" | "result">("playing");

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const setPlayerFromClientX = useCallback((clientX: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const next = clamp(((clientX - rect.left) / rect.width) * 100, 6, 94);
    playerXRef.current = next;
    setPlayerX(next);
  }, []);

  const nudge = useCallback((delta: number) => {
    const next = clamp(playerXRef.current + delta, 6, 94);
    playerXRef.current = next;
    setPlayerX(next);
    setMood(delta < 0 ? "dragging-left" : "dragging-right");
  }, []);

  const finish = useCallback(() => {
    if (finishTimerRef.current) return;
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPhase("result");
    setMood(scoreRef.current > 0 ? "success" : "idle");
    setSecondsLeft(0);
    finishTimerRef.current = setTimeout(() => {
      completeRef.current(scoreRef.current);
    }, RESULT_DELAY_MS);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (phase !== "playing") return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudge(-5);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudge(5);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nudge, onClose, phase]);

  useEffect(() => {
    const spawnFood = (elapsedMs: number, width: number) => {
      const label = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)] ?? "🍎";
      const elapsedSeconds = elapsedMs / 1000;
      foodsRef.current = [
        ...foodsRef.current,
        {
          id: nextIdRef.current,
          x: 22 + Math.random() * Math.max(24, width - 44),
          y: -32,
          size: 26 + Math.round(Math.random() * 10),
          speed: 72 + elapsedSeconds * 1.2 + Math.random() * 40,
          label,
        },
      ];
      nextIdRef.current += 1;
    };

    const tick = (now: number) => {
      if (phase !== "playing") return;
      const surface = surfaceRef.current;
      if (!surface) {
        rafRef.current = window.requestAnimationFrame(tick);
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

      const rect = surface.getBoundingClientRect();
      const dt = Math.min(48, now - (lastFrameAtRef.current ?? now)) / 1000;
      lastFrameAtRef.current = now;
      const spawnInterval = Math.max(380, 820 - Math.floor(elapsedMs / 18_000) * 70);
      if (now - lastSpawnAtRef.current >= spawnInterval) {
        spawnFood(elapsedMs, rect.width);
        lastSpawnAtRef.current = now;
      }

      const catcher = {
        x: (playerXRef.current / 100) * rect.width - CATCHER_SIZE / 2,
        y: rect.height - CATCHER_SIZE - 24,
        width: CATCHER_SIZE,
        height: CATCHER_SIZE,
      };

      let caught = 0;
      let missed = false;
      foodsRef.current = foodsRef.current
        .map((food) => ({ ...food, y: food.y + food.speed * dt }))
        .filter((food) => {
          const foodRect = {
            x: food.x - food.size / 2,
            y: food.y - food.size / 2,
            width: food.size,
            height: food.size,
          };
          if (intersects(foodRect, catcher)) {
            caught += 1;
            return false;
          }
          if (food.y > rect.height + 44) {
            missed = true;
            return false;
          }
          return true;
        });

      if (caught > 0) {
        comboRef.current += caught;
        caughtCountRef.current += caught;
        scoreRef.current += caught * Math.max(1, Math.min(5, comboRef.current));
        setCaughtCount(caughtCountRef.current);
        setScore(scoreRef.current);
        setCombo(comboRef.current);
        setMood("success");
      } else if (missed) {
        comboRef.current = 0;
        setCombo(0);
        setMood("playful");
      }

      setFoods(foodsRef.current);
      setSecondsLeft(Math.ceil((GAME_DURATION_MS - elapsedMs) / 1000));
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, [finish, phase]);

  const buddyScale = Math.min(1.35, 1 + caughtCount * 0.018);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-3 bottom-3 sm:inset-x-6">
        <div
          ref={surfaceRef}
          className="pointer-events-auto relative h-[min(58vh,560px)] min-h-[360px] overflow-hidden rounded-2xl border border-white/20 bg-background/60 shadow-2xl backdrop-blur-xl"
          onPointerMove={(event) => {
            if (phase === "playing") setPlayerFromClientX(event.clientX);
          }}
          onPointerDown={(event) => {
            if (phase !== "playing") return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setPlayerFromClientX(event.clientX);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId);
            }
          }}
        >
          <div
            className="absolute left-3 right-3 top-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-background/70 px-3 py-2 text-sm shadow-lg backdrop-blur-xl"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
          >
            <div>
              <p className="font-black">{zh ? "Play Food Catch" : "Play Food Catch"}</p>
              <p className="text-xs text-muted-foreground">
                {zh ? "移動 OS Buddy 接住食物。" : "Move OS Buddy to catch the food."}
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-bold">
              <span>{zh ? "分數" : "Score"} {score}</span>
              <span>{zh ? "連擊" : "Combo"} {combo}</span>
              <span>{secondsLeft}s</span>
              <OSBuddyGameEndButton
                locale={locale}
                isFinished={phase === "result"}
                onClose={onClose}
              />
            </div>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,hsl(var(--primary)/0.16),transparent_48%)]" />

          {foods.map((food) => (
            <div
              key={food.id}
              className="absolute select-none text-2xl drop-shadow-lg sm:text-3xl"
              style={{
                left: food.x,
                top: food.y,
                fontSize: food.size,
                transform: "translate(-50%, -50%)",
              }}
              aria-hidden
            >
              {food.label}
            </div>
          ))}

          <div
            className="absolute bottom-5 z-10"
            style={{
              left: `${playerX}%`,
              transform: `translateX(-50%) scale(${buddyScale})`,
              transformOrigin: "50% 100%",
            }}
          >
            <OSBuddySprite
              petId={petId}
              name={buddyName}
              mood={mood}
              animationSrc={animationSrc}
              size="md"
            />
          </div>

          {phase === "result" ? (
            <div className="absolute inset-0 z-20 grid place-items-center bg-background/55 backdrop-blur-sm">
              <div className="rounded-2xl border bg-popover/90 px-5 py-4 text-center shadow-2xl">
                <p className="text-lg font-black">{zh ? "吃飽了。" : "Snack break complete."}</p>
                <p className="mt-1 font-mono text-sm">
                  {zh ? "分數" : "Score"}: {score}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
