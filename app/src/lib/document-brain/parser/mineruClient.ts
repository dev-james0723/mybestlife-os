export type MinerUDispatchPayload = {
  jobId: string;
  userId: string;
  documentId: string;
  signedInputUrl: string;
  inputStoragePath: string;
  outputBasePath: string;
  parserMode?: string | null;
};

export function isMinerUHttpConfigured(): boolean {
  return Boolean(
    process.env.MINERU_API_URL?.trim() &&
      process.env.MINERU_WORKER_SECRET?.trim() &&
      process.env.MINERU_MODE !== "off",
  );
}

/**
 * Fire-and-forget HTTP dispatch to the MinerU worker (never await in request critical path without after()).
 */
export async function dispatchMinerUExtractionHttp(
  payload: MinerUDispatchPayload,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const base = process.env.MINERU_API_URL?.trim();
  const secret = process.env.MINERU_WORKER_SECRET?.trim();
  if (!base || !secret) {
    return { ok: false, error: "mineru_not_configured" };
  }
  const url = `${base.replace(/\/$/, "")}/v1/extract`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      job_id: payload.jobId,
      user_id: payload.userId,
      document_id: payload.documentId,
      signed_input_url: payload.signedInputUrl,
      input_storage_path: payload.inputStoragePath,
      output_base_path: payload.outputBasePath,
      parser_mode: payload.parserMode ?? null,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: t.slice(0, 500) };
  }
  return { ok: true, status: res.status };
}
