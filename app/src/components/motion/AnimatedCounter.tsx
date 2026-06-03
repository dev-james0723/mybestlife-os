"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { isPremiumMotionEnabled, motionDurations } from "@/lib/motion/config";
import { motionEases } from "@/lib/motion/easings";
import { registerGSAP, gsap } from "@/lib/motion/register-gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type AnimatedCounterProps = {
  value: number;
  className?: string;
  formatter?: (value: number) => string;
};

const defaultFormatter = (value: number) => Math.round(value).toLocaleString();

export function AnimatedCounter({
  value,
  className,
  formatter = defaultFormatter,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduceMotion = useReducedMotion();
  const enabled = isPremiumMotionEnabled();

  registerGSAP();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (!enabled || reduceMotion) {
        el.textContent = formatter(value);
        return;
      }

      const counter = { value: 0 };
      gsap.to(counter, {
        value,
        duration: motionDurations.hero,
        ease: motionEases.reveal,
        onUpdate: () => {
          el.textContent = formatter(counter.value);
        },
      });
    },
    { scope: ref, dependencies: [value, enabled, reduceMotion, formatter] },
  );

  return <span ref={ref} className={className}>{formatter(value)}</span>;
}
