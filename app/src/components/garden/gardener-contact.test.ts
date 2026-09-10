import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { createAdventureWorld } from "./adventure-world";
import { createGardenerMotion } from "./gardener-motion";
import { ADVENTURE, BED_FOOTPRINT, BED_SPOTS, createAdventure, interactAdventure, stepAdventure } from "@/lib/garden/adventure";

describe("Gardener shoulder continuity", () => {
  let world: ReturnType<typeof createAdventureWorld>;
  beforeAll(() => {
    // Geometry validation does not require a renderer. Only the procedural 2D
    // material texture is stubbed; the real torso, IK and limb meshes are used.
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
    }) }) });
    world = createAdventureWorld(createAdventure(), { dark: false, pet: "xiaoba", buddyEnabled: true,
      plant: "sunflower", stage: 3, collection: [], decoration: "none", journal: false, habit: false });
  });
  afterAll(() => { world?.dispose(); vi.unstubAllGlobals(); });
  it("keeps both shoulder joints intersecting the shirt throughout walking, planting and watering", () => {
    const state = createAdventure("2026-09-08"); state.phase = "playing";
    const motion = createGardenerMotion(world), ray = new THREE.Raycaster();
    const origin = new THREE.Vector3(), destination = new THREE.Vector3(), direction = new THREE.Vector3();
    let samples = 0;
    function inspect() {
      motion.update(state, 1 / 60, false); world.root.updateMatrixWorld(true);
      for (const [index, rig] of world.armRigs.entries()) {
        const shoulder = rig.joint.getObjectByName(`gardener-shoulder-${index === 0 ? -1 : 1}`) as THREE.Mesh;
        expect(shoulder).toBeDefined(); expect(shoulder.position.length()).toBe(0);
        rig.joint.getWorldPosition(origin);
        destination.set(0, rig.joint.position.y, 0); world.upperBody.localToWorld(destination);
        ray.set(origin, direction.copy(destination).sub(origin).normalize());
        const contact = ray.intersectObject(world.torso, true)[0];
        expect(contact).toBeDefined();
        expect(contact.distance).toBeLessThan(shoulder.scale.x - 0.005);
        // The spherical cap also overlaps the upper-arm ellipsoid in every pose.
        expect(shoulder.scale.x + 0.092).toBeGreaterThan(0.105);
      }
      samples++;
    }
    for (let i = 0; i < 90; i++) { stepAdventure(state, 1 / 60, { x: 1, z: 0, yaw: 0 }); inspect(); }
    Object.assign(state.player, { x: BED_SPOTS[0].x, z: BED_SPOTS[0].z + 1.3, vx: 0, vz: 0 });
    for (let action = 0; action < 2; action++) {
      interactAdventure(state);
      for (let i = 0; i < 180 && state.action; i++) {
        stepAdventure(state, 1 / 60, { x: 0, z: 0, yaw: 0 }); inspect();
      }
    }
    expect(state.beds[0].stage).toBe("growing"); expect(samples).toBeGreaterThan(180);
  });
  it("reaches the soil and harvest stems from outside every timber face", () => {
    for (const [x, z] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const state = createAdventure("2026-09-08"); state.phase = "playing";
      const bed = state.beds[0], clearance = (x ? BED_FOOTPRINT.halfX : BED_FOOTPRINT.halfZ) + ADVENTURE.playerRadius + 0.01;
      Object.assign(state.player, { x: bed.x + x * clearance, z: bed.z + z * clearance, facing: Math.atan2(-x, -z) });
      const motion = createGardenerMotion(world);
      for (const stage of ["empty", "ripe"] as const) {
        bed.stage = stage;
        interactAdventure(state);
        let contactSamples = 0;
        for (let i = 0; i < 180 && state.action; i++) {
          stepAdventure(state, 1 / 60, { x: 0, z: 0, yaw: 0 });
          const pose = motion.update(state, 1 / 60, false);
          if (pose.progress > 0.52 && pose.progress < 0.70) {
            expect(pose.handError, `${stage} from ${x},${z}`).toBeLessThan(0.14);
            contactSamples++;
          }
        }
        expect(contactSamples).toBeGreaterThan(3);
      }
    }
  });
});
