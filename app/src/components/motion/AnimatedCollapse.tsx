"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isPremiumMotionEnabled } from "@/lib/motion/config";
import { gsap, registerGSAP } from "@/lib/motion/register-gsap";

type AnimatedCollapseProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  duration?: number;
};

export function AnimatedCollapse({
  open,
  children,
  className,
  innerClassName,
  duration = 0.3,
}: AnimatedCollapseProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const syncedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const enabled = isPremiumMotionEnabled();

  registerGSAP();

  useGSAP(
    () => {
      const root = rootRef.current;
      const inner = innerRef.current;
      if (!root || !inner) return;

      gsap.killTweensOf([root, inner]);

      if (!syncedRef.current || !enabled || reduceMotion) {
        gsap.set(root, {
          height: open ? "auto" : 0,
          autoAlpha: open ? 1 : 0,
          overflow: "hidden",
        });
        gsap.set(inner, {
          autoAlpha: open ? 1 : 0,
          y: 0,
        });
        syncedRef.current = true;
        return;
      }

      const currentHeight = root.offsetHeight;
      const targetHeight = open ? inner.scrollHeight : 0;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.set(root, { overflow: "hidden", autoAlpha: 1 });
      tl.fromTo(
        root,
        { height: currentHeight },
        {
          height: targetHeight,
          duration,
          onComplete: () => {
            if (open) gsap.set(root, { height: "auto" });
          },
        },
        0,
      );
      tl.fromTo(
        inner,
        { autoAlpha: open ? 0 : 1, y: open ? -6 : 0 },
        {
          autoAlpha: open ? 1 : 0,
          y: open ? 0 : -4,
          duration: Math.max(0.18, duration * 0.78),
        },
        0.04,
      );
      if (!open) {
        tl.set(root, { autoAlpha: 0 }, ">");
      }
      syncedRef.current = true;
    },
    { scope: rootRef, dependencies: [open, reduceMotion, enabled, duration] },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden={!open}
      className={cn("overflow-hidden", !open && "pointer-events-none", className)}
    >
      <div ref={innerRef} className={innerClassName}>
        {children}
      </div>
    </div>
  );
}
