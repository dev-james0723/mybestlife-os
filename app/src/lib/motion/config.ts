export const PREMIUM_MOTION_ENV = process.env.NEXT_PUBLIC_ENABLE_PREMIUM_MOTION;

export function isPremiumMotionEnabled() {
  return PREMIUM_MOTION_ENV !== "false";
}

export const motionDurations = {
  instant: 0.16,
  hover: 0.22,
  reveal: 0.48,
  page: 0.52,
  hero: 0.82,
  reduced: 0.12,
} as const;

export const motionDistances = {
  micro: 8,
  reveal: 18,
  section: 30,
} as const;

