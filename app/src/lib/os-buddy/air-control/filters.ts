/**
 * Smoothing filters for Air Touch.
 *
 * OneEuroFilter is the standard low-jitter / low-lag filter for interactive
 * pointing: it lowers the cutoff frequency when the signal is slow (kills jitter
 * at rest) and raises it when the signal moves fast (keeps it responsive). We use
 * it for the screen-space fingertip during tracking/hover. The simple `lowPass`
 * exponential is used for the tighter grabbed-tier follow where a fixed alpha is
 * preferable and predictable.
 *
 * Reference: Casiez, Roussel, Vogel — "1€ Filter" (CHI 2012).
 */

import type { Vec2 } from "./geometry";

function smoothingAlpha(cutoff: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dtSeconds);
}

export class OneEuroFilter {
  private lastValue: number | null = null;
  private lastDerivative = 0;
  private lastTimeMs: number | null = null;

  constructor(
    private readonly minCutoff = 1.0,
    private readonly beta = 0.0,
    private readonly dCutoff = 1.0,
  ) {}

  filter(value: number, timestampMs: number): number {
    if (this.lastValue == null || this.lastTimeMs == null) {
      this.lastValue = value;
      this.lastTimeMs = timestampMs;
      this.lastDerivative = 0;
      return value;
    }

    const dtSeconds = Math.max((timestampMs - this.lastTimeMs) / 1000, 1e-3);

    // Filtered derivative.
    const rawDerivative = (value - this.lastValue) / dtSeconds;
    const dAlpha = smoothingAlpha(this.dCutoff, dtSeconds);
    const derivative =
      this.lastDerivative + dAlpha * (rawDerivative - this.lastDerivative);

    // Adaptive cutoff based on speed.
    const cutoff = this.minCutoff + this.beta * Math.abs(derivative);
    const alpha = smoothingAlpha(cutoff, dtSeconds);
    const filtered = this.lastValue + alpha * (value - this.lastValue);

    this.lastValue = filtered;
    this.lastDerivative = derivative;
    this.lastTimeMs = timestampMs;
    return filtered;
  }

  reset(): void {
    this.lastValue = null;
    this.lastDerivative = 0;
    this.lastTimeMs = null;
  }
}

export class OneEuroVec2 {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;

  constructor(minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.fx = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.fy = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  filter(point: Vec2, timestampMs: number): Vec2 {
    return {
      x: this.fx.filter(point.x, timestampMs),
      y: this.fy.filter(point.y, timestampMs),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
  }
}

/** Exponential low-pass between two points. `alpha` is clamped to 0..1. */
export function lowPass(prev: Vec2 | null, next: Vec2, alpha: number): Vec2 {
  const a = Math.min(1, Math.max(0, alpha));
  if (!prev) return next;
  return {
    x: prev.x + (next.x - prev.x) * a,
    y: prev.y + (next.y - prev.y) * a,
  };
}
