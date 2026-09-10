import { describe, expect, it } from "vitest";
import { assessPond, createStarterPond, pondCommandSchema, pondLayoutKey, pondNeighbours,
  previewPondPlacement, tracePondRoute, type PondObject } from "./pond";

describe("persistent pond spatial rules", () => {
  it("offers an immediately playable route with a bend and no life reward", () => {
    const world = createStarterPond();
    expect(assessPond(world.objects).dawnfish).toBe(true);
    expect(tracePondRoute([1, 3, 11], world.objects).ok).toBe(true);
    expect(world.objects).toHaveLength(4);
  });
  it("does not wrap a shoreline onto the next row or connect diagonally", () => {
    expect(pondNeighbours(3)).not.toContain(4);
    const objects = Array.from({ length: 12 }, (_, slot) => ({ id: `r${slot}`, kind: "stone" as const, slot, rotation: 0, grant_id: null })).filter((o) => ![0, 5, 10].includes(o.slot));
    expect(assessPond(objects).largestOpenWater).toBe(1);
    expect(tracePondRoute([0, 5, 10], objects).reason).toBe("blocked");
  });
  it("requires adjacent reeds and water, then a separate combination for dragonflies", () => {
    let world = createStarterPond();
    expect(assessPond(world.objects).leafsnail).toBe(false);
    world = previewPondPlacement(world, "starter-reed-2", 1, 0);
    world = previewPondPlacement(world, "starter-leaf", 4, 0);
    world.objects.push({ id: "earned-perch", kind: "perch", slot: 3, rotation: 0, grant_id: null });
    expect(assessPond(world.objects).leafsnail).toBe(true);
    expect(assessPond(world.objects).dragonfly).toBe(false);
    expect(assessPond(world.objects, ["dawnfish", "leafsnail"]).dragonfly).toBe(true);
  });
  it("rejects occupied or forged placements without changing ownership or discoveries", () => {
    const world = createStarterPond(); world.discoveries = ["dawnfish", "leafsnail"];
    expect(() => previewPondPlacement(world, "starter-reed-2", 5, 0)).toThrow("occupied");
    expect(() => previewPondPlacement(world, "other-account-object", 1, 0)).toThrow("not owned");
    expect(() => previewPondPlacement(world, "starter-reed-1", 20, 0)).toThrow("position");
    const stored = previewPondPlacement(world, "starter-reed-1", null, 0);
    expect(stored.discoveries).toEqual(world.discoveries);
    expect(stored.objects).toHaveLength(4);
    expect(world.objects[0].slot).toBe(0);
  });
  it("distinguishes spatial solutions from renaming identical objects", () => {
    const world = createStarterPond();
    expect(pondLayoutKey(world.objects)).toBe(pondLayoutKey(world.objects.map((o) => ({ ...o, id: `copy-${o.id}` }))));
    expect(pondLayoutKey(world.objects)).not.toBe(pondLayoutKey(previewPondPlacement(world, "starter-stone", 5, 1).objects));
  });
  it("allows two different valid layouts and rejects meaningless ripple sequences", () => {
    const first = createStarterPond();
    const second = previewPondPlacement(previewPondPlacement(first, "starter-stone", 6, 2), "starter-reed-2", 4, 0);
    expect(assessPond(first.objects).dawnfish && assessPond(second.objects).dawnfish).toBe(true);
    expect(tracePondRoute([1, 1, 3], first.objects).reason).toBe("three-ripples");
    expect(tracePondRoute([1, 2, 3], first.objects).reason).toBe("try-a-bend");
    expect(tracePondRoute([1, 5, 11], first.objects).reason).toBe("blocked");
  });
  it("changing a stone's direction affects routing when two paths are available", () => {
    const objects: PondObject[] = [{ id: "stone", kind: "stone", slot: 5, rotation: 0, grant_id: null }];
    const north = tracePondRoute([6, 3, 0], objects);
    const east = tracePondRoute([6, 3, 0], [{ ...objects[0], rotation: 1 }]);
    expect(north.path).not.toEqual(east.path);
  });
  it("validates the command boundary instead of accepting a client-created world", () => {
    expect(pondCommandSchema.safeParse({ kind: "move", object_id: "x", slot: 0, rotation: 0, discoveries: ["dragonfly"] }).success).toBe(false);
    expect(pondCommandSchema.safeParse({ kind: "build", grant_id: "fake", recipe: "reed", slot: 0, rotation: 0 }).success).toBe(false);
    expect(pondCommandSchema.safeParse({ kind: "observe", species: "dawnfish", anchors: [0, 1, 12] }).success).toBe(false);
  });
});
