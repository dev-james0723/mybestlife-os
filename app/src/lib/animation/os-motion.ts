import type { MotionProps, Transition, Variants } from "framer-motion";

import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";

export const osMotionViewport = { once: true, amount: 0.18 };

export const OS_MOTION = {
  pressMs: 0.12,
  hoverMs: 0.16,
  tabMs: 0.24,
  filterMs: 0.3,
  sheetMs: 0.36,
  cardMs: 0.42,
  ease: EASE_OUT_EXPO,
} as const;

const defaultTransition: Transition = {
  duration: 0.5,
  ease: OS_MOTION.ease,
};

export function osEntrance(
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

export function osHoverLift(reduceMotion: boolean): MotionProps["whileHover"] {
  if (reduceMotion) return { opacity: 0.98 };
  return {
    y: -4,
    scale: 1.01,
    transition: { duration: OS_MOTION.tabMs, ease: OS_MOTION.ease },
  };
}

export function osStaggerContainer(reduceMotion: boolean): Variants {
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

export function osStaggerItem(
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

export function osTabPanel(reduceMotion: boolean): MotionProps {
  return {
    initial: { opacity: 0, y: reduceMotion ? 0 : 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduceMotion ? 0 : -6 },
    transition: reduceMotion
      ? REDUCED_MOTION_FADE
      : { duration: OS_MOTION.filterMs, ease: OS_MOTION.ease },
  };
}

export function osProgressTransition(
  reduceMotion: boolean,
  delay = 0,
): Transition {
  return reduceMotion
    ? { ...REDUCED_MOTION_FADE, delay: Math.min(delay, 0.05) }
    : { duration: 0.85, delay, ease: OS_MOTION.ease };
}

export function runOSViewTransition(
  update: () => void,
  reduceMotion: boolean,
) {
  if (typeof document === "undefined" || reduceMotion) {
    update();
    return;
  }

  const startViewTransition = (
    document as Document & {
      startViewTransition?: (callback: () => void) => unknown;
    }
  ).startViewTransition;

  if (typeof startViewTransition !== "function") {
    update();
    return;
  }

  startViewTransition.call(document, update);
}
