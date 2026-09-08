import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  ADVENTURE_POND,
  BED_SPOTS,
  COLLIDERS,
  HOME,
  LANDMARKS,
  TRAIL_START,
  WELL,
  type AdventureState,
} from "@/lib/garden/adventure";
import { seededRandom } from "@/lib/garden/game";
import type { PlantType } from "@/types/database";

type V3 = [number, number, number];
export type GardenWorldOptions = {
  dark: boolean;
  pet: "xiaoba" | "doge";
  buddyEnabled: boolean;
  plant: PlantType;
  stage: number;
  collection: PlantType[];
  decoration: string;
  journal: boolean;
  habit: boolean;
};

/** Authored botanical kit: shared materials, reusable geometry and merged static scenery. */
export function createAdventureWorld(
  state: AdventureState,
  options: GardenWorldOptions,
) {
  const root = new THREE.Group(),
    scenery = new THREE.Group();
  root.add(scenery);
  const geometrySet = new Set<THREE.BufferGeometry>(),
    materialSet = new Set<THREE.Material>(),
    textures: THREE.Texture[] = [];
  function geo<T extends THREE.BufferGeometry>(g: T): T {
    geometrySet.add(g);
    return g;
  }
  const sphere = geo(new THREE.SphereGeometry(1, 16, 10));
  const rock = geo(new THREE.IcosahedronGeometry(1, 1));
  const box = geo(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = geo(new THREE.CylinderGeometry(1, 1, 1, 16));
  const tapered = geo(new THREE.CylinderGeometry(0.72, 1, 1, 12));
  const ring = geo(new THREE.TorusGeometry(1, 0.055, 6, 32));
  const cone = geo(new THREE.ConeGeometry(1, 1, 16));
  const leafGeometry = (() => {
    const vertices: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12,
        width = Math.sin(Math.PI * t) * 0.32;
      vertices.push(
        -width,
        Math.sin(t * Math.PI) * 0.13,
        t,
        0,
        Math.sin(t * Math.PI) * 0.22,
        t,
        width,
        Math.sin(t * Math.PI) * 0.13,
        t,
      );
      if (i < 12) {
        const a = i * 3;
        indices.push(
          a,
          a + 3,
          a + 1,
          a + 1,
          a + 3,
          a + 4,
          a + 1,
          a + 4,
          a + 2,
          a + 2,
          a + 4,
          a + 5,
        );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    // Shared merge contract: every geometry carries normals/UVs, even procedural botanical surfaces.
    g.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(
        vertices.flatMap((_, i) =>
          i % 3 === 0 ? [vertices[i], vertices[i + 2]] : [],
        ),
        2,
      ),
    );
    return geo(g);
  })();
  function texture(kind: "grass" | "wood" | "soil") {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const rng = seededRandom(kind.length * 71);
    ctx.fillStyle =
      kind === "grass" ? "#acbd8e" : kind === "wood" ? "#c2a986" : "#8e7859";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1100; i++) {
      const x = rng() * 256,
        y = rng() * 256;
      ctx.strokeStyle =
        kind === "grass"
          ? `rgba(67,103,54,${0.04 + rng() * 0.13})`
          : `rgba(71,47,32,${0.03 + rng() * 0.17})`;
      ctx.lineWidth = kind === "wood" ? 0.6 : 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (kind === "wood" ? rng() * 80 : rng() * 4), y + rng() * 3);
      ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(kind === "grass" ? 10 : 2, kind === "grass" ? 10 : 2);
    map.anisotropy = 4;
    textures.push(map);
    return map;
  }
  function mat(
    color: string,
    config: THREE.MeshStandardMaterialParameters = {},
  ) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      ...config,
    });
    materialSet.add(m);
    return m;
  }
  const m = {
    ground: mat(options.dark ? "#7a9172" : "#bacf9c", {
      map: texture("grass"),
    }),
    stone: mat("#a8ab94"),
    stoneLight: mat("#d6d5bc"),
    stoneDark: mat("#727f6a"),
    wood: mat("#b6a184", { map: texture("wood") }),
    bark: mat("#807257"),
    soil: mat("#cfbba0", { map: texture("soil") }),
    leaf: mat("#659765", { side: THREE.DoubleSide }),
    leafLight: mat("#a7c677", { side: THREE.DoubleSide }),
    leafDark: mat("#426f50", { side: THREE.DoubleSide }),
    cream: mat("#f4ebd7"),
    pink: mat("#e8acaa", { side: THREE.DoubleSide }),
    violet: mat("#bba5d7", { side: THREE.DoubleSide }),
    gold: mat("#edcd77", { side: THREE.DoubleSide }),
    brass: mat("#c6a861", { metalness: 0.55, roughness: 0.32 }),
    teal: mat("#6baba1", { metalness: 0.2, roughness: 0.32 }),
    water: mat(options.dark ? "#467b82" : "#74b6b8", {
      metalness: 0.25,
      roughness: 0.2,
    }),
    glass: mat("#d4efdc", {
      transparent: true,
      opacity: 0.16,
      roughness: 0.12,
      depthWrite: false,
    }),
    fabric: mat("#759374"),
    boot: mat("#485d4f"),
    black: mat("#293a36"),
    blue: mat("#7398ac"),
    dog: mat("#d9af65"),
    glow: mat("#f4df9c", {
      emissive: "#f3d57c",
      emissiveIntensity: options.dark ? 1.4 : 0.25,
    }),
  };
  const greens = [m.leaf, m.leafLight, m.leafDark],
    petals = [m.gold, m.pink, m.violet];
  function mesh(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: V3,
    scale: V3,
    rotation: V3 = [0, 0, 0],
  ) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.scale.set(...scale);
    item.rotation.set(...rotation);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  const ball = (
    p: THREE.Object3D,
    material: THREE.Material,
    pos: V3,
    scale: V3,
  ) => mesh(p, sphere, material, pos, scale);
  function leaf(
    p: THREE.Object3D,
    material: THREE.Material,
    pos: V3,
    scale = 1,
    rotation: V3 = [0, 0, 0],
  ) {
    return mesh(
      p,
      leafGeometry,
      material,
      pos,
      [scale, scale, scale],
      rotation,
    );
  }
  function tube(
    parent: THREE.Object3D,
    material: THREE.Material,
    points: V3[],
    radius: number,
  ) {
    return mesh(
      parent,
      geo(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          16,
          radius,
          6,
          false,
        ),
      ),
      material,
      [0, 0, 0],
      [1, 1, 1],
    );
  }
  function group(parent: THREE.Object3D, p: V3, scale = 1) {
    const g = new THREE.Group();
    g.position.set(...p);
    g.scale.setScalar(scale);
    parent.add(g);
    return g;
  }
  function merge(target: THREE.Group) {
    target.updateWorldMatrix(true, true);
    const inv = target.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    target.traverse((o) => {
      if (!(o instanceof THREE.Mesh) || Array.isArray(o.material)) return;
      const geometry = (
        o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
      ).applyMatrix4(inv.clone().multiply(o.matrixWorld));
      const list = buckets.get(o.material) ?? [];
      list.push(geometry);
      buckets.set(o.material, list);
    });
    target.clear();
    for (const [material, geometries] of buckets) {
      const combined = mergeGeometries(geometries);
      if (combined) mesh(target, geo(combined), material, [0, 0, 0], [1, 1, 1]);
      geometries.forEach((g) => g.dispose());
    }
  }
  function flower(
    parent: THREE.Object3D,
    pos: V3,
    height: number,
    type: PlantType,
    open = true,
  ) {
    const f = group(parent, pos);
    const color =
      type === "lily" ? m.cream : type === "orchid" ? m.violet : m.gold;
    if (type === "grass") {
      for (let i = 0; i < 7; i++)
        leaf(f, greens[i % 3], [0, 0.03, 0], height * 0.8, [-0.7, i * 2.4, 0]);
      return f;
    }
    if (type === "apple_tree") {
      tree(f, 0, 0, height * 0.45, 3, true);
      return f;
    }
    tube(
      f,
      m.leafDark,
      [
        [0, 0, 0],
        [0.06, height * 0.6, 0],
        [0, height, 0.02],
      ],
      0.035,
    );
    leaf(f, m.leaf, [0, height * 0.35, 0], height * 0.46, [-0.3, -1.3, 0.25]);
    leaf(
      f,
      m.leafLight,
      [0, height * 0.62, 0],
      height * 0.35,
      [-0.3, 1.2, -0.2],
    );
    if (!open) {
      ball(f, m.leafLight, [0, height, 0.02], [0.11, 0.18, 0.11]);
      return f;
    }
    const bloom = group(f, [0, height, 0.02], Math.min(1, height / 0.7));
    const count = type === "sunflower" ? 11 : type === "lily" ? 6 : 5;
    for (let i = 0; i < count; i++) {
      const a = (i * Math.PI * 2) / count;
      leaf(bloom, color, [0, 0, 0], type === "sunflower" ? 0.48 : 0.55, [
        type === "lily" ? -0.22 : -0.02,
        a,
        0,
      ]);
    }
    ball(
      bloom,
      type === "sunflower" ? m.bark : m.gold,
      [0, 0.075, 0],
      [0.14, 0.08, 0.14],
    );
    if (type === "lily")
      for (let i = 0; i < 4; i++) {
        const a = i * 1.57;
        mesh(
          bloom,
          cylinder,
          m.gold,
          [Math.cos(a) * 0.08, 0.14, Math.sin(a) * 0.08],
          [0.015, 0.23, 0.015],
        );
      }
    return f;
  }
  function tree(
    parent: THREE.Object3D,
    x: number,
    z: number,
    scale: number,
    seed: number,
    fruit = false,
  ) {
    const t = group(parent, [x, 0, z], scale),
      rng = seededRandom(seed);
    tube(
      t,
      m.bark,
      [
        [0, 0, 0],
        [-0.12, 1, 0.07],
        [0.06, 2.25, 0],
        [-0.2, 3.4, 0],
      ],
      0.19,
    );
    for (let i = 0; i < 4; i++) {
      const a = i * 2.4;
      tube(
        t,
        m.bark,
        [
          [0, 0.1, 0],
          [Math.cos(a) * 0.5, 0.16, Math.sin(a) * 0.5],
          [Math.cos(a) * 0.8, 0.02, Math.sin(a) * 0.8],
        ],
        0.1,
      );
      tube(
        t,
        m.bark,
        [
          [0, 1.7, 0],
          [Math.cos(a) * 0.65, 2.2, Math.sin(a) * 0.6],
          [Math.cos(a) * 1.1, 2.85, Math.sin(a) * 0.85],
        ],
        0.09,
      );
    }
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        r = i === 6 ? 0 : 0.85;
      mesh(
        t,
        rock,
        greens[(i + seed) % 3],
        [Math.cos(a) * r, 3 + rng() * 0.85, Math.sin(a) * r],
        [1.04 + rng() * 0.3, 0.85, 1.05],
      );
    }
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2;
      leaf(
        t,
        greens[i % 3],
        [Math.cos(a) * 1.35, 2.8 + rng(), Math.sin(a) * 1.35],
        0.35 + rng() * 0.35,
        [0.3, -a, 0.2],
      );
      if (fruit && i % 2 === 0)
        apple(
          t,
          [Math.cos(a) * 1.15, 2.8 + rng() * 0.4, Math.sin(a) * 1.15],
          0.8,
        );
    }
    return t;
  }
  function apple(parent: THREE.Object3D, pos: V3, scale = 1) {
    const a = group(parent, pos, scale);
    ball(a, m.pink, [0, 0.15, 0], [0.21, 0.23, 0.2]);
    mesh(a, cylinder, m.bark, [0, 0.39, 0], [0.025, 0.16, 0.025], [0, 0, 0.2]);
    leaf(a, m.leaf, [0, 0.37, 0], 0.25, [0, 0.6, -0.3]);
    return a;
  }
  function lantern(parent: THREE.Object3D, p: V3) {
    const l = group(parent, p);
    tube(
      l,
      m.bark,
      [
        [0, 0, 0],
        [0, 1.7, 0],
        [0.4, 1.95, 0],
        [0.57, 1.7, 0],
      ],
      0.045,
    );
    mesh(l, cylinder, m.brass, [0.53, 1.51, 0], [0.19, 0.055, 0.19]);
    mesh(l, cylinder, m.glow, [0.53, 1.31, 0], [0.135, 0.37, 0.135]);
    mesh(l, cylinder, m.brass, [0.53, 1.11, 0], [0.19, 0.045, 0.19]);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      mesh(
        l,
        cylinder,
        m.brass,
        [0.53 + Math.cos(a) * 0.155, 1.3, Math.sin(a) * 0.155],
        [0.015, 0.42, 0.015],
      );
    }
  }
  function pot(parent: THREE.Object3D, p: V3, type: PlantType, stage: number) {
    const g = group(parent, p);
    mesh(g, tapered, m.cream, [0, 0.35, 0], [0.52, 0.7, 0.52], [0, 0, Math.PI]);
    mesh(
      g,
      ring,
      m.brass,
      [0, 0.64, 0],
      [0.53, 0.53, 0.53],
      [Math.PI / 2, 0, 0],
    );
    mesh(g, cylinder, m.soil, [0, 0.64, 0], [0.48, 0.045, 0.48]);
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      mesh(
        g,
        cylinder,
        m.stoneLight,
        [Math.cos(a) * 0.45, 0.3, Math.sin(a) * 0.45],
        [0.016, 0.48, 0.016],
      );
    }
    flower(g, [0, 0.68, 0], 0.3 + stage * 0.24, type, stage >= 4);
    return g;
  }

  // A continuous field underfoot; faceted rim and distant wooded islands establish scale.
  mesh(
    scenery,
    geo(new THREE.CylinderGeometry(15.9, 16.3, 1.5, 96)),
    m.stoneDark,
    [0, -0.9, 0],
    [1, 1, 0.84],
  );
  mesh(
    scenery,
    geo(new THREE.CircleGeometry(15.85, 96)),
    m.ground,
    [0, -0.02, 0],
    [1, 0.84, 1],
    [-Math.PI / 2, 0, 0],
  );
  const rng = seededRandom(6412);
  for (let i = 0; i < 68; i++) {
    const a = (i / 68) * Math.PI * 2;
    mesh(
      scenery,
      rock,
      i % 2 ? m.stone : m.stoneDark,
      [Math.cos(a) * 15.7, -0.4, Math.sin(a) * 13.1],
      [0.6 + rng() * 0.5, 0.5 + rng() * 0.3, 0.7],
    );
  }
  for (let i = 0; i < 17; i++) {
    const a = (i / 17) * Math.PI * 2;
    tree(
      scenery,
      Math.cos(a) * 15.6,
      Math.sin(a) * 13.3,
      Math.sin(a) > 0.38 ? 0.22 + rng() * 0.14 : 0.7 + rng() * 0.55,
      i + 10,
      i % 5 === 0,
    );
  }
  COLLIDERS.slice(1).forEach((p, i) =>
    tree(scenery, p.x, p.z, p.z > 8 ? 0.28 : 0.8 + i * 0.04, i + 2, i < 2),
  );
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4,
      x = Math.cos(a) * (26 + rng() * 4),
      z = Math.sin(a) * (24 + rng() * 3);
    mesh(
      scenery,
      rock,
      i % 2 ? m.leafDark : m.stoneDark,
      [x, -2, z],
      [4 + rng() * 5, 2 + rng() * 4, 4 + rng() * 5],
    );
  }
  // Paths curve between landmarks and leave the playable ground visually open.
  const paths: V3[][] = [
    [
      [0, 0.03, 10],
      [0, 0.03, 5],
      [-3, 0.03, 1],
      [-3, 0.03, -5],
      [-6.3, 0.03, -7.3],
    ],
    [
      [-3, 0.03, 1],
      [1, 0.03, 0.5],
      [4.5, 0.03, 2],
      [7, 0.03, 2.7],
      [10, 0.03, 4],
    ],
    [
      [-3, 0.03, -5],
      [0, 0.03, -7],
      [5, 0.03, -8.5],
    ],
  ];
  for (const points of paths) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    for (const p of curve.getSpacedPoints(28)) {
      mesh(
        scenery,
        cylinder,
        rng() > 0.5 ? m.stoneLight : m.stone,
        [p.x + (rng() - 0.5) * 0.18, 0.045, p.z],
        [0.35 + rng() * 0.18, 0.06, 0.22 + rng() * 0.1],
        [0, rng() * 3, 0],
      );
    }
  }
  const pond = group(scenery, [ADVENTURE_POND.x, 0, ADVENTURE_POND.z]);
  mesh(pond, cylinder, m.stoneDark, [0, 0.015, 0], [2.6, 0.05, 2.5]);
  const water = mesh(
    root,
    geo(new THREE.CircleGeometry(2.36, 64)),
    m.water,
    [ADVENTURE_POND.x, 0.07, ADVENTURE_POND.z],
    [1, 1, 1],
    [-Math.PI / 2, 0, 0],
  );
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18;
    mesh(
      pond,
      rock,
      m.stone,
      [Math.cos(a) * 2.5, 0.14, Math.sin(a) * 2.5],
      [0.28 + rng() * 0.2, 0.22, 0.28],
    );
    if (i % 3 === 0)
      for (let j = 0; j < 4; j++)
        leaf(
          pond,
          greens[j % 3],
          [Math.cos(a) * 2.65, 0, Math.sin(a) * 2.65],
          0.65 + rng() * 0.55,
          [-1.1, j, 0],
        );
  }
  for (let i = 0; i < 4; i++) {
    const a = i * 2.4;
    mesh(
      pond,
      geo(new THREE.CircleGeometry(0.38, 20, 0.15, Math.PI * 1.85)),
      m.leaf,
      [Math.cos(a) * 1.3, 0.085, Math.sin(a) * 1.2],
      [1, 1, 1],
      [-Math.PI / 2, 0, a],
    );
    if (i === 1)
      flower(pond, [Math.cos(a) * 1.3, 0.085, Math.sin(a) * 1.2], 0.25, "lily");
  }
  const ripples = [0, 1, 2].map((i) =>
    mesh(
      root,
      ring,
      m.cream,
      [ADVENTURE_POND.x + 0.4, 0.084, ADVENTURE_POND.z],
      [1 + i * 0.24, 1 + i * 0.24, 0.4],
      [Math.PI / 2, 0, 0],
    ),
  );
  // Hand pump: a clear reusable resource, with a handle animated on refill.
  const pump = group(root, [WELL.x, 0, WELL.z]);
  mesh(pump, cylinder, m.stoneLight, [0, 0.08, 0], [0.65, 0.15, 0.55]);
  mesh(pump, cylinder, m.teal, [0, 0.7, 0], [0.14, 1.15, 0.14]);
  tube(
    pump,
    m.teal,
    [
      [0, 1.2, 0],
      [-0.45, 1.22, 0],
      [-0.5, 0.95, 0],
    ],
    0.1,
  );
  const pumpHandle = group(pump, [0.13, 1.32, 0]);
  tube(
    pumpHandle,
    m.brass,
    [
      [0, 0, 0],
      [0.3, 0.27, 0],
      [0.65, -0.1, 0],
    ],
    0.035,
  );
  mesh(
    pump,
    tapered,
    m.wood,
    [-0.52, 0.19, 0],
    [0.28, 0.32, 0.28],
    [0, 0, Math.PI],
  );

  // Home greenhouse with shaped roof, timber frame and separate account plant display.
  const greenhouse = group(scenery, [0, 0, 11.1]);
  mesh(greenhouse, box, m.stoneLight, [0, 0.08, 0], [4.3, 0.16, 2.25]);
  for (const x of [-2, -1, 0, 1, 2]) {
    for (const z of [-1, 1])
      mesh(greenhouse, box, m.wood, [x, 1.05, z], [0.065, 2, 0.065]);
    tube(
      greenhouse,
      m.wood,
      [
        [x, 2.05, -1],
        [x, 2.85, 0],
        [x, 2.05, 1],
      ],
      0.055,
    );
  }
  for (const y of [0.25, 1.1, 2.05])
    for (const z of [-1, 1])
      mesh(greenhouse, box, m.wood, [0, y, z], [4.15, 0.055, 0.055]);
  for (const z of [-0.5, 0.5])
    mesh(
      greenhouse,
      box,
      m.glass,
      [0, 2.46, z],
      [4, 0.025, 1.27],
      [z < 0 ? -0.67 : 0.67, 0, 0],
    );
  for (const x of [-1.45, -0.5, 0.5, 1.45])
    pot(
      greenhouse,
      [x, 0.15, 0.25],
      options.collection[Math.round(x + 1.45)] ?? "grass",
      3,
    );
  const accountPlant = group(root, [2.25, 0, 8.45]);
  pot(accountPlant, [0, 0, 0], options.plant, options.stage);
  merge(accountPlant);
  const crate = group(scenery, [HOME.x, 0.04, HOME.z - 0.6]);
  for (let i = 0; i < 5; i++)
    mesh(crate, box, m.wood, [0, 0.16 + i * 0.11, -0.28], [0.9, 0.08, 0.07]);
  for (const x of [-0.43, 0.43])
    mesh(crate, box, m.wood, [x, 0.3, 0], [0.065, 0.58, 0.6]);
  mesh(crate, box, m.wood, [0, 0.08, 0], [0.85, 0.1, 0.62]);
  for (const p of [
    [-4, 0, 7.3],
    [5.5, 0, 3.8],
    [-4.7, 0, -5.2],
    [4.3, 0, -9.5],
  ] as V3[])
    lantern(scenery, p);
  const arch = group(scenery, [TRAIL_START.x, 0, TRAIL_START.z - 0.45]);
  tube(
    arch,
    m.wood,
    [
      [-1.2, 0, 0],
      [-1.2, 2, 0],
      [0, 2.8, 0],
      [1.2, 2, 0],
      [1.2, 0, 0],
    ],
    0.085,
  );
  for (let i = 0; i < 13; i++) {
    const a = (i / 12) * Math.PI;
    leaf(
      arch,
      greens[i % 3],
      [Math.cos(a) * 1.25, 0.85 + Math.sin(a) * 1.9, 0],
      0.65,
      [-0.2, i, -0.4],
    );
  }
  LANDMARKS.forEach((p, i) => {
    const plaque = group(scenery, [p.x, 0, p.z]);
    mesh(plaque, cylinder, m.wood, [0, 0.42, 0], [0.055, 0.84, 0.055]);
    mesh(plaque, box, m.cream, [0, 0.82, 0], [0.65, 0.4, 0.075], [-0.2, 0, 0]);
    flower(
      plaque,
      [0, 0.85, 0.08],
      0.15,
      (["lily", "apple_tree", "sunflower"] as PlantType[])[i],
    );
  });
  // The collection is rendered by species, not merely by its count.
  options.collection
    .slice(0, 12)
    .forEach((type, i) =>
      pot(scenery, [-5.5 + i * 0.85, 0, 10.5 + Math.sin(i) * 0.35], type, 5),
    );

  const beds = state.beds.map((bed, index) => {
    const g = group(root, [bed.x, 0.015, bed.z]);
    const frame = group(g, [0, 0, 0]);
    mesh(frame, box, m.soil, [0, 0.12, 0], [1.65, 0.2, 1.4]);
    for (const z of [-0.74, 0.74])
      mesh(frame, box, m.wood, [0, 0.22, z], [1.95, 0.32, 0.09]);
    for (const x of [-0.94, 0.94])
      mesh(frame, box, m.wood, [x, 0.22, 0], [0.09, 0.32, 1.5]);
    for (const x of [-0.9, 0.9])
      for (const z of [-0.7, 0.7])
        mesh(frame, cylinder, m.brass, [x, 0.42, z], [0.04, 0.05, 0.04]);
    for (const x of [-0.45, 0, 0.45])
      mesh(frame, box, m.bark, [x, 0.228, 0], [0.05, 0.008, 1.1]);
    merge(frame);
    const sprouts = group(g, [0, 0.24, 0]),
      blooms = group(g, [0, 0.24, 0]);
    for (let i = 0; i < 4; i++) {
      const pos: V3 = [(i % 2 ? 1 : -1) * 0.4, 0, (i < 2 ? -1 : 1) * 0.32];
      flower(sprouts, pos, 0.3, "grass");
      flower(
        blooms,
        pos,
        0.75 + i * 0.15,
        (["sunflower", "lily", "orchid"] as PlantType[])[index],
      );
    }
    merge(sprouts);
    merge(blooms);
    const sign = group(g, [0.75, 0.1, -0.65]);
    mesh(sign, cylinder, m.wood, [0, 0.5, 0], [0.025, 1, 0.025]);
    mesh(sign, box, petals[index], [0, 1, 0], [0.2, 0.24, 0.03]);
    merge(sign);
    return { root: g, sprouts, blooms };
  });
  const forage = state.forage.map((f) => {
    const g = group(root, [f.x, 0.05, f.z]);
    if (f.kind === "apple")
      for (let i = 0; i < 3; i++)
        apple(g, [(i - 1) * 0.26, 0.02, (i % 2) * 0.2]);
    if (f.kind === "mushroom")
      for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.26;
        mesh(g, tapered, m.cream, [x, 0.18, 0], [0.075, 0.36, 0.075]);
        ball(g, m.violet, [x, 0.38 + i * 0.02, 0], [0.23, 0.14, 0.23]);
        for (let j = 0; j < 3; j++)
          ball(
            g,
            m.cream,
            [x + Math.sin(j * 2) * 0.11, 0.49, Math.cos(j * 2) * 0.1],
            [0.026, 0.015, 0.026],
          );
      }
    if (f.kind === "berry") {
      for (let i = 0; i < 8; i++) {
        const a = i * 2.4;
        leaf(g, greens[i % 3], [0, 0.1, 0], 0.65, [-0.2, a, 0]);
        ball(
          g,
          m.pink,
          [Math.cos(a) * 0.28, 0.29, Math.sin(a) * 0.28],
          [0.08, 0.09, 0.08],
        );
      }
    }
    merge(g);
    return g;
  });

  // Gardener: tailored apron, articulated arms/legs, rolled sleeves, broad brim and satchel.
  const hero = group(root, [state.player.x, 0, state.player.z]);
  const torso = group(hero, [0, 0.85, 0]);
  mesh(torso, tapered, m.cream, [0, 0, 0], [0.31, 0.62, 0.24]);
  mesh(torso, tapered, m.fabric, [0, -0.1, 0.035], [0.32, 0.49, 0.25]);
  mesh(torso, box, m.fabric, [0, 0.2, 0.21], [0.38, 0.3, 0.025]);
  mesh(torso, box, m.wood, [0, -0.06, 0.282], [0.24, 0.18, 0.025]);
  for (const x of [-0.14, 0.14]) {
    mesh(torso, box, m.fabric, [x, 0.35, 0.035], [0.055, 0.31, 0.33]);
    ball(torso, m.brass, [x, 0.28, 0.245], [0.025, 0.025, 0.012]);
  }
  ball(torso, m.wood, [0, 0.02, -0.28], [0.22, 0.25, 0.12]);
  mesh(torso, box, m.brass, [0, 0.02, -0.41], [0.08, 0.07, 0.015]);
  merge(torso);
  const head = group(hero, [0, 1.35, 0]);
  ball(head, m.cream, [0, 0, 0], [0.33, 0.3, 0.3]);
  for (const x of [-0.115, 0.115]) {
    ball(head, m.black, [x, 0.025, 0.278], [0.036, 0.046, 0.02]);
    ball(head, m.cream, [x + 0.01, 0.045, 0.297], [0.009, 0.01, 0.009]);
  }
  for (const x of [-0.205, 0.205])
    ball(head, m.pink, [x, -0.08, 0.24], [0.06, 0.027, 0.01]);
  tube(
    head,
    m.black,
    [
      [-0.035, -0.085, 0.293],
      [0, -0.107, 0.302],
      [0.035, -0.085, 0.293],
    ],
    0.01,
  );
  mesh(head, cylinder, m.wood, [0, 0.21, -0.025], [0.5, 0.075, 0.43]);
  ball(head, m.wood, [0, 0.31, -0.025], [0.32, 0.17, 0.29]);
  mesh(head, cylinder, m.fabric, [0, 0.28, -0.025], [0.32, 0.08, 0.29]);
  leaf(head, m.leafLight, [0.25, 0.32, 0], 0.38, [-0.5, 1.2, -0.6]);
  flower(head, [0.31, 0.32, 0.08], 0.16, "sunflower");
  merge(head);
  const legs = [-0.15, 0.15].map((x) => {
    const leg = group(hero, [x, 0.51, 0]);
    mesh(leg, cylinder, m.fabric, [0, -0.13, 0], [0.105, 0.3, 0.105]);
    ball(leg, m.boot, [0, -0.34, 0.045], [0.13, 0.145, 0.19]);
    mesh(leg, cylinder, m.brass, [0, -0.235, 0], [0.116, 0.04, 0.112]);
    merge(leg);
    return leg;
  });
  const arms = [-1, 1].map((side) => {
    const arm = group(hero, [side * 0.32, 1.06, 0]);
    ball(arm, m.cream, [side * 0.025, -0.13, 0], [0.1, 0.22, 0.1]);
    mesh(
      arm,
      cylinder,
      m.fabric,
      [side * 0.045, -0.24, 0],
      [0.103, 0.1, 0.103],
    );
    ball(arm, m.cream, [side * 0.045, -0.34, 0.015], [0.085, 0.11, 0.09]);
    merge(arm);
    return arm;
  });
  const can = group(arms[1], [0.03, -0.44, 0.16]);
  mesh(can, cylinder, m.teal, [0, 0, 0], [0.18, 0.3, 0.16]);
  mesh(can, ring, m.brass, [0, 0.2, 0], [0.19, 0.19, 0.17]);
  tube(
    can,
    m.teal,
    [
      [0.1, -0.03, 0],
      [0.32, 0.09, 0],
      [0.4, 0.15, 0],
    ],
    0.045,
  );
  mesh(
    can,
    cylinder,
    m.brass,
    [0.41, 0.15, 0],
    [0.075, 0.04, 0.075],
    [0, 0, -0.9],
  );
  merge(can);
  const stream = group(root, [0, 0, 0]);
  for (let i = 0; i < 9; i++)
    ball(
      stream,
      m.water,
      [Math.sin(i) * 0.06, -i * 0.09, Math.cos(i) * 0.045],
      [0.025, 0.06, 0.025],
    );
  merge(stream);
  stream.visible = false;

  // Same species and facial identity as the account's existing OS Buddy assets.
  const buddy = group(root, [state.buddy.x, 0, state.buddy.z], 0.8);
  buddy.visible = options.buddyEnabled;
  const isDoge = options.pet === "doge";
  const buddyBody = group(buddy, [0, 0.5, 0]);
  ball(
    buddyBody,
    isDoge ? m.dog : m.cream,
    [0, -0.05, 0],
    [isDoge ? 0.32 : 0.34, 0.4, 0.28],
  );
  ball(buddyBody, isDoge ? m.dog : m.cream, [0, 0.43, 0.02], [0.4, 0.35, 0.32]);
  if (isDoge) ball(buddyBody, m.cream, [0, 0.31, 0.27], [0.25, 0.2, 0.14]);
  for (const side of [-1, 1]) {
    mesh(
      buddyBody,
      cone,
      isDoge ? m.dog : m.blue,
      [side * 0.27, 0.77, 0],
      [0.18, 0.4, 0.14],
      [0, 0, -side * 0.15],
    );
    if (isDoge)
      mesh(
        buddyBody,
        cone,
        m.cream,
        [side * 0.27, 0.78, 0.08],
        [0.095, 0.25, 0.025],
        [0, 0, -side * 0.15],
      );
    if (!isDoge)
      ball(buddyBody, m.blue, [side * 0.18, 0.68, 0], [0.22, 0.1, 0.25]);
    ball(
      buddyBody,
      m.black,
      [side * 0.135, 0.47, 0.305],
      [0.047, 0.056, 0.022],
    );
    ball(
      buddyBody,
      m.cream,
      [side * 0.135 + 0.012, 0.49, 0.324],
      [0.014, 0.015, 0.009],
    );
    if (!isDoge)
      ball(
        buddyBody,
        m.pink,
        [side * 0.265, 0.345, 0.26],
        [0.075, 0.041, 0.015],
      );
    ball(
      buddyBody,
      isDoge ? m.dog : m.cream,
      [side * 0.33, -0.08, 0.025],
      [0.095, 0.2, 0.1],
    );
  }
  ball(
    buddyBody,
    m.black,
    [0, 0.34, isDoge ? 0.405 : 0.325],
    [0.045, 0.028, 0.025],
  );
  tube(
    buddyBody,
    m.black,
    [
      [-0.06, 0.27, 0.33],
      [0, 0.245, 0.35],
      [0.06, 0.27, 0.33],
    ],
    0.012,
  );
  mesh(buddyBody, box, m.fabric, [0, 0.095, 0.25], [0.32, 0.14, 0.025]);
  ball(buddyBody, m.brass, [0, 0.055, 0.285], [0.04, 0.05, 0.016]);
  const tail = tube(
    buddyBody,
    isDoge ? m.dog : m.blue,
    [
      [0, -0.2, -0.2],
      [0.37, -0.1, -0.4],
      [0.44, 0.1, -0.3],
      [0.3, 0.18, -0.24],
    ],
    0.1,
  );
  merge(buddyBody);
  const buddyFeet = [-0.16, 0.16].map((x) =>
    ball(buddy, isDoge ? m.dog : m.cream, [x, 0.1, 0.035], [0.09, 0.12, 0.14]),
  );
  void tail;

  const butterfly = group(root, [TRAIL_START.x, 1.25, TRAIL_START.z]);
  ball(butterfly, m.bark, [0, 0, 0], [0.04, 0.12, 0.05]);
  const wings = [-1, 1].map((side) => {
    const wing = group(butterfly, [side * 0.035, 0, 0]);
    leaf(wing, m.violet, [0, 0, 0], 0.75, [0, side * 0.95, 0]);
    leaf(wing, m.pink, [0, -0.06, 0], 0.5, [0, side * 2.1, 0]);
    merge(wing);
    return wing;
  });
  const targetRing = mesh(
    root,
    geo(new THREE.RingGeometry(0.26, 0.34, 32)),
    m.glow,
    [0, 0.095, 0],
    [1, 1, 1],
    [-Math.PI / 2, 0, 0],
  );
  targetRing.visible = false;
  const interactRing = mesh(
    root,
    geo(new THREE.RingGeometry(0.73, 0.79, 40)),
    m.cream,
    [0, 0.085, 0],
    [1, 1, 1],
    [-Math.PI / 2, 0, 0],
  );
  const trailMarkers = state.trail.stops.map((p) =>
    mesh(
      root,
      ring,
      m.glow,
      [p.x, 0.15, p.z],
      [0.5, 0.5, 0.5],
      [-Math.PI / 2, 0, 0],
    ),
  );
  const burstMaterial = mat("#f5df91", {
    emissive: "#d4c166",
    emissiveIntensity: 0.35,
  });
  const burst = new THREE.InstancedMesh(
    geo(new THREE.IcosahedronGeometry(0.065, 0)),
    burstMaterial,
    32,
  );
  burst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(burst);
  burst.visible = false;

  // Instanced ground cover, excluded around interactive targets, paths and pond.
  const blade = (() => {
    const positions: number[] = [],
      indices: number[] = [];
    for (let arm = 0; arm < 3; arm++) {
      const angle = (arm * Math.PI * 2) / 3;
      for (let segment = 0; segment < 4; segment++) {
        const t = segment / 3,
          width = Math.sin((t * 0.95 + 0.05) * Math.PI) * 0.044;
        for (const side of [-1, 1]) {
          const x = side * width,
            z = t * t * 0.13;
          positions.push(
            x * Math.cos(angle) + z * Math.sin(angle),
            t * (0.19 + arm * 0.035),
            -x * Math.sin(angle) + z * Math.cos(angle),
          );
        }
        if (segment < 3) {
          const p = arm * 8 + segment * 2;
          indices.push(p, p + 2, p + 1, p + 1, p + 2, p + 3);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return geo(g);
  })();
  const grassMaterial = mat("#81a465", { side: THREE.DoubleSide });
  const grass = new THREE.InstancedMesh(blade, grassMaterial, 1500),
    transform = new THREE.Object3D();
  let grassCount = 0;
  for (let i = 0; i < 2800 && grassCount < 1500; i++) {
    const x = (rng() - 0.5) * 31,
      z = (rng() - 0.5) * 26;
    if (
      Math.hypot(x / 15.3, z / 12.7) > 1 ||
      Math.hypot(x - ADVENTURE_POND.x, z - ADVENTURE_POND.z) < 2.8
    )
      continue;
    if (
      [...BED_SPOTS, HOME, WELL, TRAIL_START, ...state.forage].some(
        (p) => Math.hypot(x - p.x, z - p.z) < 1.35,
      )
    )
      continue;
    if (Math.abs(x) < 2 && z > -7 && z < 9) continue;
    transform.position.set(x, 0, z);
    transform.rotation.set((rng() - 0.5) * 0.3, rng() * Math.PI * 2, 0.25);
    transform.scale.set(1, 0.65 + rng() * 1.2, 1);
    transform.updateMatrix();
    grass.setMatrixAt(grassCount, transform.matrix);
    grass.setColorAt(
      grassCount++,
      new THREE.Color().setHSL(
        0.22 + rng() * 0.06,
        0.2 + rng() * 0.2,
        0.36 + rng() * 0.17,
      ),
    );
  }
  grass.count = grassCount;
  grass.instanceMatrix.needsUpdate = true;
  grass.receiveShadow = true;
  root.add(grass);
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2,
      x = Math.cos(a) * (12 + rng() * 3),
      z = Math.sin(a) * (10 + rng() * 2);
    flower(
      scenery,
      [x, 0.01, z],
      0.23 + rng() * 0.45,
      (["sunflower", "lily", "orchid", "grass"] as PlantType[])[i % 4],
    );
  }
  const decoration = group(root, [5, 0, 7]);
  if (options.decoration === "lantern") lantern(decoration, [0, 0, 0]);
  if (options.decoration === "bench") {
    for (const x of [-0.6, 0.6])
      for (const z of [-0.2, 0.2])
        mesh(decoration, box, m.bark, [x, 0.25, z], [0.08, 0.5, 0.08]);
    for (const z of [-0.22, 0, 0.22])
      mesh(decoration, box, m.wood, [0, 0.55, z], [1.5, 0.09, 0.17]);
    for (const y of [0.75, 1])
      mesh(decoration, box, m.wood, [0, y, -0.3], [1.5, 0.13, 0.06]);
  }
  if (options.decoration === "flower-cart") {
    mesh(decoration, box, m.wood, [0, 0.55, 0], [1.3, 0.45, 0.7]);
    for (const x of [-0.7, 0.7])
      mesh(
        decoration,
        cylinder,
        m.bark,
        [x, 0.3, 0],
        [0.28, 0.08, 0.28],
        [0, 0, Math.PI / 2],
      );
    for (let i = 0; i < 3; i++)
      flower(
        decoration,
        [(i - 1) * 0.35, 0.8, 0],
        0.7,
        (["sunflower", "lily", "orchid"] as PlantType[])[i],
      );
  }
  if (options.journal)
    for (let i = 0; i < 3; i++)
      flower(
        scenery,
        [ADVENTURE_POND.x - 0.9 + i * 0.7, 0.08, ADVENTURE_POND.z + 0.7],
        0.22,
        "lily",
      );
  if (options.habit)
    for (let i = 0; i < 5; i++)
      flower(
        scenery,
        [TRAIL_START.x - 1.4, 0.04, TRAIL_START.z + i * 0.38],
        0.5,
        "orchid",
      );
  merge(decoration);
  merge(scenery);
  root.name = "My Garden adventure";
  return {
    root,
    hero,
    torso,
    head,
    arms,
    legs,
    can,
    stream,
    buddy,
    buddyBody,
    buddyFeet,
    beds,
    forage,
    butterfly,
    wings,
    pumpHandle,
    water,
    ripples,
    targetRing,
    interactRing,
    trailMarkers,
    burst,
    transform,
    dispose() {
      geometrySet.forEach((g) => g.dispose());
      materialSet.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
