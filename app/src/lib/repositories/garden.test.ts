import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  user: "user-1" as string | null,
  garden: {} as Record<string, unknown>,
  log: {} as Record<string, unknown>,
  failLog: false,
  failUpdate: false,
  growthWrites: 0,
}));
vi.mock("@/lib/supabase/client", () => {
  class Query {
    filters: [string, unknown][] = [];
    operation = "read";
    payload: Record<string, unknown> = {};
    constructor(public table: string) {}
    select() { return this; }
    eq(key: string, value: unknown) { this.filters.push([key, value]); return this; }
    is(key: string, value: unknown) { return this.eq(key, value); }
    update(payload: Record<string, unknown>) { this.operation = "update"; this.payload = payload; return this; }
    upsert(payload: Record<string, unknown>) { this.operation = "upsert"; this.payload = payload; return this; }
    execute() {
      if (this.table === "garden_daily_log") {
        if (fixture.failLog) { fixture.failLog = false; return { data: null, error: new Error("Log unavailable") }; }
        fixture.log = { ...fixture.log, ...this.payload }; return { data: null, error: null };
      }
      if (this.operation === "update") {
        if (fixture.failUpdate) return { data: null, error: new Error("Update unavailable") };
        if (!this.filters.every(([key, value]) => fixture.garden[key] === value)) return { data: null, error: null };
        fixture.garden = { ...fixture.garden, ...this.payload }; fixture.growthWrites++;
      }
      return { data: { ...fixture.garden }, error: null };
    }
    single() { return Promise.resolve(this.execute()); }
    maybeSingle() { return Promise.resolve(this.execute()); }
    then(resolve: (result: ReturnType<Query["execute"]>) => unknown, reject: (error: unknown) => unknown) { return Promise.resolve(this.execute()).then(resolve, reject); }
  }
  return { createClient: () => ({ auth: { getUser: async () => ({ data: { user: fixture.user ? { id: fixture.user } : null } }) }, from: (table: string) => new Query(table) }) };
});

import { gardenRepository, getPlantBloomDays } from "./garden";
describe("garden care persistence", () => {
  beforeEach(() => {
    fixture.user = "user-1"; fixture.failLog = false; fixture.failUpdate = false; fixture.growthWrites = 0; fixture.log = {};
    fixture.garden = { id: "plant-1", user_id: "user-1", plant_type: "grass", growth_stage: 1, growth_points: 0, streak_days: 0, last_watered_at: null, is_wilted: true };
  });
  it("saves one care action and its daily record", async () => {
    const result = await gardenRepository.waterPlant();
    expect(result.growth_points).toBe(1); expect(result.is_wilted).toBe(false);
    expect(fixture.log.watered).toBe(true); expect(fixture.growthWrites).toBe(1);
  });
  it("simultaneous device requests cannot award two increments", async () => {
    await Promise.all([gardenRepository.waterPlant(), gardenRepository.waterPlant()]);
    expect(fixture.garden.growth_points).toBe(1); expect(fixture.growthWrites).toBe(1);
  });
  it("repairs a failed daily log on retry without adding duplicate growth", async () => {
    fixture.failLog = true;
    await expect(gardenRepository.waterPlant()).rejects.toThrow("Log unavailable");
    expect(fixture.garden.growth_points).toBe(1); expect(fixture.log.watered).toBeUndefined();
    await gardenRepository.waterPlant();
    expect(fixture.garden.growth_points).toBe(1); expect(fixture.log.watered).toBe(true); expect(fixture.growthWrites).toBe(1);
  });
  it("a failed growth save does not record completed care", async () => {
    fixture.failUpdate = true;
    await expect(gardenRepository.waterPlant()).rejects.toThrow("Update unavailable");
    expect(fixture.garden.growth_points).toBe(0); expect(fixture.log.watered).toBeUndefined();
  });
  it("requires authentication and does not grow a fully bloomed plant", async () => {
    fixture.user = null;
    await expect(gardenRepository.waterPlant()).rejects.toThrow("Not authenticated");
    fixture.user = "user-1"; fixture.garden.growth_stage = 5;
    await gardenRepository.waterPlant(); expect(fixture.growthWrites).toBe(0);
  });
  it("shows bloom estimates that match consecutive care rules", () => {
    expect(getPlantBloomDays("grass")).toBe(7); expect(getPlantBloomDays("sunflower")).toBe(11);
    expect(getPlantBloomDays("apple_tree")).toBe(21);
  });
});
