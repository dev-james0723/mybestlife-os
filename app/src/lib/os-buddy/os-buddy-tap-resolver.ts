export type OSBuddyTapPointerType = "mouse" | "pen" | "touch" | string;

export type OSBuddyTapSequence = {
  at: number;
  x: number;
  y: number;
  count: number;
  pointerType: OSBuddyTapPointerType;
};

export type OSBuddyTapAction = "single" | "double" | "triple" | "quad";

export type OSBuddyTapResolverOptions = {
  tapWindowMs: number;
  maxDistancePx: number;
  tripleTapGraceMs: number;
  quadTapGraceMs: number;
};

export type OSBuddyTapResolution =
  | {
      kind: "pending";
      action: Exclude<OSBuddyTapAction, "quad">;
      delayMs: number;
      sequence: OSBuddyTapSequence;
    }
  | {
      kind: "trigger";
      action: "quad";
      sequence: null;
    };

export function resolveOSBuddyTapSequence(params: {
  previous: OSBuddyTapSequence | null;
  tap: {
    at: number;
    x: number;
    y: number;
    pointerType: OSBuddyTapPointerType;
  };
  options: OSBuddyTapResolverOptions;
}): OSBuddyTapResolution {
  const { previous, tap, options } = params;
  const continuesTapSequence =
    previous != null &&
    tap.at - previous.at <= options.tapWindowMs &&
    Math.hypot(tap.x - previous.x, tap.y - previous.y) <= options.maxDistancePx;
  const nextCount = continuesTapSequence ? previous.count + 1 : 1;

  if (nextCount >= 4) {
    return {
      kind: "trigger",
      action: "quad",
      sequence: null,
    };
  }

  const sequence: OSBuddyTapSequence = {
    at: tap.at,
    x: tap.x,
    y: tap.y,
    count: nextCount,
    pointerType: tap.pointerType,
  };

  if (nextCount === 3) {
    return {
      kind: "pending",
      action: "triple",
      delayMs: options.quadTapGraceMs,
      sequence,
    };
  }

  if (nextCount === 2) {
    return {
      kind: "pending",
      action: "double",
      delayMs: options.tripleTapGraceMs,
      sequence,
    };
  }

  return {
    kind: "pending",
    action: "single",
    delayMs: options.tapWindowMs,
    sequence,
  };
}
