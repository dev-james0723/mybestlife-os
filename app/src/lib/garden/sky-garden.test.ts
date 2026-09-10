import { describe, it, expect } from "vitest";
import {
  createAdventure,
  stepAdventure,
  interactAdventure,
  SHELTER,
  RAIN_BARREL,
  BED_SPOTS,
} from "./adventure";
import {
  defaultGardenPresentation,
  normalizeGardenPresentation,
  sampleGardenAtmosphere,
  gardenWeatherInvitation,
} from "./presentation";
import { validateGardenPetGlb } from "./pets";
const idle = { x: 0, z: 0, yaw: 0 };
function advance(s: ReturnType<typeof createAdventure>, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) stepAdventure(s, 1 / 60, idle);
}
function complete(s: ReturnType<typeof createAdventure>) {
  for (let i = 0; i < 180 && s.action; i++) stepAdventure(s, 1 / 60, idle);
  expect(s.action).toBeNull();
}
function glb(doc: object) {
  const data = new TextEncoder().encode(JSON.stringify(doc)),
    length = Math.ceil(data.length / 4) * 4,
    bytes = new Uint8Array(length + 20);
  bytes.fill(32, 20);
  bytes.set(data, 20);
  const v = new DataView(bytes.buffer);
  v.setUint32(0, 0x46546c67, true);
  v.setUint32(4, 2, true);
  v.setUint32(8, bytes.length, true);
  v.setUint32(12, length, true);
  v.setUint32(16, 0x4e4f534a, true);
  return bytes;
}
describe("Sky Garden interaction contracts", () => {
  it("gives no early reward and movement cancels an unfinished reach", () => {
    const s = createAdventure();
    s.phase = "playing";
    Object.assign(s.player, { x: BED_SPOTS[0].x, z: BED_SPOTS[0].z + 0.9 });
    interactAdventure(s);
    advance(s, 0.2);
    expect(s.earned).toEqual([]);
    stepAdventure(s, 1 / 60, { x: 1, z: 0, yaw: 0 });
    expect(s.action).toBeNull();
    expect(s.beds[0].stage).toBe("empty");
    Object.assign(s.player, {
      x: BED_SPOTS[0].x,
      z: BED_SPOTS[0].z + 0.72,
      vx: 0,
      vz: 0,
    });
    interactAdventure(s);
    advance(s, 0.5);
    expect(s.earned).toEqual([]);
    complete(s);
    expect(s.earned).toEqual(["plant:0"]);
  });
  it("makes rain care optional, pauses accumulation, and never issues account rewards", () => {
    const s = createAdventure();
    s.phase = "playing";
    s.weather = "rain";
    advance(s, 10);
    expect(s.rainReserve).toBeCloseTo(0.5);
    s.phase = "paused";
    advance(s, 50);
    expect(s.rainReserve).toBeCloseTo(0.5);
    s.phase = "playing";
    advance(s, 10);
    Object.assign(s.player, RAIN_BARREL, { vx: 0, vz: 0 });
    s.water = 0;
    interactAdventure(s);
    complete(s);
    expect(s.water).toBe(3);
    expect(s.rainReserve).toBeLessThan(0.1);
    Object.assign(s.player, SHELTER, { vx: 0, vz: 0 });
    interactAdventure(s);
    complete(s);
    expect(s.shelterOpen).toBe(true);
    expect(s.earned).toEqual([]);
    s.weather = "clear";
    advance(s, 30);
    expect(s.beds.every((b) => b.stage === "empty")).toBe(true);
  });
  it("uses the account clock, survives DST and labels previews", () => {
    const prefs = defaultGardenPresentation,
      now = Date.parse("2026-09-08T16:00:00Z");
    expect(
      sampleGardenAtmosphere(now, "America/Indiana/Indianapolis", prefs).hour,
    ).toBe(12);
    expect(sampleGardenAtmosphere(now, "Asia/Hong_Kong", prefs).day).toBe(
      "2026-09-09",
    );
    expect(
      sampleGardenAtmosphere(
        Date.parse("2026-11-01T06:30:00Z"),
        "America/New_York",
        prefs,
      ).hour,
    ).toBe(1.5);
    expect(
      sampleGardenAtmosphere(now, "UTC", { time: "night", weather: "rain" }),
    ).toMatchObject({ night: true, preview: true, weather: "rain" });
    expect(gardenWeatherInvitation("rain", false, false)).toContain(
      "in your garden",
    );
    expect(
      normalizeGardenPresentation({
        hand: "invalid",
        pet: "<script>",
        objectives: false,
      }),
    ).toMatchObject({ hand: "left", pet: "account", objectives: false });
  });
  it("rejects external GLB resources, excessive meshes and malformed headers", () => {
    const doc = {
      asset: { version: "2.0" },
      meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
      accessors: [{ count: 3 }],
      buffers: [{ byteLength: 36 }],
    };
    expect(validateGardenPetGlb(glb(doc)).vertices).toBe(3);
    expect(() =>
      validateGardenPetGlb(
        glb({ ...doc, images: [{ uri: "https://example.com/track.png" }] }),
      ),
    ).toThrow("Embed");
    expect(() =>
      validateGardenPetGlb(glb({ ...doc, accessors: [{ count: 999999 }] })),
    ).toThrow("smaller");
    expect(() => validateGardenPetGlb(new Uint8Array(40))).toThrow("GLB");
  });
});
