/** Max wait for Railway worker + callback to Vercel (cold starts). */
const MINERU_DISPATCH_TIMEOUT_MS = 120_000;

/** Ensures `fetch` receives an absolute URL (env often omits `https://`). */
function normalizeMineruApiBase(raw: string): string {
  let b = raw.trim().replace(/\/+$/, "");
  if (!b) return "";
  if (!/^https?:\/\//i.test(b)) {
    b = `https://${b}`;
  }
  return b.replace(/\/+$/, "");
}

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
  const base = normalizeMineruApiBase(process.env.MINERU_API_URL ?? "");
  const secret = process.env.MINERU_WORKER_SECRET?.trim();
  if (!base || !secret) {
    return { ok: false, error: "mineru_not_configured" };
  }
  const url = `${base}/v1/extract`;
  let res: Response;
  try {
    res = await fetch(url, {
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
      signal: AbortSignal.timeout(MINERU_DISPATCH_TIMEOUT_MS),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `mineru_fetch_failed: ${msg.slice(0, 400)}`,
    };
  }

  const rawText = await res.text().catch(() => "");

  let parsed: {
    ok?: boolean;
    warning?: string;
    callback_status?: number;
    body?: string;
    error?: string;
    hint?: string;
  } | null = null;
  try {
    parsed = JSON.parse(rawText) as typeof parsed;
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: rawText.slice(0, 500) };
  }

  // Older worker versions returned HTTP 200 with ok:false or callback_skipped warning while the job never completed.
  if (parsed && typeof parsed === "object") {
    if (parsed.ok === false) {
      const detail =
        typeof parsed.body === "string" && parsed.body.trim()
          ? parsed.body
          : typeof parsed.error === "string"
            ? parsed.error
            : typeof parsed.hint === "string"
              ? parsed.hint
              : `worker_callback_failed status=${String(parsed.callback_status ?? "")}`;
      return { ok: false, status: res.status, error: detail.slice(0, 500) };
    }
    if (
      typeof parsed.warning === "string" &&
      parsed.warning.toLowerCase().includes("callback_skipped")
    ) {
      return {
        ok: false,
        status: res.status,
        error: `${parsed.warning}. Set WORKER_CALLBACK_APP_URL on the Railway worker (live Next.js URL).`,
      };
    }
  }

  return { ok: true, status: res.status };
}
