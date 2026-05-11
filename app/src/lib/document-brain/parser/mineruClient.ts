const TAG = "[doc-oracle/mineru-client]";

function readDispatchTimeoutMs(): number {
  const raw = process.env.MINERU_DISPATCH_TIMEOUT_MS?.trim();
  if (!raw) return 120_000;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 120_000;
}

/** Ensures `fetch` receives an absolute URL (env often omits `https://`). */
export function normalizeMineruApiBase(raw: string): string {
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

/** JSON body shape from the MinerU worker (legacy versions may return ok:false with HTTP 200). */
type MineruWorkerResponseJson = {
  ok?: boolean;
  warning?: string;
  callback_status?: number;
  body?: string;
  error?: string;
  hint?: string;
};

function tryParseMineruWorkerJson(raw: string): MineruWorkerResponseJson | null {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    return v as MineruWorkerResponseJson;
  } catch {
    return null;
  }
}

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
  const envUrl = process.env.MINERU_API_URL ?? "";
  const base = normalizeMineruApiBase(envUrl);
  const secret = process.env.MINERU_WORKER_SECRET?.trim();
  const hasUrl = Boolean(envUrl.trim());
  const hasSecret = Boolean(secret);
  console.info(
    `${TAG} dispatch env MINERU_API_URL_configured=${hasUrl} normalized_worker_base=${base || "(empty)"} MINERU_WORKER_SECRET_configured=${hasSecret}`,
  );
  if (!base || !secret) {
    console.warn(`${TAG} dispatch aborted: mineru_not_configured`);
    return { ok: false, error: "mineru_not_configured" };
  }
  const url = `${base}/v1/extract`;
  const signedPresent = Boolean(payload.signedInputUrl?.trim());
  console.info(
    `${TAG} POST /v1/extract job_id=${payload.jobId} document_id=${payload.documentId} signed_input_url_present=${signedPresent}`,
  );
  let res: Response;
  const timeoutMs = readDispatchTimeoutMs();
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
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${TAG} fetch failed job_id=${payload.jobId}`, e);
    return {
      ok: false,
      error: `mineru_fetch_failed: ${msg.slice(0, 400)}`,
    };
  }

  const rawText = await res.text().catch(() => "");
  const parsed = tryParseMineruWorkerJson(rawText);

  console.info(`${TAG} /v1/extract response status=${res.status} job_id=${payload.jobId}`);

  if (!res.ok) {
    console.warn(
      `${TAG} /v1/extract not ok job_id=${payload.jobId} body_tail=${rawText.slice(0, 400)}`,
    );
    return { ok: false, status: res.status, error: rawText.slice(0, 500) };
  }

  // Older worker versions returned HTTP 200 with ok:false or callback_skipped warning while the job never completed.
  if (parsed) {
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

  console.info(`${TAG} dispatch success job_id=${payload.jobId} http_status=${res.status}`);
  return { ok: true, status: res.status };
}
