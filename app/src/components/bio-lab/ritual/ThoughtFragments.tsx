"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Deterministic seeded pseudo-random — keeps positions stable across renders
 * so React's purity rules are honored. (Same convention used by the scenes.)
 */
const r = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const MAX_TEXTS = 8;
const TRUNCATE = 30;

/** Spiral-absorb timing (crumple phase). Long enough that the user can
 *  read each fragment as it drifts toward the ball. Blur stays off until
 *  the last quarter so most of the journey is crisp. */
const ABSORB_DURATION_MS = 1100;
const ABSORB_STAGGER_MS = 80;
const ABSORB_TAIL_MS = 80;

/** Impact timing envelope (3-step: words → wordsHold → chars). */
const WORD_BURST_MS = 450;
const WORDS_HOLD_MS = 250;
/** When to swap the word particles for the per-char shards. */
const WORDS_TO_CHARS_MS = WORD_BURST_MS + WORDS_HOLD_MS;
/** Min/max scatter duration for individual character shards. */
const CHAR_DURATION_MIN_S = 1.1;
const CHAR_DURATION_RANGE_S = 0.5;

export type SceneTint = {
  /** Tailwind class for the brief word-burst phase (~700ms). */
  word: string;
  /** Tailwind class for the per-character scatter phase. */
  char: string;
};

export type ThoughtFragmentsProps = {
  /** Raw entry texts straight from the user. Whitespace is normalized
   *  internally and each entry truncated for layout sanity. */
  texts: string[];
  phase: "crumple" | "choose" | "stage" | "impact" | "cleared";
  reduceMotion: boolean;
  /** Per-scene color treatment for the impact burst. Required visually for
   *  the burst to read as "scene-flavored", optional from a typing perspective
   *  so the component is safe to mount before the user picks a scene. */
  sceneTint?: SceneTint;
  /** Fired once the spiral-absorb animation has fully finished — the
   *  orchestrator gates the crumple→choose transition on this AND the paper
   *  crumple animation completing. */
  onAbsorbed?: () => void;
};

type Fragment = {
  id: string;
  text: string;
  startX: number;
  startY: number;
  endRotation: number;
  delay: number;
};

type WordParticle = Fragment & {
  outX: number;
  outY: number;
  rotation: number;
};

type CharShard = {
  id: string;
  char: string;
  originX: number;
  originY: number;
  outX: number;
  outY: number;
  rotation: number;
  duration: number;
};

function normalize(raw: string): string {
  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed.length > TRUNCATE ? `${trimmed.slice(0, TRUNCATE)}…` : trimmed;
}

export function ThoughtFragments({
  texts,
  phase,
  reduceMotion,
  sceneTint,
  onAbsorbed,
}: ThoughtFragmentsProps) {
  const fragments = useMemo<Fragment[]>(() => {
    return texts
      .slice(0, MAX_TEXTS)
      .map(normalize)
      .filter((t) => t.length > 0)
      .map((text, i) => {
        const angle = r(i * 7 + 1) * Math.PI * 2;
        const radius = 100 + r(i * 7 + 2) * 50;
        return {
          id: `frag-${i}`,
          text,
          startX: Math.cos(angle) * radius,
          startY: Math.sin(angle) * radius,
          endRotation: (r(i * 7 + 3) - 0.5) * 90,
          delay: i * (ABSORB_STAGGER_MS / 1000),
        };
      });
  }, [texts]);

  /** Notify parent once every spiral has finished its run — or instantly if
   *  there is nothing to absorb (defensive: Done button is gated on N>0). */
  useEffect(() => {
    if (phase !== "crumple" || !onAbsorbed) return;
    if (fragments.length === 0) {
      onAbsorbed();
      return;
    }
    const total =
      (fragments.length - 1) * ABSORB_STAGGER_MS + ABSORB_DURATION_MS + ABSORB_TAIL_MS;
    const t = window.setTimeout(onAbsorbed, total);
    return () => window.clearTimeout(t);
  }, [phase, fragments.length, onAbsorbed]);

  /** Sub-phase machine for the impact burst: idle → words → chars.
   *  We track whether the (words burst + readable hold) window has elapsed;
   *  the sub-phase is derived so we never write state synchronously inside
   *  an effect body (React 19 lint compliance). */
  const [wordsDone, setWordsDone] = useState(false);
  useEffect(() => {
    if (phase !== "impact") return;
    const t = window.setTimeout(() => setWordsDone(true), WORDS_TO_CHARS_MS);
    return () => {
      window.clearTimeout(t);
      // Reset in cleanup (deferred, not during render) so a subsequent impact
      // entry would start from "words" again.
      setWordsDone(false);
    };
  }, [phase]);

  const burstSub: "idle" | "words" | "chars" =
    phase !== "impact" ? "idle" : wordsDone ? "chars" : "words";

  const wordParticles = useMemo<WordParticle[]>(() => {
    return fragments.map((f, i) => {
      const angle = r(i * 11 + 5) * Math.PI * 2;
      const dist = 70 + r(i * 11 + 6) * 60;
      return {
        ...f,
        outX: Math.cos(angle) * dist,
        outY: Math.sin(angle) * dist,
        rotation: (r(i * 11 + 7) - 0.5) * 70,
      };
    });
  }, [fragments]);

  const charShards = useMemo<CharShard[]>(() => {
    const shards: CharShard[] = [];
    wordParticles.forEach((wp, wIdx) => {
      const chars = Array.from(wp.text).filter((c) => c.trim().length > 0);
      chars.forEach((char, cIdx) => {
        const seed = wIdx * 31 + cIdx;
        const chaosAngle = r(seed * 13 + 1) * Math.PI * 2;
        const chaosDist = 50 + r(seed * 13 + 2) * 70;
        shards.push({
          id: `shard-${wIdx}-${cIdx}`,
          char,
          originX: wp.outX,
          originY: wp.outY,
          outX: wp.outX + Math.cos(chaosAngle) * chaosDist,
          outY: wp.outY + Math.sin(chaosAngle) * chaosDist,
          rotation: (r(seed * 13 + 3) - 0.5) * 360,
          duration: CHAR_DURATION_MIN_S + r(seed * 13 + 4) * CHAR_DURATION_RANGE_S,
        });
      });
    });
    return shards;
  }, [wordParticles]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      {/* === Crumple absorb: fragments spiral inward, staying readable until
              the very last leg before they're swallowed by the paper. === */}
      <AnimatePresence>
        {phase === "crumple" &&
          fragments.map((f) => (
            <motion.span
              key={f.id}
              initial={{
                x: f.startX,
                y: f.startY,
                opacity: 0,
                scale: 1,
                rotate: 0,
                filter: "blur(0px)",
              }}
              animate={
                reduceMotion
                  ? { opacity: [0, 0.9, 0], scale: [1, 0.7, 0.4] }
                  : {
                      x: 0,
                      y: 0,
                      opacity: [0, 1, 1, 0.95, 0],
                      scale: [1, 1, 1, 0.85, 0.35],
                      rotate: f.endRotation,
                      filter: [
                        "blur(0px)",
                        "blur(0px)",
                        "blur(0px)",
                        "blur(1px)",
                        "blur(4px)",
                      ],
                    }
              }
              transition={{
                duration: reduceMotion ? 0.6 : ABSORB_DURATION_MS / 1000,
                ease: [0.55, 0, 0.55, 1],
                delay: reduceMotion ? 0 : f.delay,
                times: reduceMotion ? [0, 0.4, 1] : [0, 0.12, 0.45, 0.78, 1],
              }}
              className={cn(
                "absolute inline-block whitespace-nowrap text-xs sm:text-sm",
                "font-medium text-white will-change-transform",
                "[text-shadow:0_0_10px_rgba(255,255,255,0.55),0_0_3px_rgba(0,0,0,0.45)]",
              )}
            >
              {f.text}
            </motion.span>
          ))}
      </AnimatePresence>

      {/* === Impact burst — words shoot out (~450ms) and hold readable
              for ~250ms before the chars take over. === */}
      <AnimatePresence>
        {phase === "impact" &&
          burstSub === "words" &&
          wordParticles.map((wp) => (
            <motion.span
              key={`word-${wp.id}`}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.65, rotate: 0 }}
              animate={
                reduceMotion
                  ? { opacity: [0.95, 0], scale: [1, 0.7] }
                  : {
                      x: wp.outX,
                      y: wp.outY,
                      opacity: [0.95, 1, 1, 1],
                      scale: [0.85, 1.15, 1.05, 1.05],
                      rotate: wp.rotation,
                    }
              }
              exit={{
                opacity: 0,
                scale: 0.92,
                transition: { duration: 0.18, ease: "easeIn" },
              }}
              transition={{
                duration: reduceMotion ? 0.5 : WORDS_TO_CHARS_MS / 1000,
                ease: [0.16, 0.84, 0.36, 1],
                times: reduceMotion ? undefined : [0, 0.4, 0.55, 1],
              }}
              className={cn(
                "absolute inline-block whitespace-nowrap text-sm sm:text-base",
                "font-bold tracking-tight will-change-transform",
                "[text-shadow:0_0_12px_currentColor,0_0_4px_currentColor,0_1px_2px_rgba(0,0,0,0.55)]",
                sceneTint?.word ?? "text-white",
              )}
            >
              {wp.text}
            </motion.span>
          ))}
      </AnimatePresence>

      {/* === Impact burst — chars peel off from each word landing point and
              drift outward slowly so the user can read each letter falling. === */}
      <AnimatePresence>
        {phase === "impact" &&
          burstSub === "chars" &&
          charShards.map((s) => (
            <motion.span
              key={s.id}
              initial={{
                x: s.originX,
                y: s.originY,
                opacity: 1,
                scale: 1,
                rotate: 0,
                filter: "blur(0px)",
              }}
              animate={
                reduceMotion
                  ? { opacity: 0, scale: 0.6 }
                  : {
                      x: s.outX,
                      y: s.outY,
                      opacity: [1, 1, 0.95, 0],
                      scale: [1, 1.1, 1, 0.5],
                      rotate: s.rotation,
                      filter: [
                        "blur(0px)",
                        "blur(0px)",
                        "blur(0.6px)",
                        "blur(2.5px)",
                      ],
                    }
              }
              transition={{
                duration: reduceMotion ? 0.45 : s.duration,
                ease: [0.22, 0.61, 0.36, 1],
                times: reduceMotion ? undefined : [0, 0.35, 0.7, 1],
              }}
              className={cn(
                "absolute inline-block text-base sm:text-lg font-bold",
                "tracking-wide will-change-transform",
                "[text-shadow:0_0_8px_currentColor,0_1px_2px_rgba(0,0,0,0.55)]",
                sceneTint?.char ?? "text-white/95",
              )}
            >
              {s.char}
            </motion.span>
          ))}
      </AnimatePresence>
    </div>
  );
}
