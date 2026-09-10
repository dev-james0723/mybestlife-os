import * as THREE from "three";
import type { createAdventureWorld } from "./adventure-world";
import { gardenSurfaceRise } from "@/lib/garden/terrain";

export function createPetMotion(world: ReturnType<typeof createAdventureWorld>) {
  let travel = 0, weight = 0;
  const down = new THREE.Vector3(0, -1, 0), direction = new THREE.Vector3();
  const elbow = new THREE.Vector3(), pole = new THREE.Vector3(), lowerRotation = new THREE.Quaternion();
  return {
    update(distance: number, dt: number, reduced: boolean) {
      const moving = distance > 0.0001 && distance < 1;
      if (moving) travel += distance / world.buddy.scale.x;
      weight = THREE.MathUtils.lerp(weight, moving ? 1 : 0, 1 - Math.exp(-dt * 18));
      for (const rig of world.buddyLegs) {
        // Diagonal trot. During stance the paw travels backwards at precisely
        // the body's forward speed, then lifts and returns during recovery.
        const cycle = (travel / 0.56 + (rig.side === rig.end ? 0 : 0.5)) % 1;
        const stance = cycle < 0.62, t = (cycle - 0.62) / 0.38;
        const z = stance ? 0.1736 - cycle * 0.56 : -0.1736 + (t * t * (3 - 2 * t)) * 0.3472;
        const cosine = Math.cos(world.buddy.rotation.y), sine = Math.sin(world.buddy.rotation.y), scale = world.buddy.scale.x;
        const localZ = rig.joint.position.z + z * weight;
        const surface = gardenSurfaceRise(
          world.buddy.position.x + (rig.joint.position.x * cosine + localZ * sine) * scale,
          world.buddy.position.z + (-rig.joint.position.x * sine + localZ * cosine) * scale,
          world.pathStones,
        );
        const y = 0.09 + surface / scale + (stance ? 0 : Math.sin(t * Math.PI) * 0.095) * weight;
        direction.set(0, y - rig.joint.position.y, z * weight);
        const reach = Math.min(0.398, direction.length());
        direction.normalize();
        pole.set(0, 0, rig.end > 0 ? 1 : -1).addScaledVector(direction, -direction.z * (rig.end > 0 ? 1 : -1)).normalize();
        elbow.copy(direction).multiplyScalar(reach / 2).addScaledVector(pole, Math.sqrt(0.04 - reach * reach / 4));
        rig.joint.quaternion.setFromUnitVectors(down, elbow.clone().normalize());
        lowerRotation.setFromUnitVectors(down, direction.clone().multiplyScalar(reach).sub(elbow).normalize());
        rig.lower.quaternion.copy(rig.joint.quaternion).invert().multiply(lowerRotation);
        rig.paw.quaternion.copy(lowerRotation).invert();
      }
      world.buddyBody.position.y = 0.5 + (reduced ? 0 : Math.sin(travel / 0.56 * Math.PI * 4) * 0.006 * weight);
      return { moving, travel, legs: world.buddyLegs.map((r) => r.joint.rotation.x) };
    },
  };
}
