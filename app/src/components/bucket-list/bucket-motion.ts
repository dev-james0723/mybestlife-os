import type { MotionProps, Transition, Variants } from "framer-motion";

import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";

export const bucketMotionViewport = { once: true, amount: 0.18 };

const defaultTransition: Transition = {
  duration: 0.5,
  ease: EASE_OUT_EXPO,
};

export function bucketEntrance(
  reduceMotion: boolean,
  delay = 0,
  y = 16,
): MotionProps {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : y },
    animate: { opacity: 1, y: 0 },
    transition: reduceMotion
      ? { ...REDUCED_MOTION_FADE, delay: Math.min(delay, 0.08) }
      : { ...defaultTransition, delay },
  };
}

export function bucketHoverLift(reduceMotion: boolean): MotionProps["whileHover"] {
  if (reduceMotion) return { opacity: 0.98 };
  return {
    y: -4,
    scale: 1.01,
    transition: { duration: 0.22, ease: EASE_OUT_EXPO },
  };
}

export function bucketStaggerContainer(reduceMotion: boolean): Variants {
  return {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: reduceMotion ? 0.02 : 0.06,
        delayChildren: reduceMotion ? 0 : 0.04,
      },
    },
  };
}

export function bucketStaggerItem(
  reduceMotion: boolean,
  y = 14,
): Variants {
  return {
    hidden: { opacity: 0, y: reduceMotion ? 0 : y },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion ? REDUCED_MOTION_FADE : defaultTransition,
    },
  };
}

export function bucketTabPanel(reduceMotion: boolean): MotionProps {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -6 },
    transition: reduceMotion
      ? REDUCED_MOTION_FADE
      : { duration: 0.32, ease: EASE_OUT_EXPO },
  };
}

export function bucketProgressTransition(
  reduceMotion: boolean,
  delay = 0,
): Transition {
  return reduceMotion
    ? { ...REDUCED_MOTION_FADE, delay: Math.min(delay, 0.05) }
    : { duration: 0.85, delay, ease: EASE_OUT_EXPO };
}
