import { motionDistances, motionDurations } from "@/lib/motion/config";
import { motionEases } from "@/lib/motion/easings";

export const MOTION_REVEAL_ATTR = "data-motion-reveal";
export const MOTION_REVEAL_SELECTOR = `[${MOTION_REVEAL_ATTR}]`;
export const MOTION_STAGGER_ITEM_ATTR = "data-motion-stagger-item";

export const pageTransitionPreset = {
  duration: motionDurations.page,
  ease: motionEases.hero,
  y: motionDistances.reveal,
} as const;

export const revealPreset = {
  duration: motionDurations.reveal,
  ease: motionEases.reveal,
  y: motionDistances.section,
  stagger: 0.055,
} as const;

export const reducedMotionPreset = {
  duration: motionDurations.reduced,
  ease: motionEases.state,
} as const;

