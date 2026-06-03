"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { isPremiumMotionEnabled } from "@/lib/motion/config";
import { revealPreset } from "@/lib/motion/presets";
import { registerGSAP, gsap } from "@/lib/motion/register-gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type StaggerProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export function Stagger({ children, className, delay = 0, y = 18 }: StaggerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const enabled = isPremiumMotionEnabled();

  registerGSAP();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !enabled) return;

      const targets = Array.from(el.children);
      if (targets.length === 0) return;

      if (reduceMotion) {
        gsap.set(targets, { autoAlpha: 1, clearProps: "transform" });
        return;
      }

      gsap.fromTo(
        targets,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: revealPreset.duration,
          ease: revealPreset.ease,
          delay,
          stagger: revealPreset.stagger,
          clearProps: "opacity,visibility,transform",
        },
      );
    },
    { scope: ref, dependencies: [reduceMotion, enabled, delay, y] },
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}

