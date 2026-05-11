import type { Transition } from "framer-motion";

/** Heavy-then-graceful, used by the default bank vault door swing. */
export const EASE_HEAVY_GRACEFUL: [number, number, number, number] = [
  0.22, 1, 0.36, 1,
];

/** Sci-fi airlock panel retract. Matches easeOutExpo. */
export const EASE_OUT_EXPO: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

/** Wooden-hinge easing for the academia cabinet doors. */
export const EASE_WOODEN: [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Organic overshoot for the forest trunk splitting open (~easeOutBack). */
export const EASE_OUT_BACK: [number, number, number, number] = [
  0.34, 1.56, 0.64, 1,
];

/** Gentle in/out used for vine retraction, dial rotation recovery, etc. */
export const EASE_IN_OUT_CUBIC: [number, number, number, number] = [
  0.65, 0, 0.35, 1,
];

export const EASE_IN_OUT_QUAD: [number, number, number, number] = [
  0.45, 0, 0.55, 1,
];

/** Fast, quiet dissolve used when `prefers-reduced-motion` is active. */
export const REDUCED_MOTION_FADE: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};
