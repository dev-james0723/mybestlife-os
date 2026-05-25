"use client";

import * as React from "react";

const DESKTOP_BREAKPOINT = 768;

/**
 * SSR-safe `min-width: 768px` media-query hook. Returns `false` until mounted so
 * the server render and first client render agree (avoids hydration mismatch),
 * then reflects the live viewport.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export default useIsDesktop;
