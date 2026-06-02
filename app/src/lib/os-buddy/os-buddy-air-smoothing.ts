import type { OSBuddyAirControlPoint } from "./os-buddy-air-control-types";

export function smoothAirControlPoint(params: {
  previous: OSBuddyAirControlPoint | null;
  next: OSBuddyAirControlPoint;
  alpha: number;
}) {
  const alpha = Math.min(1, Math.max(0, params.alpha));
  if (!params.previous) return params.next;
  return {
    x: params.previous.x + (params.next.x - params.previous.x) * alpha,
    y: params.previous.y + (params.next.y - params.previous.y) * alpha,
  };
}

export class OSBuddyAirPointSmoother {
  private current: OSBuddyAirControlPoint | null = null;

  constructor(private readonly alpha = 0.34) {}

  update(next: OSBuddyAirControlPoint) {
    this.current = smoothAirControlPoint({
      previous: this.current,
      next,
      alpha: this.alpha,
    });
    return this.current;
  }

  reset() {
    this.current = null;
  }
}

export class OSBuddyAirStableValue<T> {
  private stable: T | null = null;
  private candidate: T | null = null;
  private candidateSince = 0;

  constructor(private readonly settleMs = 120) {}

  update(next: T | null, now: number) {
    if (next === this.stable) {
      this.candidate = null;
      this.candidateSince = 0;
      return this.stable;
    }

    if (next !== this.candidate) {
      this.candidate = next;
      this.candidateSince = now;
      return this.stable;
    }

    if (now - this.candidateSince >= this.settleMs) {
      this.stable = next;
      this.candidate = null;
      this.candidateSince = 0;
    }

    return this.stable;
  }

  reset() {
    this.stable = null;
    this.candidate = null;
    this.candidateSince = 0;
  }
}
