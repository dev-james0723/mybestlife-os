import * as THREE from "three";
import type { AdventureState } from "@/lib/garden/adventure";
import type { createAdventureWorld } from "./adventure-world";
import { GARDEN_SWING } from "@/lib/garden/swing";
import { gardenSurfaceRise } from "@/lib/garden/terrain";

type Rig = {
  joint: THREE.Group;
  lower: THREE.Group;
  end: THREE.Group;
  upperLength: number;
  lowerLength: number;
};
type World = ReturnType<typeof createAdventureWorld>;
const down = new THREE.Vector3(0, -1, 0);
const smooth = (a: number, b: number, t: number) => {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

export function createGardenerMotion(world: World) {
  const direction = new THREE.Vector3(),
    pole = new THREE.Vector3(),
    elbow = new THREE.Vector3(),
    lowerDir = new THREE.Vector3(),
    target = new THREE.Vector3(),
    handTarget = new THREE.Vector3(),
    baseHand = new THREE.Vector3(),
    spout = new THREE.Vector3(),
    waterEnd = new THREE.Vector3(),
    reachedHand = new THREE.Vector3(),
    wantedHand = new THREE.Vector3();
  const rotation = new THREE.Quaternion(),
    inverse = new THREE.Quaternion();
  let travel = 0,
    lastX = world.hero.position.x,
    lastZ = world.hero.position.z,
    weight = 0,
    bend = 0;
  function solve(rig: Rig, goal: THREE.Vector3, poleDirection: THREE.Vector3) {
    direction.copy(goal).sub(rig.joint.position);
    const distance = THREE.MathUtils.clamp(
      direction.length(),
      0.02,
      rig.upperLength + rig.lowerLength - 0.002,
    );
    direction.normalize();
    pole
      .copy(poleDirection)
      .addScaledVector(direction, -poleDirection.dot(direction))
      .normalize();
    const along =
      (rig.upperLength ** 2 - rig.lowerLength ** 2 + distance ** 2) /
      (2 * distance);
    const height = Math.sqrt(Math.max(0, rig.upperLength ** 2 - along ** 2));
    elbow.copy(direction).multiplyScalar(along).addScaledVector(pole, height);
    rig.joint.quaternion.setFromUnitVectors(down, elbow.clone().normalize());
    lowerDir.copy(direction).multiplyScalar(distance).sub(elbow).normalize();
    rotation.setFromUnitVectors(down, lowerDir);
    inverse.copy(rig.joint.quaternion).invert();
    rig.lower.quaternion.copy(inverse).multiply(rotation);
    rig.end.quaternion.copy(rotation).invert();
  }
  const armPole = [
      new THREE.Vector3(-1, 0, -0.4),
      new THREE.Vector3(1, 0, -0.4),
    ],
    legPole = new THREE.Vector3(0, 0, 1);
  return {
    update(state: AdventureState, dt: number, reduced: boolean) {
      const distance = Math.hypot(
        state.player.x - lastX,
        state.player.z - lastZ,
      );
      lastX = state.player.x;
      lastZ = state.player.z;
      if (distance < 1) travel += distance;
      const speed = Math.hypot(state.player.vx, state.player.vz),
        moving = distance > 0.0001 && speed > 0.08;
      const blend = reduced ? 1 : 1 - Math.exp(-dt * 18);
      world.upperBody.position.z = 0;
      const riding = ["riding", "stopping", "dismounting"].includes(state.swing.mode);
      world.swingPivot.rotation.x = reduced ? 0 : state.swing.angle;
      if (riding) {
        const sit = smooth(0, 1, state.swing.seated);
        // The seat, both ropes and rider share the same pivot transform.
        // Hips rest 0.10 above the board; ankles hang clear of the ground.
        target.set(0, -GARDEN_SWING.length - 0.45, 0);
        world.swingPivot.localToWorld(target);
        world.hero.position.set(state.player.x, 0.015, state.swing.mode === "dismounting" ? GARDEN_SWING.entryZ : state.player.z).lerp(target, sit);
        world.hero.rotation.set((reduced ? 0 : state.swing.angle) * sit, 0, 0);
        world.upperBody.rotation.set(0, 0, 0);
        world.head.rotation.x = 0;
        for (let i = 0; i < 2; i++) {
          target.set(i === 0 ? -0.15 : 0.15, THREE.MathUtils.lerp(0.1, 0.30, sit), 0.23 * sit);
          solve(world.legRigs[i], target, legPole);
          // Arm targets are relative to upperBody. Both hands wrap the ropes.
          target.set((i === 0 ? -1 : 1) * GARDEN_SWING.seatHalfWidth, 0.49, 0);
          baseHand.set((i === 0 ? -1 : 1) * 0.36, 0.04, 0).lerp(target, sit);
          solve(world.armRigs[i], baseHand, armPole[i]);
        }
        world.can.visible = world.stream.visible = false;
        world.hero.updateMatrixWorld(true);
        return { action: "swing", progress: state.swing.seated, contact: sit === 1, handError: 0, travel };
      }
      weight = THREE.MathUtils.lerp(weight, moving ? 1 : 0, blend);
      const action =
        state.action && !state.action.approaching ? state.action : null;
      const p = action ? action.elapsed / action.duration : 0;
      const reach = action
        ? smooth(0.06, 0.46, p) * (1 - smooth(0.72, 1, p))
        : 0;
      const groundAction =
        action && ["plant", "harvest", "forage"].includes(action.pose);
      const crouch =
        action?.pose === "plant"
          ? 0.22
          : action?.pose === "forage"
            ? 0.19
            : action?.pose === "harvest"
              ? 0.08
              : 0;
      const forwardBend =
        action?.pose === "plant" ? 1.1 : action?.pose === "forage" ? 1.02 : 0.6;
      bend = THREE.MathUtils.lerp(
        bend,
        groundAction
          ? forwardBend * reach
          : action?.pose === "water"
            ? 0.18 * reach
            : action?.pose === "shelter"
              ? 0.12 * reach
              : 0,
        blend,
      );
      world.hero.position.set(
        state.player.x,
        0.015 - crouch * reach,
        state.player.z,
      );
      const turn = Math.atan2(
        Math.sin(state.player.facing - world.hero.rotation.y),
        Math.cos(state.player.facing - world.hero.rotation.y),
      );
      world.hero.rotation.y += turn * blend;
      world.hero.rotation.x = 0;
      world.upperBody.rotation.x = bend;
      // Lean from the hips to reach the stems while both feet stay outside the
      // raised timber. The shirt still overlaps the hips at this small offset.
      world.upperBody.position.z = groundAction && action.target.kind === "bed" ? 0.22 * reach : 0;
      world.upperBody.rotation.z = reduced
        ? 0
        : Math.sin((travel / 0.82) * Math.PI * 2) * 0.022 * weight;
      world.head.rotation.x = -bend * 0.35;
      // Distance-driven alternating stance/swing; feet stay level through the knee solution.
      for (let i = 0; i < 2; i++) {
        const cycle = (((travel / 0.82 + i * 0.5) % 1) + 1) % 1;
        const stance = cycle < 0.62,
          swing = (cycle - 0.62) / 0.38;
        const z = stance
          ? 0.2 - (cycle / 0.62) * 0.4
          : -0.2 + smooth(0, 1, swing) * 0.4;
        const y = stance ? 0 : Math.sin(swing * Math.PI) * 0.1;
        target.set(
          i === 0 ? -0.15 : 0.15,
          0.1 + y * weight + crouch * reach,
          z * weight - (groundAction ? 0.08 : 0) * reach,
        );
        const cosine = Math.cos(world.hero.rotation.y), sine = Math.sin(world.hero.rotation.y);
        target.y += gardenSurfaceRise(
          state.player.x + target.x * cosine + target.z * sine,
          state.player.z - target.x * sine + target.z * cosine,
          world.pathStones,
        );
        solve(world.legRigs[i], target, legPole);
      }
      world.hero.updateMatrixWorld(true);
      let handError = 0;
      for (let i = 0; i < 2; i++) {
        const side = i === 0 ? -1 : 1;
        baseHand.set(
          side * 0.36,
          0.04,
          Math.sin((travel / 0.82) * Math.PI * 2 + i * Math.PI) * 0.1 * weight,
        );
        target.copy(baseHand);
        if (action) {
          const kind = action.pose;
          if (kind === "plant" || kind === "forage" || kind === "harvest") {
            const forage =
              action.target.kind === "forage"
                ? state.forage[Number(action.target.id)]
                : null;
            const y =
              kind === "harvest"
                ? 0.76
                : forage?.kind === "mushroom"
                  ? 0.45
                  : forage?.kind === "berry"
                    ? 0.33
                    : 0.26;
            handTarget.set(action.target.point.x, y, action.target.point.z);
            if (action.target.kind === "bed") {
              // Reach the nearest planted stem/soil patch, not empty space at bed centre.
              world.armRigs[i].joint.getWorldPosition(reachedHand);
              let nearest = Infinity;
              for (const x of [-0.4, 0.4])
                for (const z of [-0.32, 0.32]) {
                  const d = Math.hypot(
                    action.target.point.x + x - reachedHand.x,
                    action.target.point.z + z - reachedHand.z,
                  );
                  if (d < nearest) {
                    nearest = d;
                    handTarget.set(
                      action.target.point.x + x,
                      y,
                      action.target.point.z + z,
                    );
                  }
                }
            } else
              handTarget.addScaledVector(
                new THREE.Vector3(
                  Math.cos(world.hero.rotation.y),
                  0,
                  -Math.sin(world.hero.rotation.y),
                ),
                side * 0.1,
              );
          } else if (kind === "water" || kind === "refill") {
            const forward = new THREE.Vector3(
              Math.sin(world.hero.rotation.y),
              0,
              Math.cos(world.hero.rotation.y),
            );
            handTarget
              .set(action.target.point.x, 0.74, action.target.point.z)
              .addScaledVector(forward, -0.36);
            if (i === 0)
              handTarget.addScaledVector(
                new THREE.Vector3(forward.z, 0, -forward.x),
                -0.18,
              );
          } else if (kind === "shelter") {
            handTarget.set(action.target.point.x, 0.95, action.target.point.z);
          } else if (kind === "deliver") {
            handTarget.set(
              action.target.point.x + side * 0.18,
              0.64,
              action.target.point.z,
            );
          } else {
            handTarget.set(
              state.player.x +
                Math.sin(state.player.facing) * 0.32 +
                side * 0.18,
              kind === "greet" ? 1.2 : 0.9,
              state.player.z + Math.cos(state.player.facing) * 0.35,
            );
          }
          world.upperBody.worldToLocal(handTarget);
          target.lerp(handTarget, reach * (i === 0 && groundAction ? 0.6 : 1));
        }
        solve(world.armRigs[i], target, armPole[i]);
        if (i === 1 && action && groundAction) {
          world.hero.updateMatrixWorld(true);
          world.armRigs[i].end.getWorldPosition(reachedHand);
          wantedHand.copy(target);
          world.upperBody.localToWorld(wantedHand);
          handError = reachedHand.distanceTo(wantedHand);
        }
      }
      world.hero.updateMatrixWorld(true);
      world.can.visible =
        !!action && (action.pose === "water" || action.pose === "refill");
      world.stream.visible =
        !!action && action.pose === "water" && p > 0.31 && p < 0.7;
      if (world.can.visible) {
        world.armRigs[1].end.getWorldPosition(handTarget);
        world.can.position.copy(handTarget).add(new THREE.Vector3(0, -0.17, 0));
        world.can.rotation.set(
          0,
          world.hero.rotation.y - Math.PI / 2,
          -0.42 * reach,
        );
        world.can.updateMatrixWorld(true);
        if (world.stream.visible && action) {
          world.spout.getWorldPosition(spout);
          waterEnd.set(action.target.point.x, 0.13, action.target.point.z);
          direction.copy(waterEnd).sub(spout);
          world.stream.position.copy(spout);
          world.stream.quaternion.setFromUnitVectors(
            down,
            direction.clone().normalize(),
          );
          world.stream.scale.set(1, direction.length() / 0.72, 1);
        }
      }
      return {
        action: action?.pose ?? (moving ? "walk" : "idle"),
        progress: p,
        contact: !!action?.committed,
        handError,
        travel,
      };
    },
  };
}
