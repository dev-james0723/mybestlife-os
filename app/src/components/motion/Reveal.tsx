"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { isPremiumMotionEnabled } from "@/lib/motion/config";
import { reducedMotionPreset, revealPreset } from "@/lib/motion/presets";
import { registerGSAP, gsap } from "@/lib/motion/register-gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  scroll?: boolean;
  y?: number;
};

export function Reveal({
  children,
  className,
  delay = 0,
  scroll = true,
  y = revealPreset.y,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const enabled = isPremiumMotionEnabled();

  registerGSAP();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !enabled) return;

      if (reduceMotion) {
        gsap.fromTo(
          el,
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: reducedMotionPreset.duration,
            ease: reducedMotionPreset.ease,
            delay: Math.min(delay, 0.04),
            clearProps: "opacity,visibility",
          },
        );
        return;
      }

      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: revealPreset.duration,
          ease: revealPreset.ease,
          delay,
          scrollTrigger: scroll
            ? {
                trigger: el,
                start: "top 88%",
                once: true,
              }
            : undefined,
          clearProps: "opacity,visibility,transform",
        },
      );
    },
    { scope: ref, dependencies: [reduceMotion, enabled, delay, scroll, y] },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
