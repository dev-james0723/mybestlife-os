import "server-only";
import { PET_MODEL_LIMIT } from "./pets";
const API = "https://api.tripo3d.ai/v2/openapi";
function headers() {
  return { Authorization: `Bearer ${process.env.TRIPO_API_KEY ?? ""}` };
}
export function gardenPetGenerationAvailable() {
  return (
    !!process.env.TRIPO_API_KEY?.trim() &&
    process.env.GARDEN_PET_GENERATION_ENABLED === "true"
  );
}
async function reply(response: Response) {
  if (!response.ok)
    throw new Error("The model service could not complete this request.");
  const result = await response.json();
  if (result.code !== 0 || !result.data)
    throw new Error("The model service returned an unsuccessful result.");
  return result.data;
}
export async function uploadPetReference(photo: Uint8Array) {
  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(photo)], { type: "image/jpeg" }),
    "pet.jpg",
  );
  const data = await reply(
    await fetch(`${API}/upload/sts`, {
      method: "POST",
      headers: headers(),
      body: form,
      signal: AbortSignal.timeout(25_000),
    }),
  );
  if (typeof data.image_token !== "string")
    throw new Error("The reference upload could not be confirmed.");
  return data.image_token as string;
}
export async function startPetModel(fileToken: string) {
  const data = await reply(
    await fetch(`${API}/task`, {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "image_to_model",
        model_version: "P1-20260311",
        file: { type: "jpg", file_token: fileToken },
        face_limit: 5000,
        texture: true,
        pbr: true,
      }),
      signal: AbortSignal.timeout(25_000),
    }),
  );
  if (typeof data.task_id !== "string" || !/^[\w-]{1,100}$/.test(data.task_id))
    throw new Error("Model submission could not be confirmed.");
  return data.task_id as string;
}
export async function readPetModel(taskId: string) {
  if (!/^[\w-]{1,100}$/.test(taskId)) throw new Error("Invalid model task.");
  const data = await reply(
    await fetch(`${API}/task/${taskId}`, {
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }),
  );
  return {
    status: String(data.status),
    progress: Math.max(0, Math.min(99, Number(data.progress) || 0)),
    url: data.output?.pbr_model ?? data.output?.model,
  };
}
export async function downloadPetModel(raw: string) {
  const url = new URL(raw);
  const configured = (process.env.TRIPO_ASSET_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const trusted =
    ["tripo3d.ai", "tripo3d.com"].some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`),
    ) || configured.includes(url.hostname);
  if (url.protocol !== "https:" || url.username || url.password || !trusted)
    throw new Error(
      "This model download host needs to be approved by the site administrator.",
    );
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) > PET_MODEL_LIMIT ||
    !response.body
  )
    throw new Error("Model download is unavailable or too large.");
  const reader = response.body.getReader(),
    parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > PET_MODEL_LIMIT)
        throw new Error("Model exceeds the 20 MB limit.");
      parts.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}
