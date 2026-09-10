import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import {
  GARDEN_PET_BUCKET,
  PET_IMAGE_LIMIT,
  PET_MODEL_LIMIT,
  PET_UUID,
} from "@/lib/garden/pets";
import {
  downloadPetModel,
  gardenPetGenerationAvailable,
  readPetModel,
  startPetModel,
  uploadPetReference,
} from "@/lib/garden/pet-provider";
import sharp from "sharp";
import { validatePetModelAsset } from "@/lib/garden/pet-model-validation";
export const runtime = "nodejs";
export const maxDuration = 120;
async function actor() {
  const client = await createServerSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return { client, user };
}
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  const { client, user } = await actor();
  if (!user) return json({ message: "Sign in to view your pets." }, 401);
  if (request.headers.get("x-garden-account") !== user.id)
    return json({ message: "Your account changed. Please refresh." }, 409);
  const { data, error } = await client
    .from("garden_personal_pets")
    .select("id,name,status,progress,photo_path,model_path,message,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error)
    return json({
      pets: [],
      available: false,
      generationAvailable: false,
      message: "Your personal pet library is not connected yet.",
    });
  const sign = async (path: string | null) => {
    if (!path) return null;
    const { data } = await client.storage
      .from(GARDEN_PET_BUCKET)
      .createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };
  const pets = await Promise.all(
    (data ?? []).map(async (p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      message: p.message,
      createdAt: p.created_at,
      photoUrl: await sign(p.photo_path),
      modelUrl: p.status === "ready" ? await sign(p.model_path) : null,
    })),
  );
  return json({
    pets,
    available: true,
    generationAvailable: gardenPetGenerationAvailable(),
  });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ message: "Request origin did not match." }, 403);
  const { user } = await actor();
  if (!user) return json({ message: "Sign in to create a pet." }, 401);
  if (request.headers.get("x-garden-account") !== user.id)
    return json({ message: "Your account changed. Please refresh." }, 409);
  let admin: ReturnType<typeof createServiceRoleSupabaseClient>;
  try {
    admin = createServiceRoleSupabaseClient();
  } catch {
    return json(
      { message: "Your personal pet library is not connected yet." },
      503,
    );
  }
  const save = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await admin
      .from("garden_personal_pets")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id)
      .neq("status", "ready");
    if (error) throw new Error("Could not save pet progress.");
  };
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const { id } = await request.json();
      if (typeof id !== "string" || !PET_UUID.test(id))
        return json({ message: "Invalid pet." }, 400);
      const { data: pet } = await admin
        .from("garden_personal_pets")
        .select("id,status,task_id")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!pet) return json({ message: "Pet not found." }, 404);
      if (!pet.task_id || !["generating", "processing"].includes(pet.status))
        return json({ id });
      const task = await readPetModel(pet.task_id);
      if (
        ["failed", "cancelled", "banned", "expired", "unknown"].includes(
          task.status,
        )
      ) {
        await save(id, {
          status: "failed",
          message:
            "The model service could not finish this pet. Your photo is saved.",
        });
        return json({ id });
      }
      if (task.status !== "success") {
        await save(id, { progress: task.progress });
        return json({ id });
      }
      if (typeof task.url !== "string")
        throw new Error("The finished task has no model yet.");
      await save(id, { status: "processing", progress: 99 });
      const bytes = await downloadPetModel(task.url);
      try {
        await validatePetModelAsset(bytes);
      } catch {
        await save(id, {
          status: "failed",
          message:
            "The generated model exceeds this garden’s limits or needs a self-contained GLB export. Your photo is saved.",
        });
        return json({ id }, 202);
      }
      const path = `${user.id}/${id}/model.glb`;
      const { error } = await admin.storage
        .from(GARDEN_PET_BUCKET)
        .upload(path, bytes, {
          contentType: "model/gltf-binary",
          upsert: true,
        });
      if (error) throw new Error("Could not save the finished model.");
      await save(id, {
        status: "ready",
        progress: 100,
        model_path: path,
        message: null,
      });
      return json({ id });
    }
    if (
      Number(request.headers.get("content-length")) >
      PET_MODEL_LIMIT + PET_IMAGE_LIMIT + 65536
    )
      return json({ message: "The upload is too large." }, 413);
    const form = await request.formData(),
      id = String(form.get("id") ?? ""),
      name = String(form.get("name") ?? "").trim(),
      photo = form.get("photo"),
      model = form.get("model");
    if (
      !PET_UUID.test(id) ||
      !name ||
      name.length > 40 ||
      !(photo instanceof File)
    )
      return json({ message: "Add a name and a photo." }, 400);
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(photo.type) ||
      photo.size > PET_IMAGE_LIMIT
    )
      return json({ message: "Use a JPG, PNG or WebP photo up to 8 MB." }, 400);
    const importing = model instanceof File && model.size > 0;
    if (
      !importing &&
      (!gardenPetGenerationAvailable() || form.get("consent") !== "yes")
    )
      return json(
        {
          message:
            "Photo-to-3D is not enabled, or consent was not provided. You can attach an existing GLB.",
        },
        409,
      );
    const image = await sharp(Buffer.from(await photo.arrayBuffer()), {
      limitInputPixels: 16_000_000,
    })
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 88 })
      .toBuffer();
    let bytes: Uint8Array | null = null;
    if (importing) {
      bytes = new Uint8Array(await model.arrayBuffer());
      await validatePetModelAsset(bytes);
    }
    const { data: reserved, error } = await admin.rpc("reserve_garden_pet", {
      p_actor: user.id,
      p_id: id,
      p_name: name,
    });
    if (error)
      return json(
        {
          message:
            "Could not reserve a pet. The library allows 12 pets and 3 new pets per day.",
        },
        409,
      );
    if (!reserved) return json({ id }); // Safe repeat after a lost HTTP response.
    let submitting = false;
    try {
      const photoPath = `${user.id}/${id}/reference.jpg`;
      const { error: uploadError } = await admin.storage
        .from(GARDEN_PET_BUCKET)
        .upload(photoPath, image, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw new Error("Could not save your reference photo.");
      await save(id, { photo_path: photoPath });
      if (bytes) {
        const path = `${user.id}/${id}/model.glb`;
        const { error } = await admin.storage
          .from(GARDEN_PET_BUCKET)
          .upload(path, bytes, {
            contentType: "model/gltf-binary",
            upsert: false,
          });
        if (error) throw new Error("Could not save your model.");
        await save(id, { status: "ready", model_path: path, progress: 100 });
      } else {
        const token = await uploadPetReference(image);
        await save(id, { status: "submitting" });
        submitting = true;
        const taskId = await startPetModel(token);
        await save(id, { status: "generating", task_id: taskId });
      }
      return json({ id }, 201);
    } catch {
      await save(id, {
        status: submitting ? "needs_review" : "failed",
        message: submitting
          ? "Submission could not be confirmed. Ask the site administrator to check the provider task before trying again."
          : "This pet could not finish uploading. Please try again with a new request.",
      });
      return json({ id }, 202);
    }
  } catch {
    return json(
      {
        message:
          "Pet processing could not finish. Your current companion is safe; refresh to try checking again.",
      },
      502,
    );
  }
}
