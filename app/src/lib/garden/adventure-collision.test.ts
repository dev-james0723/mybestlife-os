import { describe, expect, it } from "vitest";
import { ADVENTURE, BED_SPOTS, BED_FOOTPRINT, SOLID_OBSTACLES, createAdventure, stepAdventure,
  navigateAdventure, interactAdventure, moveAdventure, boundAdventure } from "./adventure";
import { pushOutside } from "./adventure-collision";

const idle = { x: 0, z: 0, yaw: 0 };
function assertClear(point: { x: number; z: number }) {
  for (const obstacle of SOLID_OBSTACLES) {
    const outside = pushOutside(point, obstacle, ADVENTURE.playerRadius - 1e-5);
    expect(Math.hypot(outside.x - point.x, outside.z - point.z)).toBeLessThan(1e-5);
  }
}

describe("Garden physical contacts", () => {
  it("stops walking and repeated dashes at all four sides of every raised bed", () => {
    for (const bed of BED_SPOTS) for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const state = createAdventure("2026-09-08"); state.phase = "playing";
      Object.assign(state.player, { x: bed.x + x * 2.5, z: bed.z + z * 2.5 });
      for (let frame = 0; frame < 180; frame++) {
        stepAdventure(state, 0.05, { x: -x, z: -z, yaw: 0, dash: true });
        assertClear(state.player);
      }
      expect((state.player.x - bed.x) * x + (state.player.z - bed.z) * z)
        .toBeGreaterThan((x ? BED_FOOTPRINT.halfX : BED_FOOTPRINT.halfZ) + ADVENTURE.playerRadius - 1e-4);
    }
  }, 15_000);
  it("does not tunnel through a bed even with a whole-bed movement request", () => {
    const bed = BED_SPOTS[0];
    const p = moveAdventure({ x: bed.x, z: bed.z + 3 }, { x: bed.x, z: bed.z - 3 });
    assertClear(p); expect(p.z).toBeGreaterThan(bed.z + BED_FOOTPRINT.halfZ);
  });
  it("routes a tap around the bed, then plants from outside the timber", () => {
    const bed = BED_SPOTS[0], state = createAdventure("2026-09-08"); state.phase = "playing";
    Object.assign(state.player, { x: bed.x, z: bed.z + 2 });
    navigateAdventure(state, { x: bed.x, z: bed.z - 1.35 });
    expect(state.waypoints.length).toBeGreaterThan(1);
    for (let frame = 0; frame < 1200 && state.target; frame++) {
      stepAdventure(state, 1 / 60, idle); assertClear(state.player);
    }
    expect(state.target).toBeNull();
    interactAdventure(state);
    for (let frame = 0; frame < 240 && state.action; frame++) {
      stepAdventure(state, 1 / 60, idle); assertClear(state.player);
    }
    expect(state.beds[0].stage).toBe("planted"); expect(state.action).toBeNull();
  });
  it("recovers a legacy position inside the flower bed and permits sliding along its edge", () => {
    const bed = BED_SPOTS[0], recovered = boundAdventure(bed); assertClear(recovered);
    const next = moveAdventure(recovered, { x: recovered.x + 0.4, z: recovered.z - 0.1 });
    assertClear(next); expect(next.x).toBeGreaterThan(recovered.x + 0.3);
  });
});
