import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { ADVENTURE_POND } from "@/lib/garden/adventure";
import { assessPond, pondCells, pondLayoutKey, pondPathBetween, type PondObject, type PondWorld } from "@/lib/garden/pond";

export type PondFrame = {
  world: PondWorld | null;
  open: boolean;
  activity: "arrange" | "observe" | "life";
  anchors: number[];
  selectedSlot: number | null;
  ghost: PondObject | null;
  route: number[];
  routeVersion: number;
  onSlot: ((slot: number) => void) | null;
  onRouteComplete?: (version: number) => void;
};
export function createPondFrame(): PondFrame {
  return { world: null, open: false, activity: "arrange", anchors: [], selectedSlot: null, ghost: null, route: [], routeVersion: 0, onSlot: null };
}
export function pondSlotPosition(slot: number) {
  return { x: (slot % 4 - 1.5) * 0.9, z: (Math.floor(slot / 4) - 1) * 0.9 };
}
export function pondSlotAt(x: number, z: number): number | null {
  const col = Math.round((x - ADVENTURE_POND.x) / 0.9 + 1.5);
  const row = Math.round((z - ADVENTURE_POND.z) / 0.9 + 1);
  return col >= 0 && col < 4 && row >= 0 && row < 3 ? row * 4 + col : null;
}

/** A bounded kit in the existing renderer: no canvas, RAF, audio context or background simulation. */
export function createPondWorld() {
  const root = new THREE.Group(); root.position.set(ADVENTURE_POND.x, 0, ADVENTURE_POND.z); root.name = "Living pond";
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g; };
  const material = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...extra }); materials.add(m); return m;
  };
  const sphere = geometry(new THREE.SphereGeometry(1, 12, 8));
  const leaf = geometry(new THREE.SphereGeometry(1, 12, 6));
  const stone = geometry(new THREE.IcosahedronGeometry(1, 1));
  const stem = geometry(new THREE.CylinderGeometry(0.6, 1, 1, 7));
  const disk = geometry(new THREE.CircleGeometry(1, 24, 0.12, Math.PI * 1.91));
  const fin = geometry(new THREE.ConeGeometry(1, 1, 3));
  const mats = {
    green: material("#8da96a"), pale: material("#c1d88a"), stem: material("#6d8056"),
    stone: material("#c6c6b2"), wood: material("#b69d76"), petal: material("#f1dfb2"),
    gold: material("#e8bc71"), ivory: material("#f5e7c8"), ink: material("#374b45"),
    fin: material("#d4ae7b", { transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    wing: material("#b3d2cf", { transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
  };
  // Authored props merge by material, keeping a full 12-position habitat to a small draw-call set.
  const props = new THREE.Group(), preview = new THREE.Group(); root.add(props, preview);
  const previewMat = new THREE.MeshBasicMaterial({ color: "#d5ed9b", transparent: true, opacity: 0.52, depthWrite: false }); materials.add(previewMat);
  let previewKey = "", previewGeometries: THREE.BufferGeometry[] = [];
  let propGeometries: THREE.BufferGeometry[] = [];
  const transform = new THREE.Object3D();
  function buildProps(objects: readonly PondObject[], target: THREE.Group, ghost = false) {
    const created: THREE.BufferGeometry[] = [];
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    function part(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
      transform.position.set(x, y, z); transform.rotation.set(rx, ry, rz); transform.scale.set(sx, sy, sz); transform.updateMatrix();
      const clone = g.clone().applyMatrix4(transform.matrix);
      const piece = clone.index ? clone.toNonIndexed() : clone;
      if (piece !== clone) clone.dispose();
      const list = batches.get(m) ?? []; list.push(piece); batches.set(m, list);
    }
    for (const o of objects) {
      if (o.slot === null) continue;
      const { x, z } = pondSlotPosition(o.slot);
      if (o.kind === "reed") {
        part(stone, mats.stone, x, 0.08, z, 0.32, 0.1, 0.27);
        for (let j = 0; j < 5; j++) {
          const angle = j * 2.399, px = x + Math.cos(angle) * 0.13, pz = z + Math.sin(angle) * 0.12;
          part(stem, mats.stem, px, 0.35 + (j % 2) * 0.08, pz, 0.018, 0.56, 0.018, 0.09, 0, Math.sin(angle) * 0.15);
          part(leaf, mats.green, px + Math.sin(angle) * 0.1, 0.33, pz, 0.075, 0.29, 0.022, 0.3, angle, 0.45);
          part(sphere, mats.wood, px, 0.65 + (j % 2) * 0.08, pz, 0.032, 0.12, 0.032);
        }
      } else if (o.kind === "leaf") {
        part(disk, mats.pale, x, 0.1, z, 0.33, 0.31, 1, -Math.PI / 2, 0, o.slot * 1.2);
        for (let j = 0; j < 6; j++) {
          const a = j * Math.PI / 3;
          part(leaf, mats.petal, x + Math.cos(a) * 0.085, 0.15, z + Math.sin(a) * 0.085, 0.07, 0.035, 0.13, -0.25, a);
        }
        part(sphere, mats.gold, x, 0.17, z, 0.05, 0.03, 0.05);
      } else if (o.kind === "stone") {
        part(stone, mats.stone, x, 0.19, z, 0.33, 0.21, 0.28, 0.1, o.rotation * Math.PI / 2, 0.15);
        // A dark inset arrow makes rotation's flow preference visible at the selected scale.
        part(fin, mats.ink, x, 0.39, z, 0.09, 0.18, 0.035, -Math.PI / 2, 0, -o.rotation * Math.PI / 2);
      } else {
        part(stem, mats.wood, x, 0.34, z, 0.045, 0.55, 0.045);
        part(stem, mats.wood, x, 0.61, z, 0.047, 0.55, 0.047, 0, 0, Math.PI / 2);
        part(leaf, mats.green, x - 0.15, 0.51, z, 0.11, 0.035, 0.06, 0, 0.35, 0.2);
      }
    }
    for (const [m, pieces] of batches) {
      const merged = mergeGeometries(pieces, false); pieces.forEach((g) => g.dispose());
      if (merged) { created.push(merged); const mesh = new THREE.Mesh(merged, ghost ? previewMat : m); mesh.castShadow = !ghost; mesh.renderOrder = ghost ? 2 : 0; target.add(mesh); }
    }
    return created;
  }
  const gridVertices: number[] = [];
  for (let row = 0; row < 4; row++) gridVertices.push(-1.8, 0.095, (row - 1.5) * 0.9, 1.8, 0.095, (row - 1.5) * 0.9);
  for (let col = 0; col < 5; col++) gridVertices.push((col - 2) * 0.9, 0.095, -1.35, (col - 2) * 0.9, 0.095, 1.35);
  const gridMat = new THREE.LineBasicMaterial({ color: "#ecf5d5", transparent: true, opacity: 0.55 }); materials.add(gridMat);
  const grid = new THREE.LineSegments(geometry(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(gridVertices, 3))), gridMat); root.add(grid);
  const selectedMat = new THREE.MeshBasicMaterial({ color: "#d5f49a", transparent: true, opacity: 0.26, depthWrite: false }); materials.add(selectedMat);
  const selected = new THREE.Mesh(geometry(new THREE.PlaneGeometry(0.86, 0.86)), selectedMat); selected.rotation.x = -Math.PI / 2; root.add(selected);
  function instances(g: THREE.BufferGeometry, m: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(g, m, count); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; root.add(mesh); return mesh;
  }
  const bodies = instances(sphere, mats.ivory, 2), patches = instances(sphere, mats.gold, 2), tails = instances(fin, mats.fin, 2), fins = instances(leaf, mats.fin, 4), eyes = instances(sphere, mats.ink, 4);
  const fish = [0, 1].map((index) => ({ x: index ? 0.45 : -0.45, z: 0, yaw: 0, path: [6, 7, 11, 10, 6], step: 0, slot: 6, clock: 0 }));
  const snail = new THREE.Group();
  const shell = new THREE.Mesh(sphere, mats.wood); shell.scale.set(0.105, 0.105, 0.065); shell.position.y = 0.14; snail.add(shell);
  const snailBody = new THREE.Mesh(sphere, mats.pale); snailBody.scale.set(0.18, 0.033, 0.065); snailBody.position.y = 0.075; snail.add(snailBody); root.add(snail);
  const dragonfly = new THREE.Group(); const thorax = new THREE.Mesh(sphere, mats.ink); thorax.scale.set(0.035, 0.035, 0.2); dragonfly.add(thorax);
  const wings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) { const wing = new THREE.Mesh(leaf, mats.wing); wing.scale.set(0.21, 0.008, 0.045); wing.position.set(i % 2 ? 0.15 : -0.15, 0, i < 2 ? -0.05 : 0.05); dragonfly.add(wing); wings.push(wing); } root.add(dragonfly);
  const rippleMat = new THREE.MeshBasicMaterial({ color: "#eaf5d7", transparent: true, opacity: 0.5, depthWrite: false }); materials.add(rippleMat);
  const ripples = instances(geometry(new THREE.RingGeometry(0.93, 1, 32)), rippleMat, 3);
  let layoutKey = "", lastRoute = -1, completedRoute = -1, clock = 0;
  function matrix(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx: number, ry: number, rz = 0) {
    transform.position.set(x, y, z); transform.scale.set(sx, sy, sz); transform.rotation.set(rx, ry, rz); transform.updateMatrix(); mesh.setMatrixAt(index, transform.matrix);
  }
  return {
    root,
    diagnostics: () => ({ grid: grid.visible, selection: selected.visible, preview: preview.visible, rippleCount: ripples.visible ? ripples.count : 0 }),
    update(frame: PondFrame, dt: number, animate: boolean, reduced: boolean) {
      root.visible = !!frame.world; if (!frame.world) return;
      if (animate) clock += dt;
      const world = frame.world, key = pondLayoutKey(world.objects);
      if (key !== layoutKey) {
        layoutKey = key; props.clear(); propGeometries.forEach((g) => g.dispose()); propGeometries = buildProps(world.objects, props);
        const habitat = assessPond(world.objects), water = habitat.components.sort((a, b) => b.length - a.length)[0] ?? [];
        fish.forEach((f, i) => {
          const at = water[i % Math.max(1, water.length)];
          if (at === undefined) { f.path = []; return; }
          const p = pondSlotPosition(at); f.x = p.x; f.z = p.z; f.slot = at; f.step = 0;
          f.path = pondPathBetween(at, water.at(-1)!, world.objects) ?? [at];
        });
      }
      if (frame.routeVersion !== lastRoute) {
        lastRoute = frame.routeVersion;
        if (frame.route.length) fish.forEach((f) => {
          const approach = pondPathBetween(f.slot, frame.route[0], world.objects);
          if (approach) { f.path = [...approach, ...frame.route.slice(1)]; f.step = 0; }
        });
      }
      const ghost = frame.ghost, owned = world.objects.find((o) => o.id === ghost?.id);
      const arranging = frame.open && frame.activity === "arrange";
      const showPreview = arranging && !!ghost && (owned?.slot !== ghost.slot || owned?.rotation !== ghost.rotation || !owned);
      const ghostKey = showPreview ? `${ghost.kind}:${ghost.slot}:${ghost.rotation}` : "";
      if (ghostKey !== previewKey) {
        previewKey = ghostKey; preview.clear(); previewGeometries.forEach((g) => g.dispose());
        previewGeometries = showPreview ? buildProps([ghost], preview, true) : [];
      }
      if (ghost) previewMat.color.set(world.objects.some((o) => o.id !== ghost.id && o.slot === ghost.slot) ? "#d8a095" : "#d5ed9b");
      preview.visible = showPreview;
      grid.visible = arranging; selected.visible = arranging && frame.selectedSlot !== null;
      if (frame.selectedSlot !== null) { const p = pondSlotPosition(frame.selectedSlot); selected.position.set(p.x, 0.11, p.z); }
      const activeCells = pondCells(world.objects), scale = world.fish_adult ? 1 : 0.72;
      fish.forEach((f, i) => {
        if (animate && !reduced && f.path.length) {
          const target = pondSlotPosition(f.path[f.step]), dx = target.x - f.x, dz = target.z - f.z, distance = Math.hypot(dx, dz);
          if (distance < 0.04) {
            f.slot = f.path[f.step]; f.step++;
            if (f.step >= f.path.length) {
              if (i === 0 && frame.route.length && completedRoute !== frame.routeVersion) { completedRoute = frame.routeVersion; frame.onRouteComplete?.(completedRoute); }
              f.path = [...f.path].reverse(); f.step = Math.min(1, f.path.length - 1);
            }
          } else { const d = Math.min(distance, dt * (i ? 0.43 : 0.51)); f.x += dx / distance * d; f.z += dz / distance * d; f.yaw = Math.atan2(dx, dz); }
        }
        const yaw = f.yaw, wave = reduced ? 0 : Math.sin(clock * 8 + i * 2.1);
        matrix(bodies, i, f.x, 0.145, f.z, 0.095 * scale, 0.055 * scale, 0.23 * scale, 0, yaw);
        matrix(patches, i, f.x + Math.sin(yaw) * 0.045, 0.185, f.z + Math.cos(yaw) * 0.045, 0.071 * scale, 0.024, 0.1 * scale, 0, yaw + 0.2);
        const tx = f.x - Math.sin(yaw) * 0.26 * scale, tz = f.z - Math.cos(yaw) * 0.26 * scale;
        matrix(tails, i, tx, 0.135, tz, 0.12 * scale, 0.13 * scale, 0.025, Math.PI / 2, 0, -yaw + wave * 0.22);
        for (let side = 0; side < 2; side++) {
          const sign = side ? 1 : -1;
          matrix(fins, i * 2 + side, f.x + Math.cos(yaw) * sign * 0.1 * scale, 0.125, f.z - Math.sin(yaw) * sign * 0.1 * scale, 0.065 * scale, 0.008, 0.035, 0, yaw + sign * wave * 0.25);
          matrix(eyes, i * 2 + side, f.x + Math.sin(yaw) * 0.14 * scale + Math.cos(yaw) * sign * 0.065 * scale, 0.17, f.z + Math.cos(yaw) * 0.14 * scale - Math.sin(yaw) * sign * 0.065 * scale, 0.012, 0.012, 0.012, 0, 0);
        }
      });
      for (const mesh of [bodies, patches, tails, fins, eyes]) mesh.instanceMatrix.needsUpdate = true;
      snail.visible = world.discoveries.includes("leafsnail");
      const reed = activeCells.indexOf("reed"); const shore = pondSlotPosition(reed < 0 ? 0 : reed);
      snail.position.set(shore.x + 0.25, 0.02, shore.z + 0.18 + (reduced ? 0 : Math.sin(clock * 0.23) * 0.08));
      dragonfly.visible = world.discoveries.includes("dragonfly");
      const perch = activeCells.indexOf("perch"), perchPoint = pondSlotPosition(perch < 0 ? 3 : perch);
      dragonfly.position.set(perchPoint.x + (reduced ? 0 : Math.sin(clock * 0.8) * 0.16), 0.78 + (reduced ? 0 : Math.sin(clock * 1.3) * 0.07), perchPoint.z);
      wings.forEach((wing, i) => { wing.rotation.z = reduced ? 0 : Math.sin(clock * 28) * (i % 2 ? 0.3 : -0.3); });
      // Show the points the player actually chose, including before a route is committed.
      // Reduced motion retains static markers, so selecting water does not depend on animation.
      ripples.count = Math.min(3, frame.anchors.length);
      ripples.visible = frame.open && frame.activity === "observe" && ripples.count > 0;
      for (let i = 0; i < ripples.count; i++) {
        const p = pondSlotPosition(frame.anchors[i]), radius = reduced ? 0.17 : 0.12 + ((clock * 0.5 + i * 0.2) % 1) * 0.18;
        matrix(ripples, i, p.x, 0.09, p.z, radius, radius, 1, -Math.PI / 2, 0);
      }
      ripples.instanceMatrix.needsUpdate = true;
    },
    dispose() { preview.clear(); previewGeometries.forEach((g) => g.dispose()); props.clear(); propGeometries.forEach((g) => g.dispose()); geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); root.clear(); },
  };
}
