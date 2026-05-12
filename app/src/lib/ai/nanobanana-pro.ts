/**
 * NanoBanana Pro (server-side). Env:
 * - NANOBANANA_PRO_API_KEY
 * - NANOBANANA_PRO_API_URL (e.g. https://api.nanobananaapi.ai or full …/generate-pro URL)
 * - NANOBANANA_PRO_MODEL (optional; endpoint /generate-pro selects the pro model)
 * - NANOBANANA_PRO_CALLBACK_URL (optional HTTPS URL; some accounts require callBackUrl on task create)
 */

export type NanobananaProGenerateResult = {
  imageUrl: string;
  promptUsed: string;
};

function resolveGenerateUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) throw new Error("empty_api_url");
  if (trimmed.includes("/generate-pro")) return trimmed;
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const path = u.pathname.replace(/\/$/, "");
    if (path.endsWith("/nanobanana")) return `${u.origin}${path}/generate-pro`;
    if (path === "" || path === "/") return `${u.origin}/api/v1/nanobanana/generate-pro`;
    return `${u.origin}/api/v1/nanobanana/generate-pro`;
  } catch {
    return `${trimmed}/api/v1/nanobanana/generate-pro`;
  }
}

function resolveRecordInfoUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  return `${u.origin}/api/v1/nanobanana/record-info`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type RecordPayload = {
  successFlag?: number;
  response?: { resultImageUrl?: string; originImageUrl?: string };
};

function extractRecordPayload(json: unknown): RecordPayload | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const inner = d.response;
    const resp =
      inner && typeof inner === "object"
        ? (inner as { resultImageUrl?: string; originImageUrl?: string })
        : undefined;
    return {
      successFlag: typeof d.successFlag === "number" ? d.successFlag : undefined,
      response: resp,
    };
  }
  const resp = o.response;
  const response =
    resp && typeof resp === "object" ? (resp as { resultImageUrl?: string; originImageUrl?: string }) : undefined;
  return {
    successFlag: typeof o.successFlag === "number" ? o.successFlag : undefined,
    response,
  };
}

export function getNanobananaProEnv(): { apiKey: string; apiUrl: string; callbackUrl: string | null } | null {
  const apiKey = process.env.NANOBANANA_PRO_API_KEY?.trim();
  const apiUrl = process.env.NANOBANANA_PRO_API_URL?.trim();
  if (!apiKey || !apiUrl) return null;
  const callbackUrl = process.env.NANOBANANA_PRO_CALLBACK_URL?.trim() || null;
  return { apiKey, apiUrl, callbackUrl };
}

/**
 * Submits a NanoBanana Pro generation task and polls record-info until success or timeout.
 */
export async function generateNanobananaProImage(opts: {
  prompt: string;
  /** Extra body fields some deployments accept */
  aspectRatio?: string;
  resolution?: "1K" | "2K" | "4K";
}): Promise<NanobananaProGenerateResult> {
  const env = getNanobananaProEnv();
  if (!env) throw new Error("image_generation_not_configured");

  const generateUrl = resolveGenerateUrl(env.apiUrl);
  const recordBase = resolveRecordInfoUrl(env.apiUrl);
  const promptUsed = opts.prompt;

  const body: Record<string, unknown> = {
    prompt: promptUsed,
    aspectRatio: opts.aspectRatio ?? "16:9",
    resolution: opts.resolution ?? "1K",
  };
  if (env.callbackUrl) body.callBackUrl = env.callbackUrl;

  const model = process.env.NANOBANANA_PRO_MODEL?.trim();
  if (model) body.model = model;

  const genRes = await fetch(generateUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const genJson = (await genRes.json().catch(() => null)) as Record<string, unknown> | null;
  if (!genRes.ok || !genJson || genJson.code !== 200) {
    const msg =
      (genJson && typeof genJson.msg === "string" && genJson.msg) ||
      (genJson && typeof genJson.message === "string" && genJson.message) ||
      `nanobanana_submit_${genRes.status}`;
    throw new Error(msg.slice(0, 400));
  }
  const data = genJson.data as Record<string, unknown> | undefined;
  const taskId = data && typeof data.taskId === "string" ? data.taskId : null;
  if (!taskId) throw new Error("nanobanana_missing_task_id");

  const deadline = Date.now() + 110_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    const q = new URL(recordBase);
    q.searchParams.set("taskId", taskId);
    const st = await fetch(q.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${env.apiKey}` },
    });
    const stJson = (await st.json().catch(() => null)) as unknown;
    const payload = extractRecordPayload(stJson);
    const flag = payload?.successFlag;
    if (flag === 1) {
      const url =
        payload?.response?.resultImageUrl ||
        payload?.response?.originImageUrl ||
        (typeof stJson === "object" &&
          stJson &&
          "resultImageUrl" in stJson &&
          typeof (stJson as { resultImageUrl: unknown }).resultImageUrl === "string" &&
          (stJson as { resultImageUrl: string }).resultImageUrl) ||
        null;
      if (url && /^https?:\/\//i.test(url)) {
        return { imageUrl: url, promptUsed };
      }
      throw new Error("nanobanana_missing_image_url");
    }
    if (flag === 2 || flag === 3) {
      const err =
        (payload as { errorMessage?: string } | null)?.errorMessage ||
        (typeof stJson === "object" && stJson && "errorMessage" in stJson
          ? String((stJson as { errorMessage?: unknown }).errorMessage)
          : "") ||
        "nanobanana_generation_failed";
      throw new Error(err.slice(0, 400));
    }
  }
  throw new Error("nanobanana_generation_timeout");
}
