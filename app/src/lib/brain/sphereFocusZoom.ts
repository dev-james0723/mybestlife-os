/**
 * Normalized 0–100% zoom for Brain sphere camera distance.
 *
 * **0%** = farthest (largest radius / most zoomed out).
 * **100%** = closest (smallest radius / most zoomed in).
 *
 * Used for both the outer full-sphere orbit and the focus neighborhood orbit.
 */
export function radiusToZoomPercent(
  radius: number,
  minRadius: number,
  maxRadius: number,
): number {
  const lo = Math.min(minRadius, maxRadius);
  const hi = Math.max(minRadius, maxRadius);
  if (Math.abs(hi - lo) < 1e-6) return 0;
  const c = Math.max(lo, Math.min(hi, radius));
  return Math.round((100 * (hi - c)) / (hi - lo));
}

export function zoomPercentToRadius(
  percent: number,
  minRadius: number,
  maxRadius: number,
): number {
  const lo = Math.min(minRadius, maxRadius);
  const hi = Math.max(minRadius, maxRadius);
  const u = Math.max(0, Math.min(100, percent)) / 100;
  return hi - u * (hi - lo);
}
