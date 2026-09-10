import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createAdventureWorld } from "./adventure-world";
import { createPetMotion } from "./pet-motion";
import { createGardenerMotion } from "./gardener-motion";
import { createAdventure, interactAdventure, stepAdventure, navigateAdventure } from "@/lib/garden/adventure";
import { GARDEN_SWING } from "@/lib/garden/swing";

describe("Garden physical contacts", () => {
  let world: ReturnType<typeof createAdventureWorld>;
  beforeAll(() => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    }) }) });
    world = createAdventureWorld(createAdventure(), { dark: false, pet: "doge", buddyEnabled: true,
      plant: "sunflower", stage: 3, collection: [], decoration: "bench", journal: false, habit: false });
  });
  afterAll(() => { world?.dispose(); vi.unstubAllGlobals(); });

  it("leaves a gap between every pair of stone caps, including path junctions", () => {
    expect(world.pathStones.length).toBeGreaterThan(30);
    world.pathStones.forEach((stone, i) => world.pathStones.slice(i + 1).forEach(other => {
      expect(Math.hypot(stone.x - other.x, stone.z - other.z) - stone.radius - other.radius).toBeGreaterThan(0.04);
    }));
    const matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    for (let i = 0; i < world.grass.count; i++) {
      world.grass.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
      world.pathStones.forEach(stone => expect(Math.hypot(position.x - stone.x, position.z - stone.z) - stone.radius).toBeGreaterThan(0.17));
    }
  });

  it("presents solid front faces from all sides and below the island", () => {
    const material = new THREE.MeshBasicMaterial(), hull = new THREE.Mesh(world.islandGeometry, material);
    const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), direction = new THREE.Vector3();
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      origin.set(Math.cos(a) * 30, -2, Math.sin(a) * 30);
      ray.set(origin, direction.set(-origin.x, 0, -origin.z).normalize());
      expect(ray.intersectObject(hull).length).toBeGreaterThan(0);
    }
    ray.set(new THREE.Vector3(0, -15, 0), new THREE.Vector3(0, 1, 0));
    expect(ray.intersectObject(hull)[0]?.distance).toBeLessThan(3);
    material.dispose();
  });

  it("lifts all four paws, keeps stance paws near the ground and plants them while the body advances", () => {
    const motion = createPetMotion(world), point = new THREE.Vector3();
    const ranges = world.buddyLegs.map(() => ({ low: Infinity, high: -Infinity, planted: 0 }));
    const previous = world.buddyLegs.map(() => new THREE.Vector3());
    world.buddy.position.set(0, -0.028, 0); world.buddy.rotation.y = 0;
    for (let frame = 0; frame < 300; frame++) {
      world.buddy.position.z += 1 / 60;
      motion.update(1 / 60, 1 / 60, false);
      world.root.updateMatrixWorld(true);
      world.buddyLegs.forEach((leg, i) => {
        leg.paw.getWorldPosition(point);
        ranges[i].low = Math.min(ranges[i].low, point.y);
        ranges[i].high = Math.max(ranges[i].high, point.y);
        if (frame > 60 && point.y < 0.045 && previous[i].y < 0.045) {
          expect(Math.abs(point.z - previous[i].z)).toBeLessThan(0.006);
          ranges[i].planted++;
        }
        previous[i].copy(point);
      });
    }
    ranges.forEach(r => { expect(r.low - 0.08 * 0.8).toBeCloseTo(-0.02, 4); expect(r.high - r.low).toBeGreaterThan(0.06); expect(r.planted).toBeGreaterThan(50); });
  });

  it("boards, keeps hands on ropes and hips on the seat, pauses, then lands after slowing", () => {
    const state = createAdventure(); state.phase = "playing";
    Object.assign(state.player, { x: GARDEN_SWING.x, z: GARDEN_SWING.entryZ });
    interactAdventure(state);
    const motion = createGardenerMotion(world), seat = new THREE.Vector3(), hand = new THREE.Vector3();
    let maximum = 0, minimum = 0, ridingFrames = 0;
    for (let frame = 0; frame < 900; frame++) {
      stepAdventure(state, 1 / 60, { x: 0, z: 0, yaw: 0 });
      motion.update(state, 1 / 60, false);
      world.root.updateMatrixWorld(true);
      if (state.swing.mode !== "riding" || state.swing.seated < 1) continue;
      maximum = Math.max(maximum, state.swing.angle); minimum = Math.min(minimum, state.swing.angle); ridingFrames++;
      world.hero.getWorldPosition(seat); world.swingPivot.worldToLocal(seat);
      expect(seat.y + 0.45).toBeCloseTo(-GARDEN_SWING.length, 5);
      world.armRigs.forEach((rig, i) => {
        rig.end.getWorldPosition(hand); world.swingPivot.worldToLocal(hand);
        expect(hand.x).toBeCloseTo((i ? 1 : -1) * GARDEN_SWING.seatHalfWidth, 5);
        expect(hand.z).toBeCloseTo(0, 5);
      });
    }
    expect(ridingFrames).toBeGreaterThan(300); expect(maximum).toBeGreaterThan(0.3); expect(minimum).toBeLessThan(-0.3);
    navigateAdventure(state, { x: 0, z: 0 });
    expect(state.target).toBeNull();
    const physicalAngle = state.swing.angle;
    motion.update(state, 1 / 60, true);
    expect(world.swingPivot.rotation.x).toBe(0);
    expect(state.swing.angle).toBe(physicalAngle);
    const angle = state.swing.angle; state.phase = "paused";
    stepAdventure(state, 1, { x: 1, z: 1, yaw: 0, dash: true });
    expect(state.swing.angle).toBe(angle);
    state.phase = "playing"; interactAdventure(state);
    expect(state.swing.mode).toBe("stopping");
    for (let i = 0; i < 1200 && state.swing.mode !== "idle"; i++) stepAdventure(state, 1 / 60, { x: 0, z: 0, yaw: 0 });
    expect(state.swing.mode).toBe("idle");
    expect(state.player.z).toBe(GARDEN_SWING.entryZ);
    expect(state.player.vx).toBe(0);
  });

  it("plants the pet's soles on a stepping stone instead of inside its raised cap", () => {
    const stone = [...world.pathStones].sort((a, b) => b.radius - a.radius)[0];
    world.buddy.position.set(stone.x, -0.028, stone.z);
    world.buddy.rotation.y = stone.yaw;
    createPetMotion(world).update(0, 1 / 60, false);
    world.root.updateMatrixWorld(true);
    const foot = new THREE.Vector3();
    for (const rig of world.buddyLegs) {
      rig.paw.getWorldPosition(foot);
      expect(foot.y - 0.08 * world.buddy.scale.x).toBeCloseTo(0.075, 5);
    }
  });

  it("lets a new walking destination cancel boarding without leaving a stuck swing interaction", () => {
    const state = createAdventure(); state.phase = "playing";
    Object.assign(state.player, { x: GARDEN_SWING.x, z: GARDEN_SWING.entryZ });
    interactAdventure(state); expect(state.swing.mode).toBe("boarding");
    navigateAdventure(state, { x: -7, z: 0 });
    expect(state.swing.mode).toBe("idle");
    expect(state.target).not.toBeNull();
  });
});
