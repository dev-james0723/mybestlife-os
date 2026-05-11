"use client";

import { useEffect, useMemo } from "react";
import { motion, useAnimationControls, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

const FLING_VELOCITY = 600;
const FLING_DISTANCE = 100;

/**
 * Geometry strategy:
 *   - The paper STARTS as an A4 portrait sheet (210/297 ≈ 0.707 ratio).
 *   - During the crumple animation we morph width / height / borderRadius
 *     into a roughly square crumpled ball.
 *   - We animate width/height directly (not via scale) so the silhouette
 *     change reads as "paper compressing", not just "shrinking".
 */
const SHEET_W = 132;
const SHEET_H = 188;
const BALL_W = 158;
const BALL_H = 150;

/** Total time for the sheet → ball morph. Tuned slightly longer than the
 *  thought-fragments absorb so the paper "settles" after the last word lands. */
const CRUMPLE_DURATION_S = 1.3;

export type PaperBallProps = {
  phase: "crumple" | "choose" | "stage" | "impact" | "cleared";
  reduceMotion: boolean;
  onCrumpleDone?: () => void;
  onFling?: (info: PanInfo) => void;
  className?: string;
  stageConstraintsRef?: React.RefObject<Element | null>;
  /** Optional list of thought-text snippets to render as a faint overlay on
   *  the paper surface. The overlay sits inside the SVG warp filter so it
   *  inherits the paper's crumpled distortion — looks like ink on creased
   *  paper. Pass undefined / empty to render nothing. */
  surfaceText?: string[];
};

export function PaperBall({
  phase,
  reduceMotion,
  onCrumpleDone,
  onFling,
  className,
  stageConstraintsRef,
  surfaceText,
}: PaperBallProps) {
  const controls = useAnimationControls();

  /** Two-step keyframe set:
   *    [sheet] → [partially folded, slightly tilted] → [crumpled ball]
   *  Width / height / borderRadius / shadow all animate together so the
   *  silhouette and material both change. */
  const crumpleAnim = useMemo(
    () =>
      reduceMotion
        ? {
            width: BALL_W,
            height: BALL_H,
            scale: 0.95,
            rotate: 6,
            borderRadius: "38% 42% 32% 44% / 36% 34% 42% 32%",
            boxShadow: "0 10px 22px -8px rgba(0,0,0,0.4)",
          }
        : {
            width: [SHEET_W, SHEET_W * 1.04, BALL_W],
            height: [SHEET_H, SHEET_H * 0.74, BALL_H],
            scale: [1, 0.97, 0.95],
            rotate: [0, -3, 7],
            borderRadius: [
              "4px",
              "12% 16% 18% 12% / 10% 18% 14% 20%",
              "32% 38% 28% 42% / 36% 34% 40% 30%",
            ],
            boxShadow: [
              "0 1px 2px rgba(0,0,0,0.06), 0 4px 10px -2px rgba(0,0,0,0.08)",
              "0 6px 14px -6px rgba(0,0,0,0.4), inset 0 0 12px rgba(0,0,0,0.18)",
              "0 12px 28px -10px rgba(0,0,0,0.55), inset 0 0 22px rgba(0,0,0,0.32)",
            ],
            transition: {
              duration: CRUMPLE_DURATION_S,
              ease: [0.55, 0, 0.55, 1] as [number, number, number, number],
              times: [0, 0.5, 1],
            },
          },
    [reduceMotion],
  );

  useEffect(() => {
    if (phase === "crumple") {
      controls.start(crumpleAnim).then(() => onCrumpleDone?.());
    } else if (phase === "stage") {
      // Reset position + ensure final ball geometry for the drag/fling phase.
      controls.start({
        x: 0,
        y: 0,
        width: BALL_W,
        height: BALL_H,
        scale: 0.95,
        rotate: 7,
        opacity: 1,
        borderRadius: "32% 38% 28% 42% / 36% 34% 40% 30%",
      });
    }
  }, [phase, controls, crumpleAnim, onCrumpleDone]);

  const isDraggable = phase === "stage";

  return (
    <motion.div
      drag={isDraggable}
      dragConstraints={stageConstraintsRef ?? false}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (!isDraggable) return;
        const { velocity, offset } = info;
        const speed = Math.hypot(velocity.x, velocity.y);

        if (speed > FLING_VELOCITY || Math.hypot(offset.x, offset.y) > FLING_DISTANCE) {
          // Fling
          controls
            .start({
              x: offset.x + velocity.x * 0.4,
              y: offset.y + velocity.y * 0.4,
              rotate: velocity.x * 0.5,
              scale: 0.04,
              opacity: 0,
              transition: {
                x: { type: "inertia", velocity: velocity.x, power: 0.4, timeConstant: 250 },
                y: { type: "inertia", velocity: velocity.y, power: 0.4, timeConstant: 250 },
                rotate: { type: "inertia", velocity: velocity.x * 0.5, power: 0.4 },
                default: { duration: 0.5, ease: "easeOut" },
              },
            })
            .then(() => {
              onFling?.(info);
            });
        } else {
          controls.start({
            x: 0,
            y: 0,
            transition: { type: "spring", stiffness: 400, damping: 28 },
          });
        }
      }}
      whileDrag={{ scale: 0.85, cursor: "grabbing" }}
      initial={{
        width: SHEET_W,
        height: SHEET_H,
        scale: 1,
        rotate: 0,
        x: 0,
        y: 0,
        opacity: 1,
        borderRadius: "4px",
      }}
      animate={controls}
      className={cn(
        "relative z-20 flex items-center justify-center",
        isDraggable ? "cursor-grab touch-none" : "pointer-events-none",
        phase === "cleared" ? "hidden" : "block",
        className,
      )}
    >
      {/* SVG Filter Definition */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <filter id="paper-crumple" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={reduceMotion ? "0.01" : "0.04"}
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={reduceMotion ? 0 : phase === "crumple" ? 0 : 16}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Main paper body — borderRadius inherits from the animated outer
          so the inner face follows the silhouette change exactly. */}
      <div
        className="absolute inset-0 bg-[#fafaf7] transition-[filter,box-shadow] duration-700 ease-out"
        style={{
          borderRadius: "inherit",
          filter: phase === "crumple" ? "none" : "url(#paper-crumple)",
          boxShadow:
            phase === "crumple"
              ? "inset 0 0 0 1px rgba(0,0,0,0.04)"
              : "inset 0 0 22px rgba(0,0,0,0.18), 0 10px 22px -5px rgba(0,0,0,0.32)",
        }}
      >
        {/* Sheet phase: subtle fold lines (vertical center + diagonal corner)
            that read as "this is paper". Fade out as the paper crumples. */}
        <motion.svg
          aria-hidden
          viewBox="0 0 100 142"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full pointer-events-none"
          style={{ borderRadius: "inherit" }}
          initial={{ opacity: phase === "crumple" ? 0.45 : 0 }}
          animate={{
            opacity:
              phase === "crumple" ? (reduceMotion ? 0 : [0.45, 0.4, 0]) : 0,
          }}
          transition={
            phase === "crumple"
              ? {
                  duration: CRUMPLE_DURATION_S,
                  times: [0, 0.4, 1],
                  ease: "easeOut",
                }
              : { duration: 0.4 }
          }
        >
          {/* center vertical fold */}
          <line x1="50" y1="2" x2="50" y2="140" stroke="rgba(0,0,0,0.10)" strokeWidth="0.4" />
          {/* horizontal mid fold */}
          <line x1="3" y1="71" x2="97" y2="71" stroke="rgba(0,0,0,0.07)" strokeWidth="0.4" />
          {/* corner dog-ear hint */}
          <path d="M 100 0 L 100 14 L 86 0 Z" fill="rgba(0,0,0,0.04)" />
          <line x1="100" y1="14" x2="86" y2="0" stroke="rgba(0,0,0,0.10)" strokeWidth="0.4" />
        </motion.svg>

        {/* Inner crinkles (polygons) — kick in once the paper has crumpled */}
        <svg
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-500",
            phase === "crumple" ? "opacity-0" : "opacity-60",
          )}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polygon points="10,10 90,20 80,80 20,90" fill="rgba(255,255,255,0.8)" />
          <polygon points="15,40 85,30 70,95 30,85" fill="rgba(0,0,0,0.06)" />
          <polygon points="0,50 100,45 90,100 10,100" fill="rgba(0,0,0,0.04)" />
          <polygon points="40,0 60,0 55,100 45,100" fill="rgba(255,255,255,0.4)" />
        </svg>

        {/* Faux paper creases */}
        <span
          className={cn(
            "absolute inset-0 opacity-0 mix-blend-multiply",
            phase !== "crumple" && "opacity-100",
          )}
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 30%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 45%)," +
              "radial-gradient(ellipse at 70% 70%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0) 50%)," +
              "linear-gradient(120deg, rgba(0,0,0,0.08) 0 1px, transparent 1px 14px)," +
              "linear-gradient(45deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 18px)",
            transition: "opacity 600ms ease",
            borderRadius: "inherit",
          }}
        />

        {/* Faint thought-text overlay — sits inside the SVG-filtered paper
            body so it inherits the crumpled distortion. Always rendered so
            the opacity fade reads as a smooth reveal as the ritual moves
            from crumple → stage. Sized + colored for clear readability. */}
        {surfaceText && surfaceText.length > 0 ? (
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 flex select-none flex-col items-center justify-center",
              "px-3 text-center font-mono leading-[1.4]",
              "text-[9px] sm:text-[11px] tracking-tight",
              "text-stone-900/55 mix-blend-multiply",
              "transition-opacity duration-700 ease-out",
              phase === "crumple" ? "opacity-0" : "opacity-100",
            )}
            style={{ borderRadius: "inherit", transform: "rotate(-3deg)" }}
          >
            {surfaceText.slice(0, 4).map((t, i) => {
              const condensed = t.replace(/\s+/g, " ").trim();
              const display = condensed.length > 16 ? `${condensed.slice(0, 16)}…` : condensed;
              return (
                <span
                  key={i}
                  className="block w-full truncate"
                  style={{ opacity: 0.65 + i * 0.05 }}
                >
                  {display}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
