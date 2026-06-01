"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

type FocusTapGameProps = {
  petId: OSBuddyPetId;
  buddyName: string;
  locale: AppLocale;
  onComplete: (score: number) => void;
};

export function FocusTapGame({
  petId,
  buddyName,
  locale,
  onComplete,
}: FocusTapGameProps) {
  const zh = locale === "zh-TW";
  const [round, setRound] = useState(1);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [mood, setMood] = useState<OSBuddyMood>("thinking");
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  useEffect(() => {
    if (done) return;
    if (round > 8) {
      setDone(true);
      const finalScore = Math.max(0, score - mistakes);
      setMood(finalScore >= 6 ? "success" : "error");
      onComplete(finalScore);
      return;
    }

    setReady(false);
    setMood("thinking");

    timeoutRef.current = window.setTimeout(() => {
      setReady(true);
      setMood("playful");
    }, 700 + Math.random() * 1200);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [done, mistakes, onComplete, round, score]);

  const tap = () => {
    if (done) return;

    if (ready) {
      setScore((prev) => prev + 1);
      setMood("success");
      window.setTimeout(() => {
        setRound((prev) => prev + 1);
      }, 240);
      return;
    }

    setMistakes((prev) => prev + 1);
    setMood("error");
    window.setTimeout(() => {
      setRound((prev) => prev + 1);
    }, 240);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <p>{zh ? "回合" : "Round"}: {Math.min(round, 8)} / 8</p>
        <p>{zh ? "得分" : "Score"}: {Math.max(0, score - mistakes)}</p>
      </div>

      <div className="rounded-xl border p-4 bg-muted/20">
        <div className="mx-auto w-fit">
          <OSBuddySprite
            petId={petId}
            name={buddyName}
            mood={mood}
            animationSrc={animationSrc}
            size="sm"
          />
        </div>

        <p className="mt-3 text-sm text-center text-muted-foreground">
          {ready
            ? zh
              ? "現在點擊！"
              : "Tap now!"
            : zh
              ? "等待提示亮起"
              : "Wait for the sparkle cue"}
        </p>

        <div className="mt-3 flex items-center justify-center">
          <Button type="button" onClick={tap}>
            {ready ? (zh ? "立即點擊" : "Tap") : zh ? "太早會失誤" : "Too early = miss"}
          </Button>
        </div>
      </div>
    </div>
  );
}
