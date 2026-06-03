"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { isPremiumMotionEnabled, motionDurations } from "@/lib/motion/config";
import { motionEases } from "@/lib/motion/easings";
import { registerGSAP, gsap } from "@/lib/motion/register-gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type MagneticButtonProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
};

export function MagneticButton({
  children,
  className,
  strength = 10,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const enabled = isPremiumMotionEnabled();

  registerGSAP();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !enabled || reduceMotion) return;

      const xTo = gsap.quickTo(el, "x", {
        duration: motionDurations.hover,
        ease: motionEases.reveal,
      });
      const yTo = gsap.quickTo(el, "y", {
        duration: motionDurations.hover,
        ease: motionEases.reveal,
      });

      const onPointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const rect = el.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * strength;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * strength;
        xTo(x);
        yTo(y);
      };
      const onPointerLeave = () => {
        xTo(0);
        yTo(0);
      };

      el.addEventListener("pointermove", onPointerMove);
      el.addEventListener("pointerleave", onPointerLeave);

      return () => {
        el.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("pointerleave", onPointerLeave);
        gsap.set(el, { clearProps: "transform" });
      };
    },
    { scope: ref, dependencies: [reduceMotion, enabled, strength] },
  );

  return (
    <div ref={ref} className={cn("inline-flex", className)}>
      {children}
    </div>
  );
}
