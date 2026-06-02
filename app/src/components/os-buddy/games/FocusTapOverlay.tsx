"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { cn } from "@/lib/utils";
import { useSsrSafeReducedMotion } from "@/hooks/use-ssr-safe-reduced-motion";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

type FocusTapOverlayProps = {
  locale: AppLocale;
  petId: OSBuddyPetId;
  buddyName: string;
  onComplete: (score: number) => void;
  onClose: () => void;
};

type FocusTapPhase = "waiting" | "active" | "feedback" | "result";

const TOTAL_ROUNDS = 8;
export const PERFECT_WINDOW_MS = 160;
const RESULT_DELAY_MS = 1_150;
const FEEDBACK_DELAY_MS = 650;

function getWaitDelayMs() {
  return 900 + Math.random() * 1_300;
}

export function FocusTapOverlay({
  locale,
  petId,
  buddyName,
  onComplete,
  onClose,
}: FocusTapOverlayProps) {
  const zh = locale === "zh-TW";
  const reducedMotion = useSsrSafeReducedMotion(false);
  const completeRef = useRef(onComplete);
  const completedRef = useRef(false);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<FocusTapPhase>("waiting");
  const scoreRef = useRef(0);
  const cueRef = useRef<{ round: number; startedAt: number; tapped: boolean } | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<FocusTapPhase>("waiting");
  const [feedback, setFeedback] = useState(
    zh ? "等 Buddy 給出提示。" : "Wait for Buddy's cue.",
  );
  const [mood, setMood] = useState<OSBuddyMood>("thinking");

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const clearTimers = useCallback(() => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    if (lateTimerRef.current) clearTimeout(lateTimerRef.current);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    waitTimerRef.current = null;
    lateTimerRef.current = null;
    advanceTimerRef.current = null;
  }, []);

  const advanceRound = useCallback(() => {
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      setRound((current) => current + 1);
    }, FEEDBACK_DELAY_MS);
  }, []);

  const enterFeedback = useCallback(
    (nextMood: OSBuddyMood, nextFeedback: string) => {
      clearTimers();
      cueRef.current = null;
      phaseRef.current = "feedback";
      setPhase("feedback");
      setMood(nextMood);
      setFeedback(nextFeedback);
      advanceRound();
    },
    [advanceRound, clearTimers],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (completedRef.current) return;
    if (round > TOTAL_ROUNDS) {
      completedRef.current = true;
      clearTimers();
      phaseRef.current = "result";
      setPhase("result");
      setMood(scoreRef.current >= 5 ? "success" : "idle");
      setFeedback(
        zh
          ? `完成。分數 ${scoreRef.current} / ${TOTAL_ROUNDS}。`
          : `Complete. Score ${scoreRef.current} / ${TOTAL_ROUNDS}.`,
      );
      resultTimerRef.current = setTimeout(() => {
        completeRef.current(scoreRef.current);
      }, RESULT_DELAY_MS);
      return;
    }

    clearTimers();
    cueRef.current = null;
    phaseRef.current = "waiting";
    setPhase("waiting");
    setMood("thinking");
    setFeedback(zh ? "等 Buddy 給出提示。" : "Wait for Buddy's cue.");

    waitTimerRef.current = setTimeout(() => {
      const startedAt = performance.now();
      cueRef.current = { round, startedAt, tapped: false };
      phaseRef.current = "active";
      setPhase("active");
      setMood("playful");
      setFeedback(zh ? "現在。" : "Now.");

      lateTimerRef.current = setTimeout(() => {
        const cue = cueRef.current;
        if (!cue || cue.round !== round || cue.tapped) return;
        enterFeedback("error", zh ? "太慢了。" : "Too late.");
      }, PERFECT_WINDOW_MS);
    }, getWaitDelayMs());

    return clearTimers;
  }, [clearTimers, enterFeedback, round, zh]);

  useEffect(
    () => () => {
      clearTimers();
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    },
    [clearTimers],
  );

  const tap = useCallback(() => {
    if (completedRef.current) return;

    if (phaseRef.current === "waiting") {
      enterFeedback("error", zh ? "太早了。" : "Too early.");
      return;
    }

    if (phaseRef.current !== "active") return;

    const cue = cueRef.current;
    const tappedAt = performance.now();
    if (!cue || cue.tapped) return;
    cue.tapped = true;

    const elapsedMs = tappedAt - cue.startedAt;
    if (elapsedMs >= 0 && elapsedMs <= PERFECT_WINDOW_MS) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      enterFeedback("success", zh ? "抓到了。" : "Perfect.");
      return;
    }

    enterFeedback("error", zh ? "太慢了。" : "Too late.");
  }, [enterFeedback, zh]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[118] overflow-hidden">
      <div className="absolute inset-x-3 bottom-3 sm:inset-x-6">
        <div className="pointer-events-auto relative h-[min(62vh,620px)] min-h-[420px] overflow-hidden rounded-2xl border border-white/20 bg-background/70 shadow-2xl backdrop-blur-xl">
          <div className="absolute left-3 right-3 top-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/20 bg-background/75 px-3 py-2 text-sm shadow-lg backdrop-blur-xl">
            <div>
              <p className="font-black">{zh ? "Focus Tap" : "Focus Tap"}</p>
              <p className="text-xs text-muted-foreground">
                {zh ? "只在提示出現時點擊紅色按鈕。" : "Tap the red button only when the cue appears."}
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs font-bold">
              <span>{zh ? "回合" : "Round"} {Math.min(round, TOTAL_ROUNDS)} / {TOTAL_ROUNDS}</span>
              <span>{zh ? "分數" : "Score"} {score}</span>
              <button
                type="button"
                className="rounded-md border border-border bg-background/80 px-2 py-1 font-sans text-xs"
                onClick={onClose}
              >
                {phase === "result" ? (zh ? "關閉" : "Close") : zh ? "結束" : "End"}
              </button>
            </div>
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,hsl(var(--destructive)/0.12),transparent_52%)]" />

          <div className="absolute inset-x-0 top-20 flex h-[min(36vh,360px)] items-end justify-center overflow-visible">
            <div
              className={cn(
                "origin-bottom",
                reducedMotion
                  ? "scale-[3.2] sm:scale-[4.4] lg:scale-[5.2]"
                  : phase === "active"
                    ? "scale-[3.4] sm:scale-[4.8] lg:scale-[5.6]"
                    : "scale-[3.2] sm:scale-[4.6] lg:scale-[5.4]",
              )}
            >
              <OSBuddySprite
                petId={petId}
                name={buddyName}
                mood={mood}
                animationSrc={animationSrc}
                size="lg"
              />
            </div>
          </div>

          <div className="absolute left-1/2 top-[46%] z-30 w-[min(88vw,420px)] -translate-x-1/2 rounded-2xl border bg-popover/90 px-4 py-3 text-center text-sm font-semibold shadow-xl">
            {feedback}
          </div>

          <div className="absolute inset-x-0 bottom-8 z-30 flex justify-center">
            <button
              type="button"
              className={cn(
                "grid size-28 place-items-center rounded-full border-4 border-red-950 bg-red-600 font-mono text-xl font-black uppercase tracking-normal text-white shadow-[0_10px_0_#7f1d1d] outline-none transition-transform active:translate-y-1 active:shadow-[0_6px_0_#7f1d1d] focus-visible:ring-4 focus-visible:ring-red-500/45 motion-reduce:transition-none sm:size-36 sm:text-2xl",
                phase === "active" && "ring-4 ring-red-400/50",
              )}
              onPointerDown={(event) => {
                event.preventDefault();
                tap();
              }}
              onClick={(event) => {
                if (event.detail === 0) tap();
              }}
              aria-label={zh ? "點擊按鈕" : "Tap button"}
            >
              TAP
            </button>
          </div>

          {phase === "result" ? (
            <div className="absolute inset-0 z-40 grid place-items-center bg-background/55 backdrop-blur-sm">
              <div className="rounded-2xl border bg-popover/90 px-5 py-4 text-center shadow-2xl">
                <p className="text-lg font-black">{zh ? "專注反應完成。" : "Focus Tap complete."}</p>
                <p className="mt-1 font-mono text-sm">
                  {zh ? "分數" : "Score"}: {score} / {TOTAL_ROUNDS}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
