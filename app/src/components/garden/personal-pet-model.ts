import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { validateGardenPetGlb, PET_MODEL_LIMIT } from "@/lib/garden/pets";
export function attachPersonalPet(
  parent: THREE.Group,
  url: string,
  onState: (state: "loading" | "ready" | "error") => void,
) {
  const abort = new AbortController();
  let disposed = false,
    model: THREE.Group | null = null,
    mixer: THREE.AnimationMixer | null = null,
    walk: THREE.AnimationAction | null = null,
    idle: THREE.AnimationAction | null = null;
  const release = (root: THREE.Object3D) =>
    root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        for (const material of Array.isArray(o.material)
          ? o.material
          : [o.material]) {
          for (const v of Object.values(material))
            if (v instanceof THREE.Texture) {
              v.dispose();
              const image = v.source?.data;
              if (typeof image?.close === "function") image.close();
            }
          material.dispose();
        }
      }
    });
  onState("loading");
  void (async () => {
    const response = await fetch(url, { signal: abort.signal });
    if (!response.ok || !response.body) throw new Error("Pet download failed");
    const chunks: Uint8Array[] = [];
    let length = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > PET_MODEL_LIMIT) throw new Error("Pet too large");
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    validateGardenPetGlb(bytes);
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer, "");
    if (disposed) {
      release(gltf.scene);
      return;
    }
    const bounds = new THREE.Box3().setFromObject(gltf.scene),
      size = bounds.getSize(new THREE.Vector3());
    if (
      !Number.isFinite(size.y) ||
      size.y < 0.01 ||
      Math.max(size.x, size.z) / size.y > 8
    ) {
      release(gltf.scene);
      throw new Error("Pet shape unsupported");
    }
    model = gltf.scene;
    const scale = 1 / Math.max(size.y, size.x, size.z);
    model.scale.setScalar(scale);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(
      -center.x * scale,
      -bounds.min.y * scale,
      -center.z * scale,
    );
    model.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    parent.add(model);
    mixer = new THREE.AnimationMixer(model);
    const walking = gltf.animations.find((a) => /walk|run|trot/i.test(a.name)),
      resting = gltf.animations.find((a) => /idle|rest|breath/i.test(a.name));
    if (walking) walk = mixer.clipAction(walking).play();
    if (resting) idle = mixer.clipAction(resting).play();
    onState("ready");
  })().catch(() => {
    if (!disposed) onState("error");
  });
  return {
    update(dt: number, moving: boolean) {
      walk?.setEffectiveWeight(moving ? 1 : 0);
      idle?.setEffectiveWeight(moving ? 0 : 1);
      mixer?.update(Math.min(dt, 0.05));
    },
    dispose() {
      disposed = true;
      abort.abort();
      mixer?.stopAllAction();
      if (model) {
        mixer?.uncacheRoot(model);
        parent.remove(model);
        release(model);
      }
    },
  };
}
