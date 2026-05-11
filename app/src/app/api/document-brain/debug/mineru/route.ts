import { NextResponse } from "next/server";
import {
  isMinerUHttpConfigured,
  normalizeMineruApiBase,
} from "@/lib/document-brain/parser/mineruClient";

export const runtime = "nodejs";

/**
 * Diagnostics for MinerU worker wiring (no secrets exposed).
 */
export async function GET() {
  const rawUrl = process.env.MINERU_API_URL ?? "";
  const normalizedBase = normalizeMineruApiBase(rawUrl);
  const mineruApiUrlConfigured = Boolean(rawUrl.trim());
  const mineruWorkerSecretConfigured = Boolean(process.env.MINERU_WORKER_SECRET?.trim());

  let workerHealth: { ok: boolean; status: number | null; error: string | null } = {
    ok: false,
    status: null,
    error: null,
  };

  if (normalizedBase) {
    const healthUrl = `${normalizedBase}/health`;
    try {
      const r = await fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      workerHealth = {
        ok: r.ok,
        status: r.status,
        error: r.ok ? null : (await r.text().catch(() => "")).slice(0, 500) || `HTTP ${r.status}`,
      };
    } catch (e) {
      workerHealth = {
        ok: false,
        status: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  } else {
    workerHealth = {
      ok: false,
      status: null,
      error: "MINERU_API_URL is not set or normalizes to empty",
    };
  }

  return NextResponse.json({
    mineru_api_url_configured: mineruApiUrlConfigured,
    normalized_worker_base: normalizedBase || null,
    mineru_worker_secret_configured: mineruWorkerSecretConfigured,
    mineru_http_dispatch_ready: isMinerUHttpConfigured(),
    worker_health: workerHealth,
  });
}
