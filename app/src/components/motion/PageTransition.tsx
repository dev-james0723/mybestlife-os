"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isPremiumMotionEnabled } from "@/lib/motion/config";
import {
  MOTION_REVEAL_SELECTOR,
  pageTransitionPreset,
  revealPreset,
} from "@/lib/motion/presets";
import { registerGSAP, ScrollTrigger, gsap } from "@/lib/motion/register-gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const enabled = isPremiumMotionEnabled();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) {
      return;
    }

    registerGSAP();

    const context = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(root, { autoAlpha: 1, clearProps: "transform" });
        gsap.set(root.querySelectorAll(MOTION_REVEAL_SELECTOR), {
          autoAlpha: 1,
          clearProps: "transform",
        });
        return;
      }

      const entrance = gsap.fromTo(
        root,
        { autoAlpha: 0, y: pageTransitionPreset.y },
        {
          autoAlpha: 1,
          y: 0,
          duration: pageTransitionPreset.duration,
          ease: pageTransitionPreset.ease,
          clearProps: "opacity,visibility,transform",
        },
      );

      const revealTargets = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll(MOTION_REVEAL_SELECTOR),
      );
      if (revealTargets.length === 0) return;

      gsap.set(revealTargets, { autoAlpha: 0, y: revealPreset.y });

      const scroller =
        root.closest<HTMLElement>('[role="region"][aria-label="Main content"]') ??
        undefined;

      ScrollTrigger.batch(revealTargets, {
        scroller,
        start: "top 88%",
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { autoAlpha: 0, y: revealPreset.y },
            {
              autoAlpha: 1,
              y: 0,
              duration: revealPreset.duration,
              ease: revealPreset.ease,
              stagger: revealPreset.stagger,
              overwrite: "auto",
              clearProps: "opacity,visibility,transform",
            },
          );
        },
      });
    }, root);

    return () => context.revert();
  }, [pathname, reduceMotion, enabled]);

  return (
    <div ref={rootRef} className={cn("motion-page-transition", className)}>
      {children}
    </div>
  );
}
