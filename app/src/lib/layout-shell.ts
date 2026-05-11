/**
 * Protected layout (viewport ≥768px, “desktop” shell): extra horizontal
 * padding between `md` and `xl` so iPad / narrow split-view does not feel
 * edge‑locked; wide screens match the original laptop gutters (`xl:px-6`).
 */
export const PROTECTED_DESKTOP_GUTTER_X =
  "px-4 sm:px-6 md:px-8 lg:max-xl:px-8 xl:px-6";

/** Same horizontal rhythm as {@link PROTECTED_DESKTOP_GUTTER_X} for the sticky top bar row. */
export const APP_TOPBAR_DESKTOP_ROW_GUTTER_X = "px-4 sm:px-6 md:px-8 xl:px-6";

/** Full-bleed sections that negate the protected main gutters must track the same breakpoints. */
export const PROTECTED_DESKTOP_GUTTER_NEG_X =
  "-mx-4 sm:-mx-6 md:-mx-8 lg:max-xl:-mx-8 xl:-mx-6";
