import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_PILOT_PLUS_MODE_CONFIG,
  createAIPilotPlusModeMachineState,
  stepAIPilotPlusModeMachine,
} from "./plus-mode-machine";

function step(params: {
  previous?: ReturnType<typeof createAIPilotPlusModeMachineState>;
  now: number;
  gesture?: "Victory" | "Open_Palm" | "Index_Point" | "Closed_Fist" | "None";
  handCount?: number;
  confidence?: number;
  bothHandsOpen?: boolean;
  active?: boolean;
}) {
  return stepAIPilotPlusModeMachine({
    previous: params.previous ?? createAIPilotPlusModeMachineState(),
    frame: {
      active: params.active ?? true,
      now: params.now,
      gesture: params.gesture ?? "Victory",
      handCount: params.handCount ?? 1,
      confidence: params.confidence ?? 0.92,
      bothHandsOpen: params.bothHandsOpen ?? false,
    },
  });
}

describe("AI Pilot Plus mode machine", () => {
  it("starts a V-sign countdown but does not activate before 2 seconds", () => {
    const result = step({ now: 1_000 });

    expect(result.next.mode).toBe("plusCountdown");
    expect(result.next.countdown.progress).toBe(0);
    expect(result.events).toEqual([{ type: "plus-countdown-started" }]);

    const early = step({
      previous: result.next,
      now: 1_000 + DEFAULT_AI_PILOT_PLUS_MODE_CONFIG.activationHoldMs - 1,
    });
    expect(early.next.mode).toBe("plusCountdown");
    expect(early.events).toEqual([]);
  });

  it("activates after a stable 2-second one-hand V sign", () => {
    const countdown = step({ now: 1_000 });
    const activated = step({
      previous: countdown.next,
      now: 1_000 + DEFAULT_AI_PILOT_PLUS_MODE_CONFIG.activationHoldMs,
    });

    expect(activated.next.mode).toBe("plusActive");
    expect(activated.events).toEqual([{ type: "plus-activated" }]);
  });

  it("cancels countdown when confidence drops, gesture changes, or a second hand appears", () => {
    const countdown = step({ now: 1_000 });

    expect(
      step({ previous: countdown.next, now: 1_200, confidence: 0.4 }).events,
    ).toEqual([{ type: "plus-countdown-cancelled" }]);
    expect(
      step({ previous: countdown.next, now: 1_200, gesture: "Index_Point" }).events,
    ).toEqual([{ type: "plus-countdown-cancelled" }]);
    expect(
      step({ previous: countdown.next, now: 1_200, handCount: 2 }).events,
    ).toEqual([{ type: "plus-countdown-cancelled" }]);
  });

  it("exits Plus mode after both open palms hold for 1.5 seconds", () => {
    const active = {
      ...createAIPilotPlusModeMachineState(),
      mode: "plusActive" as const,
    };
    const exitCountdown = step({
      previous: active,
      now: 4_000,
      gesture: "Open_Palm",
      handCount: 2,
      confidence: 0.9,
      bothHandsOpen: true,
    });
    const exited = step({
      previous: exitCountdown.next,
      now: 4_000 + DEFAULT_AI_PILOT_PLUS_MODE_CONFIG.exitHoldMs,
      gesture: "Open_Palm",
      handCount: 2,
      confidence: 0.9,
      bothHandsOpen: true,
    });

    expect(exitCountdown.next.countdown.kind).toBe("plusExit");
    expect(exitCountdown.events).toEqual([{ type: "plus-exit-countdown-started" }]);
    expect(exited.next.mode).toBe("normal");
    expect(exited.events).toEqual([{ type: "plus-exited" }]);
  });

  it("resets to off when AirPilot is inactive", () => {
    const active = {
      ...createAIPilotPlusModeMachineState(),
      mode: "plusActive" as const,
    };
    const result = step({ previous: active, now: 5_000, active: false });

    expect(result.next.mode).toBe("off");
    expect(result.next.countdown.kind).toBe("inactive");
  });
});
