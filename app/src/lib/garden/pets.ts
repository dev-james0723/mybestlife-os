export const GARDEN_PET_BUCKET = "garden-pets";
export const PET_IMAGE_LIMIT = 8 * 1024 * 1024;
export const PET_MODEL_LIMIT = 20 * 1024 * 1024;
export const PET_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type GardenPetStatus =
  | "uploading"
  | "submitting"
  | "generating"
  | "processing"
  | "ready"
  | "failed"
  | "needs_review";
export type GardenPet = {
  id: string;
  name: string;
  status: GardenPetStatus;
  progress: number;
  photoUrl: string | null;
  modelUrl: string | null;
  message: string | null;
  createdAt: string;
};
export type GardenPetLibrary = {
  pets: GardenPet[];
  generationAvailable: boolean;
  available: boolean;
};

/** Require a self-contained, bounded GLB: no network requests from asset contents. */
export function validateGardenPetGlb(bytes: Uint8Array) {
  if (bytes.byteLength < 20 || bytes.byteLength > PET_MODEL_LIMIT)
    throw new Error("Pet models must be between 20 bytes and 20 MB.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength ||
    view.getUint32(16, true) !== 0x4e4f534a
  )
    throw new Error("Use a valid GLB 2.0 model.");
  const length = view.getUint32(12, true);
  if (length > bytes.byteLength - 20 || length > 2 * 1024 * 1024)
    throw new Error("Invalid GLB metadata.");
  const doc = JSON.parse(
    new TextDecoder().decode(bytes.subarray(20, 20 + length)),
  );
  if (
    doc.asset?.version !== "2.0" ||
    !Array.isArray(doc.meshes) ||
    !doc.meshes.length
  )
    throw new Error("This model has no renderable mesh.");
  if (
    (doc.buffers ?? []).some((b: { uri?: string }) => b.uri) ||
    (doc.images ?? []).some((i: { uri?: string }) => i.uri)
  )
    throw new Error("Embed all textures and geometry inside the GLB.");
  if ((doc.extensionsRequired ?? []).length)
    throw new Error("Export an uncompressed GLB without required extensions.");
  if (
    (doc.meshes?.length ?? 0) > 150 ||
    (doc.materials?.length ?? 0) > 24 ||
    (doc.images?.length ?? 0) > 12 ||
    (doc.animations?.length ?? 0) > 16
  )
    throw new Error("This pet exceeds the material or animation budget.");
  let vertices = 0;
  for (const mesh of doc.meshes)
    for (const primitive of mesh.primitives ?? []) {
      const accessor = doc.accessors?.[primitive.attributes?.POSITION];
      if (!accessor || !Number.isFinite(accessor.count))
        throw new Error("Invalid model geometry.");
      vertices += accessor.count;
    }
  if (vertices > 150_000 || (doc.nodes?.length ?? 0) > 400)
    throw new Error(
      "Use a smaller model: at most 150,000 vertices and 400 nodes.",
    );
  return { vertices, animations: doc.animations?.length ?? 0 };
}
