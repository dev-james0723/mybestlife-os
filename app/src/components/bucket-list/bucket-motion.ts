import type { MotionProps, Transition, Variants } from "framer-motion";

import {
  osEntrance,
  osHoverLift,
  osMotionViewport,
  osProgressTransition,
  osStaggerContainer,
  osStaggerItem,
  osTabPanel,
  runOSViewTransition,
} from "@/lib/animation/os-motion";

export const bucketMotionViewport = osMotionViewport;

export function bucketEntrance(
  reduceMotion: boolean,
  delay = 0,
  y = 16,
): MotionProps {
  return osEntrance(reduceMotion, delay, y);
}

export function bucketHoverLift(reduceMotion: boolean): MotionProps["whileHover"] {
  return osHoverLift(reduceMotion);
}

export function bucketStaggerContainer(reduceMotion: boolean): Variants {
  return osStaggerContainer(reduceMotion);
}

export function bucketStaggerItem(
  reduceMotion: boolean,
  y = 14,
): Variants {
  return osStaggerItem(reduceMotion, y);
}

export function bucketTabPanel(reduceMotion: boolean): MotionProps {
  return osTabPanel(reduceMotion);
}

export function bucketProgressTransition(
  reduceMotion: boolean,
  delay = 0,
): Transition {
  return osProgressTransition(reduceMotion, delay);
}

export function bucketWorkspaceTransition(
  update: () => void,
  reduceMotion: boolean,
) {
  runOSViewTransition(update, reduceMotion);
}
