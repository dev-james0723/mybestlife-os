"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

type FallingStar = { id: number; x: number; y: number };

export function PixelCatchGame({
  petId,
  buddyName,
  locale,
  onComplete,
}: PixelCatchGameProps) {
  const zh = locale === "zh-TW";
  const [playerX, setPlayerX] = useState(50);
  const [stars, setStars] = useState<FallingStar[]>([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [mood, setMood] = useState<OSBuddyMood>("idle");
  const [done, setDone] = useState(false);
  const idRef = useRef(1);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const move = useCallback((delta: number) => {
    setPlayerX((prev) => Math.min(94, Math.max(6, prev + delta)));
    setMood(delta < 0 ? "dragging-left" : "dragging-right");
    window.setTimeout(() => setMood("idle"), 160);
  }, []);

  useEffect(() => {
    if (done) return;

    const spawnId = window.setInterval(() => {
      setStars((prev) => [
        ...prev,
        { id: idRef.current++, x: 8 + Math.random() * 84, y: 0 },
      ]);
    }, 600);

    const fallId = window.setInterval(() => {
      setStars((prev) => {
        let caught = 0;
        const next = prev
          .map((star) => ({ ...star, y: star.y + 4.8 }))
          .filter((star) => {
            const catchLine = star.y >= 80;
            if (!catchLine) return star.y < 100;
            const isCaught = Math.abs(star.x - playerX) <= 11;
            if (isCaught) caught += 1;
            return !isCaught && star.y < 100;
          });

        if (caught > 0) {
          setScore((current) => current + caught);
          setMood("success");
          window.setTimeout(() => setMood("idle"), 280);
        }

        return next;
      });
    }, 120);

    const clockId = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(spawnId);
          window.clearInterval(fallId);
          window.clearInterval(clockId);
          setDone(true);
          setMood(score >= 8 ? "success" : "error");
          onComplete(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(spawnId);
      window.clearInterval(fallId);
      window.clearInterval(clockId);
    };
  }, [done, onComplete, playerX, score]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-5);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(5);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <p>{zh ? "分數" : "Score"}: {score}</p>
        <p>{zh ? "剩餘" : "Time"}: {secondsLeft}s</p>
      </div>

      <div className="relative h-56 overflow-hidden rounded-xl border bg-muted/20">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute text-lg"
            style={{ left: `${star.x}%`, top: `${star.y}%`, transform: "translate(-50%, -50%)" }}
            aria-hidden
          >
            ✨
          </div>
        ))}

        <div
          className="absolute bottom-2"
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

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => move(-8)}>
          {zh ? "向左" : "Left"}
        </Button>
        <Button type="button" variant="outline" onClick={() => move(8)}>
          {zh ? "向右" : "Right"}
        </Button>
      </div>
    </div>
  );
}
