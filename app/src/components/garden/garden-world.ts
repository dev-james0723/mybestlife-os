import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { POND, seededRandom, type GardenRound } from "@/lib/garden/game";
import type { PlantType } from "@/types/database";

export type GardenPalette = "meadow" | "lavender" | "autumn";
export function createGardenWorld(round: GardenRound, dark: boolean, palette: GardenPalette, plant: PlantType, stage: number, collectionCount: number) {
  const root = new THREE.Group(), still = new THREE.Group();
  root.add(still);
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const pebble = new THREE.IcosahedronGeometry(1, 1);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const cone = new THREE.ConeGeometry(1, 1, 12);
  const reusable = [sphere, pebble, box, cylinder, cone];
  const greens = palette === "autumn" ? ["#a2ac62", "#c9b774", "#d39760"] : palette === "lavender" ? ["#839e8d", "#a6b5a0", "#b8a8cc"] : ["#759f77", "#a9c98b", "#bfd7a3"];
  const flowers = palette === "autumn" ? ["#edc681", "#d79e7e", "#f3daa3"] : palette === "lavender" ? ["#c8b2e1", "#e1c9e5", "#aa9cc9"] : ["#eddc9b", "#e4bab5", "#c9b6db"];
  function mat(color: string, glow = false) {
    const key = `${color}${glow}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0, emissive: glow ? color : "#000000", emissiveIntensity: glow ? (dark ? 1 : 0.28) : 0 }));
    return mats.get(key)!;
  }
  function mesh(parent: THREE.Group, geometry: THREE.BufferGeometry, color: string, p: number[], scale: number[], rot: number[] = [0, 0, 0], glow = false) {
    const m = new THREE.Mesh(geometry, mat(color, glow));
    m.position.set(p[0], p[1], p[2]); m.scale.set(scale[0], scale[1], scale[2]); m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = false; m.receiveShadow = true; parent.add(m); return m;
  }
  const ball = (p: THREE.Group, c: string, pos: number[], s: number[]) => mesh(p, sphere, c, pos, s);
  function leaf(parent: THREE.Group, pos: number[], scale: number, rotation: number, color: string) {
    return mesh(parent, sphere, color, pos, [scale * 0.48, scale * 0.12, scale], [0, rotation, -0.3]);
  }
  function stem(parent: THREE.Group, x: number, z: number, h: number, color: string, bloom = true) {
    mesh(parent, cylinder, "#608264", [x, h / 2, z], [0.045, h, 0.045]);
    leaf(parent, [x - 0.12, h * 0.4, z], 0.25, 0.8, greens[0]);
    leaf(parent, [x + 0.14, h * 0.65, z], 0.27, -0.7, greens[1]);
    if (bloom) {
      for (let p = 0; p < 5; p++) {
        const angle = p / 5 * Math.PI * 2;
        ball(parent, color, [x + Math.cos(angle) * 0.15, h + 0.035, z + Math.sin(angle) * 0.15], [0.16, 0.075, 0.16]);
      }
      ball(parent, "#d0aa61", [x, h + 0.1, z], [0.085, 0.075, 0.085]);
    } else ball(parent, color, [x, h, z], [0.09, 0.15, 0.09]);
  }
  function tree(x: number, z: number, scale: number, color: string) {
    const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(scale); still.add(t);
    mesh(t, cylinder, "#8f7964", [0, 0.8, 0], [0.11, 1.6, 0.11], [0, 0, 0.05]);
    mesh(t, cylinder, "#8f7964", [-0.2, 1.3, 0], [0.06, 0.7, 0.06], [0, 0, 0.7]);
    for (const [dx, dy, dz, s] of [[0, 2, 0, 0.8], [-0.55, 1.75, 0.12, 0.58], [0.48, 1.8, 0, 0.64], [0.2, 2.5, 0.1, 0.58]]) {
      mesh(t, pebble, color, [dx, dy, dz], [s, s * 0.85, s * 0.9]);
    }
    for (let i = 0; i < 5; i++) leaf(t, [Math.sin(i * 2.1) * 0.6, 1.5 + i * 0.2, 0.5], 0.2, i, greens[1]);
  }
  // Layered miniature landscape, with a sculpted stone rim and moss lip.
  mesh(still, cylinder, dark ? "#3c4b49" : "#b3b9aa", [0, -0.57, 0], [5.05, 0.72, 4.0]);
  mesh(still, cylinder, dark ? "#657967" : "#d2d3b9", [0, -0.16, 0], [5.1, 0.13, 4.03]);
  mesh(still, cylinder, dark ? "#566e57" : "#c3d1a7", [0, -0.06, 0], [5, 0.13, 3.94]);
  const rng = seededRandom(614);
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * Math.PI * 2;
    mesh(still, pebble, i % 2 ? "#8d9c86" : "#a8af94", [Math.cos(a) * 4.95, -0.25 - rng() * 0.15, Math.sin(a) * 3.85], [0.28 + rng() * 0.16, 0.22, 0.25]);
  }
  // Irregular pool, layered water ripples and reeds. It slows the companion, never traps it.
  ball(still, "#99aa91", [POND.x, 0.03, POND.z], [1.25, 0.045, 0.96]);
  ball(still, dark ? "#4c8284" : "#94c7bd", [POND.x, 0.065, POND.z], [1.12, 0.025, 0.85]);
  ball(still, dark ? "#6c9d99" : "#b4dbcd", [POND.x - 0.14, 0.08, POND.z - 0.1], [0.76, 0.012, 0.55]);
  for (let i = 0; i < 5; i++) {
    const angle = i * 1.5;
    ball(still, "#a3b299", [POND.x + Math.cos(angle) * 1.15, 0.08, POND.z + Math.sin(angle) * 0.87], [0.2, 0.13, 0.15]);
  }
  leaf(still, [2.1, 0.105, 0.9], 0.28, 0.4, "#7fa67b");
  stem(still, 2.2, 1.25, 0.25, flowers[1]);
  // Winding stepping stones draw the first route from the companion to the home plant.
  for (let i = 0; i < 9; i++) {
    const z = 2.8 - i * 0.49, x = Math.sin(i * 0.5) * 0.35 - 0.4;
    mesh(still, cylinder, i % 2 ? "#d8d7bd" : "#e0dfc7", [x, 0.055, z], [0.26, 0.055, 0.18], [0, i, 0]);
  }
  tree(-3.5, -2.0, 0.78, greens[0]); tree(3.15, -1.65, 0.88, greens[1]); tree(-0.2, -2.9, 0.66, greens[2]);
  // Small timber bench with distinct seat slats, back, feet and brass pins.
  const bench = new THREE.Group(); still.add(bench); bench.position.set(3.25, 0, 1.45); bench.rotation.y = -0.4;
  for (const x of [-0.4, 0.4]) for (const z of [-0.15, 0.18]) mesh(bench, box, "#7e806d", [x, 0.22, z], [0.065, 0.4, 0.065]);
  for (const z of [-0.18, 0, 0.18]) mesh(bench, box, "#b4a17e", [0, 0.45, z], [1.03, 0.08, 0.14]);
  for (const y of [0.65, 0.82]) mesh(bench, box, "#c5b28c", [0, y, -0.23], [1.03, 0.1, 0.05]);
  // Two lanterns form warm landmarks without additional expensive lights.
  for (const [x, z] of [[-4.0, 0.65], [1.5, -3.1]]) {
    mesh(still, cylinder, "#6e7765", [x, 0.55, z], [0.04, 1.1, 0.04]);
    mesh(still, box, "#f2d89c", [x, 1.02, z], [0.2, 0.25, 0.2], undefined, true);
    mesh(still, cone, "#6d7b65", [x, 1.21, z], [0.21, 0.17, 0.21]);
  }
  for (let i = 0; i < 58; i++) {
    const a = rng() * Math.PI * 2, radius = 0.84 + rng() * 0.12;
    const x = Math.cos(a) * 4.8 * radius, z = Math.sin(a) * 3.8 * radius;
    leaf(still, [x, 0.07, z], 0.14 + rng() * 0.13, a, greens[i % 3]);
    if (i % 4 === 0) stem(still, x, z, 0.24 + rng() * 0.2, flowers[i % 3]);
  }
  for (let i = 0; i < Math.min(collectionCount, 12); i++) {
    const a = i * 0.52;
    stem(still, Math.cos(a) * 3.8, Math.sin(a) * 3.1, 0.5 + (i % 3) * 0.1, flowers[i % 3]);
  }
  // Home plant is the real account-backed species and growth stage.
  const home = new THREE.Group(); still.add(home); home.position.set(-0.2, 0.12, -0.35);
  mesh(home, cylinder, "#b39879", [0, 0.06, 0], [0.69, 0.15, 0.58]);
  mesh(home, cylinder, "#736f53", [0, 0.15, 0], [0.62, 0.04, 0.51]);
  const h = 0.28 + stage * 0.19;
  if (plant === "apple_tree") {
    mesh(home, cylinder, "#8f7964", [0, h / 2, 0], [0.09, h, 0.09]);
    mesh(home, pebble, greens[0], [0, h + 0.2, 0], [h * 0.55, h * 0.5, h * 0.5]);
    if (stage >= 4) for (const x of [-0.3, 0, 0.3]) ball(home, "#d19078", [x, h + 0.15, 0.4], [0.11, 0.13, 0.11]);
  } else if (plant === "grass") {
    for (let i = 0; i < 7; i++) leaf(home, [Math.sin(i) * 0.2, 0.2 + h * 0.2, Math.cos(i) * 0.15], h * 0.57, i, greens[i % 3]).rotation.z = -0.9;
  } else {
    const color = plant === "sunflower" ? "#edcf79" : plant === "lily" ? "#f1dacf" : "#bea9d2";
    stem(home, 0, 0, h, color, stage >= 4);
    if (stage >= 3) stem(home, -0.24, 0.12, h * 0.65, color, stage >= 5);
  }

  const beds = round.beds.map((bed, i) => {
    const g = new THREE.Group(); g.position.set(bed.x, 0.08, bed.z); root.add(g);
    mesh(g, cylinder, "#b5a48a", [0, 0, 0], [0.48, 0.12, 0.4]);
    mesh(g, cylinder, "#79765a", [0, 0.08, 0], [0.4, 0.04, 0.33]);
    const buds = new THREE.Group(), bloom = new THREE.Group(); g.add(buds, bloom);
    for (const [x, z, height] of [[-0.17, 0, 0.47], [0.14, 0.08, 0.65], [0, -0.16, 0.78]]) {
      stem(buds, x, z, height * 0.6, "#a5b49a", false);
      stem(bloom, x, z, height, flowers[i], true);
    }
    bloom.visible = false;
    const marker = new THREE.Group(); marker.position.y = 1.18; g.add(marker);
    mesh(marker, cone, "#b6e6e2", [0, 0.09, 0], [0.12, 0.22, 0.12], undefined, true);
    ball(marker, "#b6e6e2", [0, -0.01, 0], [0.12, 0.12, 0.12]);
    return { group: g, buds, bloom, marker };
  });
  const drops = round.drops.map(d => {
    const g = new THREE.Group(); root.add(g); g.position.set(d.x, 0.55, d.z);
    mesh(g, cone, "#a5e6df", [0, 0.1, 0], [0.14, 0.27, 0.14], undefined, true);
    mesh(g, sphere, "#a5e6df", [0, -0.04, 0], [0.14, 0.14, 0.14], undefined, true);
    return g;
  });
  // Sprout: soft pear silhouette, boots, cap, leaf, backpack and watering can.
  const hero = new THREE.Group(); root.add(hero);
  ball(hero, "#ede6ce", [0, 0.48, 0], [0.24, 0.3, 0.19]);
  ball(hero, "#f3ecd8", [0, 0.82, 0], [0.28, 0.23, 0.24]);
  ball(hero, "#8fa785", [0, 0.985, -0.01], [0.29, 0.09, 0.245]);
  leaf(hero, [0.1, 1.12, 0], 0.24, 0.6, "#bfd78b").rotation.z = -0.6;
  for (const x of [-0.095, 0.095]) ball(hero, "#3d4b45", [x, 0.83, 0.217], [0.026, 0.038, 0.016]);
  for (const x of [-0.17, 0.17]) ball(hero, "#dfbaa0", [x, 0.755, 0.196], [0.046, 0.022, 0.01]);
  ball(hero, "#899d6f", [0, 0.55, -0.2], [0.19, 0.2, 0.07]);
  const feet = [-0.12, 0.12].map(x => ball(hero, "#6d7d5e", [x, 0.19, 0.06], [0.085, 0.1, 0.13]));
  ball(hero, "#ede6ce", [-0.26, 0.55, 0.04], [0.08, 0.16, 0.08]);
  ball(hero, "#ede6ce", [0.26, 0.55, 0.08], [0.08, 0.16, 0.08]);
  mesh(hero, cylinder, "#88b9b0", [0.31, 0.37, 0.15], [0.11, 0.17, 0.11]);
  mesh(hero, cylinder, "#88b9b0", [0.43, 0.41, 0.15], [0.035, 0.22, 0.035], [0, 0, -1]);
  const shadow = mesh(root, sphere, dark ? "#415343" : "#98ad87", [0, 0.028, 0], [0.3, 0.005, 0.21]);
  const targetMarker = mesh(root, new THREE.RingGeometry(0.14, 0.19, 24), "#e0efb9", [0, 0.12, 0], [1, 1, 1], [-Math.PI / 2, 0, 0], true);
  targetMarker.visible = false;

  // Merge repeated static geometry by material: botanical density without hundreds of draw calls.
  function mergeGroup(group: THREE.Group) {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    group.traverse(o => {
      if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
      // Icosahedra are non-indexed; primitives are indexed. Normalize before merging.
      const geometry = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      const list = buckets.get(o.material) ?? []; list.push(geometry); buckets.set(o.material, list);
    });
    group.clear();
    buckets.forEach((geometries, material) => {
      const merged = mergeGeometries(geometries);
      if (merged) { const item = new THREE.Mesh(merged, material); item.receiveShadow = true; item.castShadow = true; group.add(item); }
      geometries.forEach(g => g.dispose());
    });
  }
  mergeGroup(still);
  beds.forEach(b => { mergeGroup(b.buds); mergeGroup(b.bloom); });
  return { root, hero, feet, beds, drops, shadow, targetMarker,
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>(reusable);
      root.traverse(o => { if (o instanceof THREE.Mesh) geometries.add(o.geometry); });
      geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose());
    },
  };
}
