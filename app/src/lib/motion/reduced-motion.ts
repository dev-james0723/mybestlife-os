export function getPrefersReducedMotion(defaultValue = true) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return defaultValue;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);

  return () => mediaQuery.removeEventListener("change", callback);
}

