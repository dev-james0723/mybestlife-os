"use client";

/**
 * Shared animated weather glyph, powered by Lottie (Meteocons).
 *
 * Used in three places via a single canonical animation key:
 *   - the top-bar pill background  (`mode="background"`)
 *   - the dashboard weather widget (`mode="icon"`)
 *   - the weather page hero        (`mode="icon"`)
 *
 * Notes:
 * - The dotLottie canvas/WASM renderer is lazy-loaded with `next/dynamic`
 *   (`ssr: false`) so it never runs during SSR/build.
 * - Respects `prefers-reduced-motion`: when reduced, the animation loads but
 *   does not autoplay/loop, so the user sees a static first-frame poster.
 * - Decorative only (`aria-hidden`); every surface keeps its own text label.
 */

import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  getAnimationSrc,
  type WeatherAnimationKey,
} from "@/lib/weather/lottie-animation";

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  { ssr: false },
);

type WeatherLottieMode = "background" | "icon";

interface WeatherLottieProps {
  animationKey: WeatherAnimationKey;
  /**
   * - `icon`: inline square glyph; size it via `className` (e.g. `size-7`).
   * - `background`: fills its positioned parent and crops to cover.
   */
  mode?: WeatherLottieMode;
  className?: string;
}

export function WeatherLottie({
  animationKey,
  mode = "icon",
  className,
}: WeatherLottieProps) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      aria-hidden
      className={cn(
        mode === "background"
          ? "pointer-events-none block h-full w-full"
          : "inline-block",
        className,
      )}
    >
      <DotLottieReact
        src={getAnimationSrc(animationKey)}
        autoplay={!reduceMotion}
        loop={!reduceMotion}
        backgroundColor="transparent"
        layout={{
          fit: mode === "background" ? "cover" : "contain",
          align: [0.5, 0.5],
        }}
        renderConfig={{ autoResize: true, freezeOnOffscreen: true }}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </span>
  );
}
