import { describe, expect, it } from "vitest";
import {
  ADVENTURE,
  ADVENTURE_POND,
  BED_SPOTS,
  HOME,
  WELL,
  adventureDestinations,
  navigateAdventure,
  boundAdventure,
  canDeliver,
  createAdventure,
  interactAdventure,
  restoreAdventureFacts,
  stepAdventure,
  type AdventureState,
} from "./adventure";

const idle = { x: 0, z: 0, yaw: 0 };
function tick(state: AdventureState, seconds = 1) {
  for (let i = 0; i < seconds * 60; i++) stepAdventure(state, 1 / 60, idle);
}
function act(state: AdventureState, point: { x: number; z: number }) {
  Object.assign(state.player, point, { vx: 0, vz: 0 });
  interactAdventure(state);
  for (let frame = 0; frame < 180 && state.action; frame++)
    stepAdventure(state, 1 / 60, idle);
  expect(state.action).toBeNull();
}

describe("Garden adventure", () => {
  it("walks every objective route, including around the pond, without teleporting", () => {
    const state = createAdventure("2026-09-08");
    state.phase = "playing";
    for (const destination of adventureDestinations(state)) {
      navigateAdventure(state, destination.point);
      for (let frame = 0; frame < 20 * 60 && state.target; frame++) {
        const before = { ...state.player };
        stepAdventure(state, 1 / 60, idle);
        expect(
          Math.hypot(state.player.x - before.x, state.player.z - before.z),
        ).toBeLessThan(0.1);
      }
      expect(
        state.target,
        `${destination.kind}:${destination.id} should be reachable`,
      ).toBeNull();
      expect(
        Math.hypot(
          state.player.x - destination.point.x,
          state.player.z - destination.point.z,
        ),
      ).toBeLessThan(0.3);
    }
  });
  it("restores real elapsed growth and does not turn a just-watered plant instantly ripe", () => {
    const state = createAdventure("2026-09-08");
    restoreAdventureFacts(
      state,
      ["plant:0", "water:0"],
      { "water:0": "2026-09-08T10:00:00Z" },
      Date.parse("2026-09-08T10:00:05Z"),
    );
    expect(state.beds[0].stage).toBe("growing");
    expect(state.beds[0].growth).toBe(5);
    restoreAdventureFacts(
      state,
      ["plant:1", "water:1"],
      { "water:1": "2026-09-08T09:00:00Z" },
      Date.parse("2026-09-08T10:00:05Z"),
    );
    expect(state.beds[1].stage).toBe("ripe");
  });
  it("requires deliberate planting, water supply and growing before harvest", () => {
    const state = createAdventure("2026-09-08");
    state.phase = "playing";
    Object.assign(state.player, BED_SPOTS[0]);
    tick(state, 3);
    expect(state.beds[0].stage).toBe("empty");
    act(state, BED_SPOTS[0]);
    expect(state.beds[0].stage).toBe("planted");
    act(state, BED_SPOTS[0]);
    expect(state.beds[0].stage).toBe("growing");
    expect(state.water).toBe(1);
    act(state, BED_SPOTS[0]);
    expect(state.beds[0].stage).toBe("growing");
    tick(state, ADVENTURE.growthSeconds);
    act(state, BED_SPOTS[0]);
    expect(state.beds[0].stage).toBe("harvested");
    expect(state.earned).toEqual(["plant:0", "water:0", "harvest:0"]);
  });
  it("completes a whole expedition without account boosts and cannot double-grant", () => {
    const state = createAdventure();
    state.phase = "playing";
    for (const point of BED_SPOTS) {
      act(state, point);
      act(state, WELL);
      act(state, point);
    }
    tick(state, 17);
    for (const point of BED_SPOTS) act(state, point);
    for (const forage of state.forage.slice(0, 3)) act(state, forage);
    expect(canDeliver(state)).toBe(true);
    act(state, HOME);
    act(state, HOME);
    expect(state.delivered).toBe(true);
    expect(state.earned.filter((a) => a === "deliver")).toHaveLength(1);
  });
  it("moves relative to camera, normalizes diagonal input and stops when paused", () => {
    const a = createAdventure(),
      b = createAdventure();
    a.phase = b.phase = "playing";
    // Compare free movement away from the now-solid delivery crate at spawn.
    Object.assign(a.player, { x: 0, z: 0 });
    Object.assign(b.player, { x: 0, z: 0 });
    for (let i = 0; i < 30; i++) {
      stepAdventure(a, 1 / 60, { ...idle, x: 1 });
      stepAdventure(b, 1 / 60, { x: 1, z: -1, yaw: 0 });
    }
    expect(Math.hypot(a.player.x, a.player.z)).toBeCloseTo(
      Math.hypot(b.player.x, b.player.z),
      3,
    );
    const c = createAdventure();
    c.phase = "playing";
    stepAdventure(c, 0.05, { x: 0, z: -1, yaw: Math.PI / 2 });
    expect(c.player.x).toBeLessThan(0);
    c.phase = "paused";
    const before = { ...c.player };
    stepAdventure(c, 10, { ...idle, x: 1 });
    expect(c.player).toEqual(before);
  });
  it("blocks the pond, bounds travel and caps long frames", () => {
    const p = boundAdventure(ADVENTURE_POND);
    expect(
      Math.hypot(p.x - ADVENTURE_POND.x, p.z - ADVENTURE_POND.z),
    ).toBeGreaterThan(ADVENTURE_POND.radius);
    const edge = boundAdventure({ x: 100, z: 100 });
    expect(
      Math.hypot(edge.x / ADVENTURE.radiusX, edge.z / ADVENTURE.radiusZ),
    ).toBeLessThanOrEqual(1.00001);
    const state = createAdventure();
    state.phase = "playing";
    stepAdventure(state, 100, { ...idle, x: 1 });
    expect(state.elapsed).toBe(0.05);
  });
  it("cancels tool use when moving and offers a renewable refill", () => {
    const state = createAdventure();
    state.phase = "playing";
    Object.assign(state.player, BED_SPOTS[0]);
    interactAdventure(state);
    stepAdventure(state, 1 / 60, { ...idle, x: 1 });
    expect(state.action).toBeNull();
    expect(state.beds[0].stage).toBe("empty");
    state.water = 0;
    act(state, WELL);
    expect(state.water).toBe(3);
  });
  it("makes a timed trail fail and retry without losing garden progress", () => {
    const state = createAdventure();
    state.phase = "playing";
    state.trail.timed = true;
    state.trail.phase = "following";
    state.trail.elapsed = 37.9;
    state.earned = ["plant:0"];
    tick(state, 0.2);
    expect(state.trail.phase).toBe("failed");
    expect(state.earned).toContain("plant:0");
    act(state, { x: -1.7, z: -6.4 });
    expect(state.trail.phase).toBe("following");
    for (const stop of state.trail.stops) act(state, stop);
    expect(state.trail.phase).toBe("won");
    expect(state.earned).toContain("butterfly");
  });
  it("restores and merges independent earned facts without erasing a running garden", () => {
    const state = createAdventure("2026-09-08", [
      "plant:0",
      "water:0",
      "harvest:0",
      "forage:2",
      "discover:pond",
    ]);
    expect(state.beds[0].stage).toBe("harvested");
    expect(state.forage[2].collected).toBe(true);
    restoreAdventureFacts(state, ["plant:1", "water:1", "discover:pond"]);
    expect(state.beds[0].stage).toBe("harvested");
    expect(state.beds[1].stage).toBe("growing");
    expect(state.discoveries).toEqual(["pond"]);
  });
  it("keeps daily resources on valid, reachable ground for 365 seeds", () => {
    for (let day = 0; day < 365; day++) {
      const state = createAdventure(
        new Date(Date.UTC(2026, 0, day + 1)).toISOString().slice(0, 10),
      );
      for (const p of [...state.forage, ...state.trail.stops])
        expect(boundAdventure(p)).toEqual({ x: p.x, z: p.z });
    }
  });
});
