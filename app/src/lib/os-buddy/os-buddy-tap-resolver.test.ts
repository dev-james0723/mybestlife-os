import { describe, expect, it } from "vitest";
import {
  resolveOSBuddyTapSequence,
  type OSBuddyTapResolverOptions,
  type OSBuddyTapSequence,
} from "./os-buddy-tap-resolver";

const options: OSBuddyTapResolverOptions = {
  tapWindowMs: 320,
  maxDistancePx: 24,
  tripleTapGraceMs: 360,
  quadTapGraceMs: 360,
};

function tap(previous: OSBuddyTapSequence | null, at: number) {
  return resolveOSBuddyTapSequence({
    previous,
    tap: { at, x: 100, y: 100, pointerType: "mouse" },
    options,
  });
}

describe("OS Buddy tap resolver", () => {
  it("keeps single tap pending until the double-tap window expires", () => {
    const result = tap(null, 1_000);

    expect(result).toMatchObject({
      kind: "pending",
      action: "single",
      delayMs: 320,
      sequence: { count: 1 },
    });
  });

  it("keeps double tap pending so a third tap can still win", () => {
    const first = tap(null, 1_000);
    expect(first.kind).toBe("pending");

    const second = tap(first.kind === "pending" ? first.sequence : null, 1_180);

    expect(second).toMatchObject({
      kind: "pending",
      action: "double",
      delayMs: 360,
      sequence: { count: 2 },
    });
  });

  it("keeps triple tap pending so a fourth tap can take priority", () => {
    const first = tap(null, 1_000);
    const second = tap(first.kind === "pending" ? first.sequence : null, 1_160);
    const third = tap(second.kind === "pending" ? second.sequence : null, 1_300);

    expect(third).toMatchObject({
      kind: "pending",
      action: "triple",
      delayMs: 360,
      sequence: { count: 3 },
    });
  });

  it("triggers quad immediately before triple tap can resolve", () => {
    const first = tap(null, 1_000);
    const second = tap(first.kind === "pending" ? first.sequence : null, 1_140);
    const third = tap(second.kind === "pending" ? second.sequence : null, 1_260);
    const fourth = tap(third.kind === "pending" ? third.sequence : null, 1_390);

    expect(fourth).toEqual({
      kind: "trigger",
      action: "quad",
      sequence: null,
    });
  });
});
