"use client";
import { useCallback, useLayoutEffect, useState, type Ref } from "react";
import gsap from "gsap";

export const popupMotion = {
  dialog: { enter: 0.24, exit: 0.18, distance: 12 },
  sheet: { enter: 0.28, exit: 0.22, distance: 28 },
  popover: { enter: 0.16, exit: 0.12, distance: 6 },
  menu: { enter: 0.14, exit: 0.10, distance: 4 },
  tooltip: { enter: 0.12, exit: 0.09, distance: 3 },
} as const;

/** Base UI retains semantic ownership and waits for the CSS presence clock.
 * GSAP alone animates the actual surface; interrupted tweens are overwritten. */
/* eslint-disable react-hooks/immutability -- React callback refs intentionally assign the caller ref during commit. */
export function useGsapPopup(kind: keyof typeof popupMotion, forwardedRef?: Ref<HTMLElement>) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);
  useLayoutEffect(() => {
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preset = popupMotion[kind];
    let previous: boolean | undefined;
    const context = gsap.context(() => {}, element);
    const animate = () => {
      const open = !element.hasAttribute("data-closed");
      if (previous === open) return;
      const first = previous === undefined;
      previous = open;
      context.add(() => {
        const side = element.dataset.side;
        const x = kind === "sheet" && (side === "left" || side === "right") ? (side === "left" ? -preset.distance : preset.distance) : 0;
        const y = x ? 0 : side === "top" ? -preset.distance : preset.distance;
        // Dialogs are positioned at top/left 50% and depend on a percentage
        // transform for centering. GSAP's pixel x/y transform would otherwise
        // replace that CSS transform and push the panel's lower half offscreen.
        const centeredDialog = kind === "dialog"
          ? { xPercent: -50, yPercent: -50 }
          : {};
        if (media.matches) { gsap.set(element, { opacity: open ? 1 : 0, x: 0, y: 0, scale: 1, ...centeredDialog }); return; }
        if (first && open) gsap.set(element, { opacity: 0, x, y, scale: kind === "dialog" ? 0.98 : 1, ...centeredDialog });
        gsap.to(element, { opacity: open ? 1 : 0, x: open ? 0 : x, y: open ? 0 : y,
          scale: !open && kind === "dialog" ? 0.98 : 1, ...centeredDialog, duration: open ? preset.enter : preset.exit,
          ease: open ? "power2.out" : "power2.in", overwrite: true });
      });
    };
    animate();
    const observer = new MutationObserver(animate);
    observer.observe(element, { attributes: true, attributeFilter: ["data-open", "data-closed"] });
    const change = () => { previous = undefined; animate(); };
    media.addEventListener("change", change);
    return () => { observer.disconnect(); media.removeEventListener("change", change); context.revert(); };
  }, [element, kind]);
  return ref;
}
