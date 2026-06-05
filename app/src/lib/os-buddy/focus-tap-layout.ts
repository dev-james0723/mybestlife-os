export type FocusTapVisualPhase = "waiting" | "active" | "feedback" | "result";

export const FOCUS_TAP_MAX_SPRITE_SCALE = 2.12;

export const FOCUS_TAP_SPRITE_SCALE_CLASSES = {
  reducedMotion: "scale-[1.65] sm:scale-[1.95] lg:scale-[2.05]",
  resting: "scale-[1.65] sm:scale-[1.98] lg:scale-[2.1]",
  active: "scale-[1.78] sm:scale-[2.05] lg:scale-[2.12]",
} as const;

export function getFocusTapSpriteScaleClass(
  phase: FocusTapVisualPhase,
  reducedMotion: boolean,
) {
  if (reducedMotion) return FOCUS_TAP_SPRITE_SCALE_CLASSES.reducedMotion;
  return phase === "active"
    ? FOCUS_TAP_SPRITE_SCALE_CLASSES.active
    : FOCUS_TAP_SPRITE_SCALE_CLASSES.resting;
}
