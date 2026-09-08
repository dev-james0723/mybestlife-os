import { describe, expect, it } from "vitest";
import { boundPoint, createGardenRound, dayBefore, distance, gardenDay, gardenMedal, gardenSnapshot, stepGarden, type GardenRound } from "./game";

function visit(round: GardenRound, target: { x: number; z: number }) {
  round.target = { ...target };
  for (let frame = 0; frame < 600 && round.target && round.phase === "playing"; frame++) stepGarden(round, 1 / 60);
}
function finish(round: GardenRound) {
  round.phase = "playing";
  for (let turn = 0; turn < 20 && round.phase === "playing"; turn++) {
    const candidates = round.dew >= 2 ? round.beds.filter(b => !b.bloomed) : round.drops.filter(d => !d.collected);
    const target = [...candidates].sort((a, b) => distance(a, round.player) - distance(b, round.player))[0];
    if (!target) break;
    visit(round, target);
  }
}
describe("daily garden adventure", () => {
  it("keeps a day's route stable and changes it on other days", () => {
    expect(createGardenRound("2026-09-07")).toEqual(createGardenRound("2026-09-07"));
    expect(createGardenRound("2026-09-07").drops).not.toEqual(createGardenRound("2026-09-08").drops);
  });
  it("uses the same UTC day and handles month, year and leap boundaries", () => {
    expect(gardenDay(new Date("2026-09-07T20:01:00-04:00"))).toBe("2026-09-08");
    expect(dayBefore("2026-01-01")).toBe("2025-12-31");
    expect(dayBefore("2024-03-01")).toBe("2024-02-29");
  });
  it("is completable without a boost across 365 daily routes", () => {
    let slowest = 0;
    for (let day = 0; day < 365; day++) {
      const round = createGardenRound(dayBefore("2026-12-31", day), "challenge");
      finish(round);
      expect(round.phase, round.day).toBe("won");
      expect(round.beds.every(b => b.bloomed)).toBe(true);
      expect(round.dew).toBeGreaterThanOrEqual(0);
      slowest = Math.max(slowest, round.elapsed);
    }
    expect(slowest).toBeLessThan(60);
  });
  it("caps the can, leaves uncollected drops and prevents repeat scoring", () => {
    const round = createGardenRound("2026-09-07"); round.phase = "playing";
    round.dew = 3; round.player = { ...round.drops[0] }; stepGarden(round, 0.01);
    expect(round.drops[0].collected).toBe(false); expect(round.dew).toBe(3);
    round.player = { ...round.beds[0] }; stepGarden(round, 0.01);
    expect(round.dew).toBe(1); expect(round.beds[0].bloomed).toBe(true);
    stepGarden(round, 0.01); expect(round.dew).toBe(1);
  });
  it("pause freezes time and target motion; timeout can continue relaxed without losing blooms", () => {
    const round = createGardenRound("2026-09-07", "challenge"); round.phase = "paused";
    const before = gardenSnapshot(round); stepGarden(round, 3); expect(round).toEqual(before);
    round.phase = "playing"; round.elapsed = 89.99; round.beds[0].bloomed = true;
    stepGarden(round, 0.05); expect(round.phase).toBe("timeout");
    round.mode = "relaxed"; round.phase = "playing"; stepGarden(round, 0.05);
    expect(round.phase).toBe("playing"); expect(round.beds[0].bloomed).toBe(true);
  });
  it("bounds movement and clamps a long background delta", () => {
    const p = boundPoint({ x: 999, z: -999 }); expect(Math.hypot(p.x / 4.55, p.z / 3.6)).toBeCloseTo(1);
    const round = createGardenRound("2026-09-07"); round.phase = "playing";
    stepGarden(round, 30, { x: 1, z: 0 }); expect(round.elapsed).toBe(0.05); expect(round.player.x).toBeLessThan(0.2);
  });
  it("the button destination route and movement produce the same reward with bounded life boosts", () => {
    const round = createGardenRound("2026-09-07", "relaxed", 999); expect(round.dew).toBe(2);
    finish(round); expect(round.phase).toBe("won"); expect(gardenMedal(round)).toBe(1);
    const finished = gardenSnapshot(round); stepGarden(round, 1); expect(round).toEqual(finished);
  });
});
