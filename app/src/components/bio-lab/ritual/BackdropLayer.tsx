"use client";

import Image from "next/image";
import {
  motion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Three depth tiers used by every Scene to keep parallax cinematic and
 * consistent. Smaller % = farther away (moves less), larger % = closer
 * (moves more) — matches how real cameras parallax through space.
 */
export type ParallaxDepth = "back" | "mid" | "front";

const SPRING_CONFIG = { stiffness: 80, damping: 20, mass: 0.6 } as const;

/**
 * Cursor delta is normalized to ±150 by the orchestrator. We map that to
 * sub-percent shifts so motion feels like a far-away camera dolly, not a
 * jittery follow-the-mouse hack.
 */
const AMP_X: Record<ParallaxDepth, number> = {
  back: 0.5,
  mid: 0.8,
  front: 1.5,
};

const AMP_Y: Record<ParallaxDepth, number> = {
  back: 0.25,
  mid: 0.4,
  front: 0.75,
};

const INPUT_RANGE = [-150, 150] as const;

type ParallaxLayerProps = {
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  depth: ParallaxDepth;
  reduceMotion: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * Wraps any visual content with spring-smoothed, depth-aware parallax.
 * The wrapper is oversized by 8% on every side so that the largest amplitude
 * (1.5%) cannot expose hard edges.
 */
export function ParallaxLayer({
  parallaxX,
  parallaxY,
  depth,
  reduceMotion,
  className,
  children,
}: ParallaxLayerProps) {
  const smoothX = useSpring(parallaxX, SPRING_CONFIG);
  const smoothY = useSpring(parallaxY, SPRING_CONFIG);

  const ampX = AMP_X[depth];
  const ampY = AMP_Y[depth];

  const x = useTransform(smoothX, [...INPUT_RANGE], [`-${ampX}%`, `${ampX}%`]);
  const y = useTransform(smoothY, [...INPUT_RANGE], [`-${ampY}%`, `${ampY}%`]);

  return (
    <motion.div
      className={cn("absolute -inset-[8%] will-change-transform", className)}
      style={
        reduceMotion
          ? undefined
          : { x, y }
      }
    >
      {children}
    </motion.div>
  );
}

type BackdropLayerProps = {
  src: string;
  alt: string;
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  depth?: ParallaxDepth;
  reduceMotion: boolean;
  /** Optional CSS overlay (gradient/tint) painted ON TOP of the image. */
  overlayClassName?: string;
  /**
   * When true (default) the image is rendered with priority — use for the
   * scene visible in the current phase to avoid first-paint flash.
   */
  priority?: boolean;
  /**
   * Fires once the underlying photo has finished decoding. The orchestrator
   * uses this to gate the reveal of all foreground / midground particles so
   * the backdrop never appears AFTER the rest of the scene.
   */
  onReady?: () => void;
};

/**
 * Cinematic photo backdrop layer. Renders an oversized next/image inside a
 * parallax wrapper, with an optional color-grading overlay on top.
 *
 * Sizing strategy (anti-edge-bleed):
 *   - wrapper: -inset-[8%]  → 16% padding around the visible area
 *   - image:   scale(1.1)   → another 10% safety
 *   total headroom is well above any depth amplitude
 */
export function BackdropLayer({
  src,
  alt,
  parallaxX,
  parallaxY,
  depth = "back",
  reduceMotion,
  overlayClassName,
  priority = true,
  onReady,
}: BackdropLayerProps) {
  return (
    <ParallaxLayer
      parallaxX={parallaxX}
      parallaxY={parallaxY}
      depth={depth}
      reduceMotion={reduceMotion}
    >
      <div className="absolute inset-0 scale-110">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          priority={priority}
          sizes="100vw"
          onLoad={onReady}
        />
        {overlayClassName ? (
          <div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0", overlayClassName)}
          />
        ) : null}
      </div>
    </ParallaxLayer>
  );
}
